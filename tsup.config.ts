import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs', 'iife'],
    target: 'es2022',
    outDir: 'dist',
    globalName: 'Scene2',
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
})
