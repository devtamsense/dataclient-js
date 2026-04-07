import type { SerializedNode } from '../types'
import { RECORD_ATTRS, SKIP_TAGS } from '../constants'
import { getElementIcon } from './icon'
import { isMasked, maskText } from './mask'

let nextId = 1
const nodeToId = new WeakMap<Node, number>()
const idToNode = new Map<number, Node>()

export function resetIds() {
    nextId = 1
    idToNode.clear()
}

export function assignId(node: Node): number {
    const existing = nodeToId.get(node)
    if (existing) {
        return existing
    }
    const id = nextId++
    nodeToId.set(node, id)
    idToNode.set(id, node)
    return id
}

export function getNodeId(node: Node): number | null {
    return nodeToId.get(node) ?? null
}

export function getNodeById(id: number): Node | null {
    return idToNode.get(id) ?? null
}

export function removeNodeId(id: number) {
    const node = idToNode.get(id)
    if (node) {
        nodeToId.delete(node)
        idToNode.delete(id)
    }
}

function isVisible(el: HTMLElement): boolean {
    if (el.hidden)
        return false
    if (el.getAttribute('aria-hidden') === 'true')
        return false
    if (!el.offsetParent && el.tagName !== 'BODY' && getComputedStyle(el).position !== 'fixed') {
        return false
    }
    return true
}

function getDirectText(el: HTMLElement): string {
    let text = ''
    for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            const t = child.textContent?.trim()
            if (t) {
                text += (text ? ' ' : '') + t
            }
        }
    }
    const truncated = text.slice(0, 200)
    return isMasked(el) ? maskText(truncated) : truncated
}

function getAttrs(el: HTMLElement): Record<string, string> | undefined {
    const attrs: Record<string, string> = {}
    let hasAttrs = false
    const masked = isMasked(el)

    for (const name of RECORD_ATTRS) {
        const value = el.getAttribute(name)
        if (value !== null && value !== '') {
            let v = value.slice(0, 200)
            if (masked && (name === 'value' || name === 'placeholder')) {
                v = maskText(v)
            }
            attrs[name] = v
            hasAttrs = true
        }
    }

    return hasAttrs ? attrs : undefined
}

function getRect(el: HTMLElement): SerializedNode['rect'] {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) {
        return undefined
    }
    return {
        x: Math.round(r.left + window.scrollX),
        y: Math.round(r.top + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
    }
}

export function serializeNode(el: HTMLElement): SerializedNode | null {
    const tag = el.tagName?.toLowerCase()
    if (!tag || SKIP_TAGS.has(tag)) {
        return null
    }
    if (!isVisible(el)) {
        return null
    }

    const id = assignId(el)
    const text = getDirectText(el)
    const icon = getElementIcon(el)
    const attrs = getAttrs(el)
    const rect = getRect(el)

    const children: number[] = []
    for (const child of el.children) {
        const serialized = serializeNode(child as HTMLElement)
        if (serialized) {
            children.push(serialized.id)
        }
    }

    const node: SerializedNode = { id, tag }
    if (text) {
        node.text = text
    }
    if (icon) {
        node.icon = icon
    }
    if (attrs) {
        node.attrs = attrs
    }
    if (rect) {
        node.rect = rect
    }
    if (children.length > 0) {
        node.children = children
    }

    return node
}

export function serializeTree(root: HTMLElement): SerializedNode[] {
    const nodes: SerializedNode[] = []

    function walk(el: HTMLElement) {
        const node = serializeNode(el)
        if (!node) {
            return
        }
        nodes.push(node)
        for (const child of el.children) {
            walk(child as HTMLElement)
        }
    }

    walk(root)
    return nodes
}
