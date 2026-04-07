const ICON_CLASS_PATTERNS = [
    /\bfa-([a-z0-9-]+)\b/,
    /\bmdi-([a-z0-9-]+)\b/,
    /\bbi-([a-z0-9-]+)\b/,
    /\bicon-([a-z0-9-]+)\b/,
    /\blucide-([a-z0-9-]+)\b/,
    /\bri-([a-z0-9-]+)\b/,
    /\btabler-icon-([a-z0-9-]+)\b/,
    /\bi-[a-z0-9-]+[:/]([a-z0-9-]+)\b/,
]

const MATERIAL_CLASS_PATTERN = /\b(?:material-icons|material-symbols-[a-z]+)\b/
const SVG_USE_HREF_PATTERN = /#(.+)/

const MAX_ICON_IMG_SIZE = 48

export function getElementIcon(el: HTMLElement): string | null {
    if (!el) {
        return null
    }

    const direct = detectIcon(el)
    if (direct) {
        return direct
    }

    for (const child of el.children) {
        const icon = detectIcon(child as HTMLElement)
        if (icon) {
            return icon
        }
    }

    return null
}

function detectIcon(el: HTMLElement): string | null {
    if (!el?.tagName) {
        return null
    }

    const tag = el.tagName.toLowerCase()

    if (tag === 'svg') {
        return detectSvgIcon(el)
    }

    if (tag === 'i' || tag === 'span' || el.classList.contains('iconify')) {
        return detectFontIcon(el)
    }

    if (tag === 'img') {
        return detectImgIcon(el as HTMLImageElement)
    }

    const svg = el.querySelector('svg')
    if (svg) {
        return detectSvgIcon(svg)
    }

    return null
}

function detectSvgIcon(svg: Element): string | null {
    const lucide = svg.getAttribute('data-lucide')
    if (lucide) {
        return lucide
    }

    const dataIcon = svg.getAttribute('data-icon')
    if (dataIcon) {
        return dataIcon
    }

    const use = svg.querySelector('use')
    if (use) {
        const href = use.getAttribute('href') || use.getAttribute('xlink:href')
        if (href) {
            const match = href.match(SVG_USE_HREF_PATTERN)
            if (match) {
                return match[1]
            }
        }
    }

    const ariaLabel = svg.getAttribute('aria-label')
    if (ariaLabel) {
        return ariaLabel
    }

    const cls = typeof svg.className === 'string' ? svg.className : svg.getAttribute('class') || ''
    const fromClass = extractIconNameFromClass(cls)
    if (fromClass) {
        return fromClass
    }

    return null
}

function detectFontIcon(el: HTMLElement): string | null {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') || ''

    if (MATERIAL_CLASS_PATTERN.test(cls)) {
        const text = el.textContent?.trim()
        if (text) {
            return text
        }
    }

    return extractIconNameFromClass(cls)
}

function detectImgIcon(img: HTMLImageElement): string | null {
    if (img.width > MAX_ICON_IMG_SIZE || img.height > MAX_ICON_IMG_SIZE) {
        return null
    }

    if (img.naturalWidth > MAX_ICON_IMG_SIZE || img.naturalHeight > MAX_ICON_IMG_SIZE) {
        return null
    }

    const alt = img.alt?.trim()
    if (alt) {
        return alt
    }

    const src = img.getAttribute('src')
    if (src) {
        const filename = src.split('/').pop()?.split('?')[0]?.split('.')[0]
        if (filename) {
            return filename
        }
    }

    return null
}

function extractIconNameFromClass(cls: string): string | null {
    for (const pattern of ICON_CLASS_PATTERNS) {
        const match = cls.match(pattern)
        if (match) {
            return match[1]
        }
    }
    return null
}
