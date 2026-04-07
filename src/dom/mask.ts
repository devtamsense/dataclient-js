import { MASK_SELECTOR } from '../constants'

export function isMasked(el: Element | Node | null): boolean {
    if (!el)
        return false
    const element = el.nodeType === Node.ELEMENT_NODE
        ? el as Element
        : el.parentElement
    return !!element?.closest(MASK_SELECTOR)
}

export function maskText(text: string): string {
    if (!text) {
        return text
    }
    const visible = Math.max(1, Math.ceil(text.length * 0.2))
    return text.slice(0, visible) + '*'.repeat(text.length - visible)
}

export function maskValue(el: Element | null, value: string): string {
    return isMasked(el) ? maskText(value) : value
}
