import { defineConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
    plugins: [vanillaExtractPlugin()],
    base: '/SoundEnum2/',
    publicDir: false,
    build: {
        target: 'es2022',
        outDir: 'dist',
    },
    worker: { format: 'es' },
});
