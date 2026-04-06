import type { Config, ExcludeEvent, IdentifyEvent, Tracker } from './types'
import { getDeviceId, getSessionId } from './identity'
import { Sender } from './sender'
import { createActionTracker } from './trackers/action'
import { createMutationTracker } from './trackers/mutation'
import { createRrwebTracker } from './trackers/rrweb'
import { createSnapshotTracker } from './trackers/snapshot'

export type * from './types'

let config: Config = {
    endpoint: null,
    debug: false,
    batchSize: 10,
    flushInterval: 10000,
    checkpointInterval: 30000,
    mutationDebounce: 200,
    inputDebounce: 1000,
    sessionIdKey: 'sc2_sid',
    deviceIdKey: 'sc2_did',
    apiKey: '',
}

let sender: Sender | null = null
let trackers: Tracker[] = []
let initialized = false

export function init(options?: Partial<Config>) {
    if (initialized) return

    if (options)
        config = { ...config, ...options }

    const sessionId = getSessionId(config.sessionIdKey)
    const deviceId = getDeviceId(config.deviceIdKey)
    sender = new Sender(config.endpoint, config.apiKey, config.batchSize, sessionId, deviceId, config.flushInterval, config.debug)

    const snapshotTracker = createSnapshotTracker(config, sender)
    const mutationTracker = createMutationTracker(config, sender, () => {
        snapshotTracker.markMutation?.()
    })
    const actionTracker = createActionTracker(config, sender)
    const rrwebTracker = createRrwebTracker(config, sender)

    trackers = [snapshotTracker, mutationTracker, actionTracker, rrwebTracker]

    for (const tracker of trackers) tracker.start()

    const handleUnload = () => {
        for (const tracker of trackers) tracker.beforeUnload?.()
    }
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    initialized = true

    if (config.debug)
        console.log(`[Scene2] Initialized. Session: ${sessionId}, Device: ${deviceId}`)
}

export function setUser(userId: string) {
    const event: IdentifyEvent = {
        event: 'identify',
        timestamp: new Date().toISOString(),
        user_id: userId,
    }
    sender?.add(event)
    if (config.debug)
        console.log(`[Scene2] User identified: ${userId}`)
}

export function excludeSession(reason = '') {
    const event: ExcludeEvent = {
        event: 'exclude',
        timestamp: new Date().toISOString(),
        reason,
    }
    sender?.add(event)
    if (config.debug)
        console.log(`[Scene2] Session excluded: ${reason}`)
    destroy()
}

export function flush() { sender?.flush() }

export function destroy() {
    for (const tracker of trackers) tracker.stop()
    trackers = []
    sender?.destroy()
    sender = null
    initialized = false
}

export default { init, setUser, excludeSession, flush, destroy }
