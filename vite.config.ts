import { defineConfig } from 'vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Actionsでは公開対象のSHAを使い、ローカルではチェックアウト中のコミットを使う。
const commitHash = (process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)), encoding: 'utf8',
})).trim();
if (!/^[0-9a-f]{40,64}$/.test(commitHash)) throw new Error('Invalid build commit hash');

export default defineConfig({
    plugins: [vanillaExtractPlugin(), {
        name: 'build-commit',
        /** 実行時の通信を使わず、公開成果物へコミット情報を埋め込む。 */
        transformIndexHtml(html) {
            return html.replaceAll('__BUILD_COMMIT_SHA__', commitHash)
                .replaceAll('__BUILD_COMMIT_SHORT__', commitHash.slice(0, 8));
        },
    }],
    base: '/SoundEnum2/',
    publicDir: false,
    build: {
        target: 'es2022',
        outDir: 'dist',
    },
    worker: { format: 'es' },
});
