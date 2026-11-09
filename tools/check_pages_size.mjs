import { readdir, stat } from 'node:fs/promises';

const root = new URL('../dist/', import.meta.url);
// GitHubの1GB制限に対して、10進表記の保守的なしきい値を使う。
const limit = 1_000_000_000;
async function size(directory) {
    let bytes = 0;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = new URL(encodeURIComponent(entry.name) + (entry.isDirectory() ? '/' : ''), directory);
        if (entry.isDirectory()) bytes += await size(path);
        else if (entry.isFile()) bytes += (await stat(path)).size;
        else throw new Error(`Unsupported deployment entry: ${entry.name}`);
    }
    return bytes;
}
const bytes = await size(root);
console.log(`Pages artifact: ${bytes.toLocaleString('en-US')} bytes (limit: ${limit.toLocaleString('en-US')}).`);
if (bytes > limit) {
    console.error('Artifact exceeds the documented Pages size limit. Review deployment resources before publishing.');
    process.exitCode = 1;
}
