export function getDeviceId(key: string): string {
    let id = localStorage.getItem(key)
    if (!id) {
        id = generateId()
        localStorage.setItem(key, id)
    }
    return id
}

export function generateId(): string {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).substring(2, 12)
    return `${ts}-${rand}`
}
