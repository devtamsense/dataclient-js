import type { Sender } from '../sender'
import type { Config, SnapshotEvent, Tracker } from '../types'
import { resetIds, serializeTree } from '../serializer'
import { getViewport } from '../viewport'

export function createSnapshotTracker(config: Config, sender: Sender): Tracker {
    let lastUrl = ''
    let urlPollTimer: ReturnType<typeof setInterval> | null = null
    let checkpointTimer: ReturnType<typeof setInterval> | null = null
    let hasMutationsSinceLastSnapshot = false

    function recordSnapshot() {
        resetIds()

        const snapshot: SnapshotEvent = {
            event: 'snapshot',
            timestamp: new Date().toISOString(),
            url: location.href,
            title: document.title,
            tree: serializeTree(document.body),
            viewport: getViewport(),
        }

        if (config.debug)
            console.log(`[Scene2] snapshot: ${location.href} (${snapshot.tree.length} nodes)`)

        sender.add(snapshot)
        sender.flush()
        hasMutationsSinceLastSnapshot = false
    }

    function pollUrl() {
        if (location.href !== lastUrl) {
            const prev = lastUrl
            lastUrl = location.href
            if (prev) {
                if (config.debug)
                    console.log(`[Scene2] URL changed: ${prev} → ${location.href}`)
                recordSnapshot()
            }
        }
    }

    function checkpoint() {
        if (hasMutationsSinceLastSnapshot) {
            if (config.debug)
                console.log('[Scene2] checkpoint snapshot')
            recordSnapshot()
        }
    }

    return {
        start() {
            lastUrl = location.href
            recordSnapshot()

            urlPollTimer = setInterval(pollUrl, 500)
            checkpointTimer = setInterval(checkpoint, config.checkpointInterval)
        },
        stop() {
            if (urlPollTimer) clearInterval(urlPollTimer)
            if (checkpointTimer) clearInterval(checkpointTimer)
        },
        beforeUnload() {
            if (hasMutationsSinceLastSnapshot) {
                recordSnapshot()
            }
        },
        markMutation() {
            hasMutationsSinceLastSnapshot = true
        },
    }
}
