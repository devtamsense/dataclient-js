import type { SceneBatch, SceneEvent } from '../types'

const STORAGE_KEY = 'sc2_pending'
const MAX_RETRIES = 2

export class Sender {
    private queue: SceneEvent[] = []
    private timer: ReturnType<typeof setInterval> | null = null
    private isFlushing = false

    constructor(
        private endpoint: string,
        private apiKey: string,
        private batchSize: number,
        private sessionId: string,
        private deviceId: string,
        flushInterval: number,
    ) {
        this.restoreFromStorage()
        this.timer = setInterval(() => this.flush(), flushInterval)

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush()
            }
        })
        window.addEventListener('beforeunload', () => this.flushSync())
        window.addEventListener('pagehide', () => this.flushSync())
    }

    private restoreFromStorage() {
        try {
            localStorage.removeItem(STORAGE_KEY)
        }
        catch {}
    }

    private saveToStorage() {
        if (this.queue.length === 0) {
            return
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue))
        }
        catch {}
    }

    add(event: SceneEvent) {
        this.queue.push(event)
        if (this.queue.length >= this.batchSize) {
            this.flush()
        }
    }

    async flush() {
        if (this.queue.length === 0 || this.isFlushing) {
            return
        }

        this.isFlushing = true

        const events = this.queue.splice(0)
        const batch = this.buildBatch(events)
        const json = JSON.stringify(batch)
        const url = `${this.endpoint}?key=${encodeURIComponent(this.apiKey)}`

        const success = await this.send(json, url)

        if (!success) {
            this.queue.unshift(...events)
            this.saveToStorage()
        }

        this.isFlushing = false
    }

    private flushSync() {
        if (this.queue.length === 0) {
            return
        }

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
                if (response.ok) {
                    return true
                }
            }
            catch {}

            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, (attempt + 1) * 200))
            }
        }
        return false
    }

    destroy() {
        if (this.timer) {
            clearInterval(this.timer)
        }
        this.flushSync()
    }
}
