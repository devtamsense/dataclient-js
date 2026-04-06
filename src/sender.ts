import type { SceneBatch, SceneEvent } from './types'

const STORAGE_KEY = 'sc2_pending'
const MAX_RETRIES = 2

export class Sender {
    private queue: SceneEvent[] = []
    private timer: ReturnType<typeof setInterval> | null = null
    private isFlushing = false

    constructor(
        private endpoint: string | null,
        private apiKey: string,
        private batchSize: number,
        private sessionId: string,
        private deviceId: string,
        flushInterval: number,
        private debug: boolean | 'verbose' = false,
    ) {
        this.restoreFromStorage()
        this.timer = setInterval(() => this.flush(), flushInterval)

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden')
                this.flush()
        })
        window.addEventListener('beforeunload', () => this.flushSync())
        window.addEventListener('pagehide', () => this.flushSync())
    }

    private restoreFromStorage() {
        // Don't restore events from previous sessions — they have old timestamps
        // that would desync with the current session's rrweb events.
        try {
            localStorage.removeItem(STORAGE_KEY)
        }
        catch {}
    }

    private saveToStorage() {
        if (this.queue.length === 0) return
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue))
        }
        catch {}
    }

    add(event: SceneEvent) {
        if (this.debug) {
            this.logEvent(event)
        }
        this.queue.push(event)
        if (this.queue.length >= this.batchSize)
            this.flush()
    }

    private logEvent(event: SceneEvent) {
        const style = 'color: #888; font-weight: normal'
        const bold = 'color: #000; font-weight: bold'

        switch (event.event) {
            case 'snapshot':
                console.log(`%c[Scene2] %csnapshot%c ${event.url} (${event.tree.length} nodes)`, style, bold, style)
                if (this.debug === 'verbose') console.log(event.tree)
                break
            case 'mutation':
                console.log(
                    `%c[Scene2] %cmutation%c +${event.adds.length} -${event.removes.length} text:${event.text_changes.length} attr:${event.attr_changes.length}`,
                    style, bold, style,
                )
                if (this.debug === 'verbose') console.log({ adds: event.adds, removes: event.removes, text_changes: event.text_changes, attr_changes: event.attr_changes })
                break
            case 'action':
                console.log(`%c[Scene2] %c${event.type}%c <${event.tag}> "${event.text}"${event.value ? ` → "${event.value}"` : ''}`, style, bold, style)
                break
            case 'identify':
                console.log(`%c[Scene2] %cidentify%c ${event.user_id}`, style, bold, style)
                break
            case 'rrweb':
                if (this.debug === 'verbose')
                    console.log(`%c[Scene2] %crrweb%c event`, style, bold, style, event.rrwebEvent)
                break
            case 'exclude':
                console.log(`%c[Scene2] %cexclude%c ${event.reason}`, style, bold, style)
                break
        }
    }

    async flush() {
        if (this.queue.length === 0 || this.isFlushing || !this.endpoint)
            return

        this.isFlushing = true

        const events = this.queue.splice(0)
        const batch = this.buildBatch(events)
        const json = JSON.stringify(batch)
        const url = `${this.endpoint}?key=${encodeURIComponent(this.apiKey)}`

        if (this.debug) {
            const nonRrweb = events.filter(e => e.event !== 'rrweb')
            if (nonRrweb.length > 0) {
                const first = nonRrweb[0] as any
                const last = nonRrweb[nonRrweb.length - 1] as any
                console.log(`[Scene2] flush: ${events.length} events. NonRrweb timestamps: ${first?.timestamp} → ${last?.timestamp} (now: ${new Date().toISOString()})`)
            }
        }

        const success = await this.send(json, url)

        if (!success) {
            this.queue.unshift(...events)
            this.saveToStorage()
        }

        this.isFlushing = false
    }

    private flushSync() {
        if (this.queue.length === 0 || !this.endpoint) return

        const events = this.queue.splice(0)
        const batch = this.buildBatch(events)
        const json = JSON.stringify(batch)
        const url = `${this.endpoint}?key=${encodeURIComponent(this.apiKey)}`

        const blob = new Blob([json], { type: 'application/json' })
        const sent = navigator.sendBeacon(url, blob)

        if (!sent) {
            this.queue.unshift(...events)
            this.saveToStorage()
        }
    }

    private buildBatch(events: SceneEvent[]): SceneBatch {
        return {
            session_id: this.sessionId,
            device_id: this.deviceId,
            events,
            sent_at: new Date().toISOString(),
            page_url: location.href,
            user_agent: navigator.userAgent,
            screen: {
                width: screen.width,
                height: screen.height,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
            },
        }
    }

    private async send(json: string, url: string): Promise<boolean> {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: json,
                    keepalive: true,
                })
                if (response.ok) return true
            }
            catch {}

            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, (attempt + 1) * 200))
            }
        }
        return false
    }

    destroy() {
        if (this.timer) clearInterval(this.timer)
        this.flushSync()
    }
}
