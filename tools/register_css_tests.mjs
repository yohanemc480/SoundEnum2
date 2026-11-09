import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import '@vanilla-extract/css/disableRuntimeStyles';

// Node tests need file scopes for real style exports, but do not render CSS.
// Production CSS generation is verified separately by the Vite build.
const root = fileURLToPath(new URL('../', import.meta.url));
registerHooks({
    load(url, context, nextLoad) {
        if (!url.startsWith('file:') || !url.endsWith('.css.ts')) return nextLoad(url, context);
        const path = fileURLToPath(url);
        const scope = relative(root, path).replaceAll('\\', '/');
        const source = stripTypeScriptTypes(readFileSync(path, 'utf8'));
        return {
            format: 'module', shortCircuit: true,
            source: `import { setFileScope as __setScope, endFileScope as __endScope } from '@vanilla-extract/css/fileScope';
__setScope(${JSON.stringify(scope)}, 'sound-enum');
${source}
__endScope();`,
        };
    },
});
