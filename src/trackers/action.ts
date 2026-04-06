import type { Sender } from '../sender'
import type { ActionEvent, Config, Tracker } from '../types'
import { addRrwebMarker } from './rrweb'
import { isMasked, maskText } from '../mask'
import { getNodeId } from '../serializer'
import { getViewport } from '../viewport'

const INPUT_DEBOUNCE = 1000
const TEXT_TYPES = new Set(['text', 'email', 'password', 'search', 'tel', 'url', 'number'])

export function createActionTracker(config: Config, sender: Sender): Tracker {
    const inputTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()
    const pendingInputs = new Set<HTMLElement>()

    function getElementInfo(el: HTMLElement) {
        const tag = el.tagName?.toLowerCase() || ''
        let text = ''

        if (tag === 'input' || tag === 'textarea') {
            text = (el as HTMLInputElement).placeholder || el.getAttribute('aria-label') || ''
        }
        else {
            // Direct text only
            for (const child of el.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const t = child.textContent?.trim()
                    if (t) text += (text ? ' ' : '') + t
                }
            }
            if (!text) text = el.textContent?.trim().slice(0, 100) || ''
        }

        const masked = isMasked(el)
        const finalText = masked ? maskText(text) : text

        return {
            tag,
            text: finalText.slice(0, 100),
            targetId: getNodeId(el),
            state: (el as HTMLButtonElement).disabled ? 'disabled' : 'enabled',
            masked,
        }
    }

    function findMeaningfulElement(el: HTMLElement): HTMLElement {
        const interactiveTags = new Set(['button', 'a', 'input', 'select', 'textarea'])
        const interactiveRoles = new Set(['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'option'])

        let current: HTMLElement | null = el
        while (current && current !== document.body) {
            if (interactiveTags.has(current.tagName?.toLowerCase())) return current
            const role = current.getAttribute('role')
            if (role && interactiveRoles.has(role)) return current
            current = current.parentElement
        }
        return el
    }

    // === Click ===

    function handleClick(e: Event) {
        const raw = e.target as HTMLElement
        if (!raw) return

        const tag = raw.tagName?.toLowerCase()
        if (tag === 'body' || tag === 'html') return

        const el = findMeaningfulElement(raw)
        const info = getElementInfo(el)

        const action: ActionEvent = {
            event: 'action',
            timestamp: new Date().toISOString(),
            type: 'click',
            targetId: info.targetId,
            tag: info.tag,
            text: info.text,
            url: location.href,
            state: info.state,
            viewport: getViewport(),
        }

        if (config.debug)
            console.log(`[Scene2] click: ${info.tag} "${info.text}"`)

        sender.add(action)
        addRrwebMarker('click', { tag: info.tag, text: info.text, label: `Click: ${info.text || info.tag}` })
    }

    // === Input ===

    function handleInput(e: Event) {
        const target = e.target as HTMLElement
        if (!target) return

        const tag = target.tagName?.toLowerCase()
        if (tag === 'input') {
            const type = (target as HTMLInputElement).type?.toLowerCase() || 'text'
            if (!TEXT_TYPES.has(type)) return
        }
        else if (tag !== 'textarea') {
            return
        }

        pendingInputs.add(target)

        const prev = inputTimers.get(target)
        if (prev) clearTimeout(prev)

        inputTimers.set(target, setTimeout(() => {
            inputTimers.delete(target)
            pendingInputs.delete(target)
            recordInput(target)
        }, config.inputDebounce))
    }

    function recordInput(target: HTMLElement) {
        const rawValue = (target as HTMLInputElement).value || ''
        if (!rawValue) return

        const info = getElementInfo(target)
        // Mask password inputs + anything under data-scene2-mask
        const type = (target as HTMLInputElement).type?.toLowerCase() || ''
        const value = (info.masked || type === 'password') ? maskText(rawValue) : rawValue

        const action: ActionEvent = {
            event: 'action',
            timestamp: new Date().toISOString(),
            type: 'input',
            targetId: info.targetId,
            tag: info.tag,
            text: info.text,
            url: location.href,
            value,
            length: rawValue.length,
            viewport: getViewport(),
        }

        if (config.debug)
            console.log(`[Scene2] input: ${info.tag} "${info.text}" → ${value.length} chars`)

        sender.add(action)
        addRrwebMarker('input', { tag: info.tag, text: info.text, label: `Input: ${info.text || info.tag}` })
    }

    // === Change ===

    function handleChange(e: Event) {
        const target = e.target as HTMLElement
        if (!target) return

        const info = getElementInfo(target)
        const tag = target.tagName?.toLowerCase()

        const action: ActionEvent = {
            event: 'action',
            timestamp: new Date().toISOString(),
            type: 'change',
            targetId: info.targetId,
            tag: info.tag,
            text: info.text,
            url: location.href,
            viewport: getViewport(),
        }

        if (tag === 'select') {
            const selectValue = (target as HTMLSelectElement).value
            action.value = info.masked ? maskText(selectValue) : selectValue
        }
        else if (tag === 'input') {
            const type = (target as HTMLInputElement).type
            if (type === 'checkbox' || type === 'radio') {
                action.checked = (target as HTMLInputElement).checked
            }
        }

        if (config.debug)
            console.log(`[Scene2] change: ${info.tag} "${info.text}"`)

        sender.add(action)
        addRrwebMarker('change', { tag: info.tag, text: info.text, label: `Change: ${info.text || info.tag}` })
    }

    return {
        start() {
            document.addEventListener('click', handleClick, true)
            document.addEventListener('input', handleInput, true)
            document.addEventListener('change', handleChange, true)
        },
        stop() {
            document.removeEventListener('click', handleClick, true)
            document.removeEventListener('input', handleInput, true)
            document.removeEventListener('change', handleChange, true)
        },
        beforeUnload() {
            for (const el of pendingInputs) {
                const timer = inputTimers.get(el)
                if (timer) clearTimeout(timer)
                inputTimers.delete(el)
                recordInput(el)
            }
            pendingInputs.clear()
        },
    }
}
