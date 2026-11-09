import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const localPython = fileURLToPath(new URL(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python', root));
// 依存準備・テスト・圧縮で同じPython環境を使用する。
export const python = process.env.SOUNDENUM_PYTHON || (existsSync(localPython) ? localPython : 'python');

/** リポジトリルートで処理を実行し、失敗した場合はビルド全体を停止する。 */
export function run(command, args) {
    const result = spawnSync(command, args, { cwd: fileURLToPath(root), stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}
