export function getSessionId(_key: string): string {
    // Fresh session id on every page load — keeps scene2 and rrweb timelines aligned
    return generateId()
}

export function getDeviceId(key: string): string {
    let id = localStorage.getItem(key)
    if (!id) {
        id = generateId()
        localStorage.setItem(key, id)
    }
    return id
}

function generateId(): string {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).substring(2, 12)
    return `${ts}-${rand}`
}
