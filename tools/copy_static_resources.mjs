import { access, cp } from 'node:fs/promises';

// Viteが生成した成果物に、動的URLから読むデータを元の階層のまま追加する。
const root = new URL('../', import.meta.url);
await access(new URL('dist/index.html', root));
await cp(new URL('resource/', root), new URL('dist/resource/', root), { recursive: true });
console.log('Copied resource/ to dist/resource/.');
