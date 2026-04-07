import type { Viewport } from '../types'

export function getViewport(): Viewport {
    return {
        scrollX: Math.round(window.scrollX),
        scrollY: Math.round(window.scrollY),
        width: window.innerWidth,
        height: window.innerHeight,
    }
}
