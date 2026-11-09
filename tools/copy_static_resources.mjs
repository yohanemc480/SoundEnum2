import { access, cp } from 'node:fs/promises';
import { python, run } from './build_environment.mjs';
import { fileURLToPath } from 'node:url';

// Viteが生成した成果物に、動的URLから読むデータを元の階層のまま追加する。
const root = new URL('../', import.meta.url);
await access(new URL('dist/index.html', root));
const audioDirectory = fileURLToPath(new URL('resource/audio', root));
// 元音源はコピーせず、音声以外の検索データだけを先に配置する。
await cp(new URL('resource/', root), new URL('dist/resource/', root), {
    recursive: true,
    filter: source => source !== audioDirectory,
});
run(python, ['tools/build_release_audio.py']);
console.log('Copied search data and prepared compressed release audio.');
