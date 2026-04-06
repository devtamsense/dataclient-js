import type { Sender } from '../sender'
import type { Config, Tracker } from '../types'
import { record } from 'rrweb'

export function createRrwebTracker(config: Config, sender: Sender): Tracker {
    let stopFn: (() => void) | null = null

    return {
        start() {
            stopFn = record({
                emit(event) {
                    sender.add({
                        event: 'rrweb',
                        timestamp: new Date().toISOString(),
                        rrwebEvent: event,
                    } as any)
                },
                recordCrossOriginIframes: false,
                recordCanvas: false,
                // Mask sensitive content during replay (elements with data-scene2-mask)
                maskTextSelector: '[data-scene2-mask]',
                maskInputSelector: '[data-scene2-mask]',
                maskInputOptions: { password: true },
                maskTextFn: text => '*'.repeat(text.length),
                sampling: {
                    mousemove: false,
                    mouseInteraction: true,
                    scroll: 500,
                    input: 'last',
                },
            }) ?? null

            if (config.debug)
                console.log('[Scene2] rrweb recording started')
        },
        stop() {
            if (stopFn) {
                stopFn()
                stopFn = null
            }
        },
    }
}

// Add custom event marker to rrweb timeline
export function addRrwebMarker(tag: string, payload: unknown) {
    record.addCustomEvent(tag, payload)
}
