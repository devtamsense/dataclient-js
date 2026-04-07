export const MASK_ATTR = 'dataclient-mask'
export const MASK_SELECTOR = `[${MASK_ATTR}]`

export const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'link', 'meta', 'head'])

export const RECORD_ATTRS = new Set([
    'class',
    'role',
    'href',
    'type',
    'placeholder',
    'disabled',
    'hidden',
    'aria-label',
    'aria-selected',
    'aria-expanded',
    'aria-invalid',
    'aria-busy',
    'aria-checked',
    'aria-hidden',
    'value',
    'name',
    'id',
    'for',
    'target',
    'data-state',
    MASK_ATTR,
])

export const WATCH_ATTRS = [
    'class',
    'role',
    'href',
    'disabled',
    'hidden',
    'placeholder',
    'aria-label',
    'aria-selected',
    'aria-expanded',
    'aria-invalid',
    'aria-busy',
    'aria-checked',
    'aria-hidden',
    'data-state',
    'value',
]

export const TEXT_INPUT_TYPES = new Set(['text', 'email', 'password', 'search', 'tel', 'url', 'number'])

export const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea'])
export const INTERACTIVE_ROLES = new Set(['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'option'])
