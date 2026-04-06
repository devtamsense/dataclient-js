import type { Sender } from '../sender'
import type { AttrChange, Config, MutationAdd, MutationEvent, TextChange, Tracker } from '../types'
import { assignId, getNodeId, removeNodeId, serializeNode } from '../serializer'

const WATCH_ATTRS = [
    'class', 'role', 'href', 'disabled', 'hidden', 'placeholder',
    'aria-label', 'aria-selected', 'aria-expanded', 'aria-invalid',
    'aria-busy', 'aria-checked', 'aria-hidden', 'data-state', 'value',
]

export function createMutationTracker(
    config: Config,
    sender: Sender,
    onMutation: () => void,
): Tracker {
    let observer: MutationObserver | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    let pendingAdds: MutationAdd[] = []
    let pendingRemoves: number[] = []
    let pendingTextChanges: TextChange[] = []
    let pendingAttrChanges: AttrChange[] = []

    function flushMutations() {
        debounceTimer = null

        if (
            pendingAdds.length === 0
            && pendingRemoves.length === 0
            && pendingTextChanges.length === 0
            && pendingAttrChanges.length === 0
        ) return

        const mutation: MutationEvent = {
            event: 'mutation',
            timestamp: new Date().toISOString(),
            adds: pendingAdds,
            removes: pendingRemoves,
            text_changes: pendingTextChanges,
            attr_changes: pendingAttrChanges,
        }

        if (config.debug)
            console.log(`[Scene2] mutation: +${pendingAdds.length} -${pendingRemoves.length} text:${pendingTextChanges.length} attr:${pendingAttrChanges.length}`)

        sender.add(mutation)
        onMutation()

        pendingAdds = []
        pendingRemoves = []
        pendingTextChanges = []
        pendingAttrChanges = []
    }

    function scheduleMutationFlush() {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(flushMutations, config.mutationDebounce)
    }

    function handleMutations(mutations: MutationRecord[]) {
        for (const m of mutations) {
            // Added nodes
            for (const node of m.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue
                const el = node as HTMLElement
                const serialized = serializeNode(el)
                if (!serialized) continue

                const parentId = getNodeId(el.parentElement!)
                if (parentId === null) continue

                pendingAdds.push({ parentId, node: serialized })
            }

            // Removed nodes
            for (const node of m.removedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue
                const id = getNodeId(node)
                if (id !== null) {
                    pendingRemoves.push(id)
                    removeNodeId(id)
                }
            }

            // Text changes
            if (m.type === 'characterData' && m.target.parentElement) {
                const parentId = getNodeId(m.target.parentElement)
                if (parentId !== null) {
                    const text = m.target.textContent?.trim().slice(0, 200) || ''
                    pendingTextChanges.push({ id: parentId, text })
                }
            }

            // Attribute changes
            if (m.type === 'attributes' && m.attributeName) {
                const id = getNodeId(m.target)
                if (id !== null) {
                    const value = (m.target as HTMLElement).getAttribute(m.attributeName)
                    pendingAttrChanges.push({
                        id,
                        attr: m.attributeName,
                        value: value?.slice(0, 200) ?? null,
                    })
                }
            }
        }

        if (
            pendingAdds.length > 0
            || pendingRemoves.length > 0
            || pendingTextChanges.length > 0
            || pendingAttrChanges.length > 0
        ) {
            scheduleMutationFlush()
        }
    }

    return {
        start() {
            observer = new MutationObserver(handleMutations)
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: WATCH_ATTRS,
            })
        },
        stop() {
            observer?.disconnect()
            observer = null
            if (debounceTimer) clearTimeout(debounceTimer)
        },
        beforeUnload() {
            if (debounceTimer) {
                clearTimeout(debounceTimer)
                flushMutations()
            }
        },
    }
}
