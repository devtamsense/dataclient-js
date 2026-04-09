import antfu from '@antfu/eslint-config'

export default antfu({
    typescript: true,

    stylistic: {
        indent: 4,
        quotes: 'single',
        semi: false,
    },

    ignores: [
        'dist/**',
        'node_modules/**',
        '.github/**',
        '**/*.md',
    ],
}, {
    rules: {
        'no-console': 'off',
        'ts/no-explicit-any': 'warn',
        'ts/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'node/prefer-global/process': 'off',
        'style/max-statements-per-line': 'off',
    },
})
