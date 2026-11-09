import { defineConfig } from 'vite';

export default defineConfig({
    base: '/SoundEnum2/',
    publicDir: false,
    build: {
        target: 'es2022',
        outDir: 'dist',
    },
    worker: { format: 'es' },
});
