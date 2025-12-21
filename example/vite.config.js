import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import websqz from 'rollup-plugin-websqz';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        sourcemap: true,

        // Disable module preloading for better compression results
        modulePreload: false,
    },
    plugins: [
        websqz(),
        glsl({ minify: true })
    ]
});