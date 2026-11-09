import { access, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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
const localPython = fileURLToPath(new URL(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python', root));
const python = process.env.SOUNDENUM_PYTHON || (existsSync(localPython) ? localPython : 'python');
const result = spawnSync(python, ['tools/build_release_audio.py'], { cwd: fileURLToPath(root), stdio: 'inherit' });
if (result.error) {
    console.error('Python could not start. Install tools/requirements-release-audio.txt; SOUNDENUM_PYTHON can select the interpreter.');
    throw result.error;
}
if (result.status !== 0) process.exit(result.status || 1);
console.log('Copied search data and prepared compressed release audio.');
