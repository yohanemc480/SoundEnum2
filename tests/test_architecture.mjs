import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../Scripts/', import.meta.url));
const allowed = {
    App: ['App', 'Model', 'Contracts', 'Presenter', 'View', 'Infrastructure', 'I18n'],
    Model: ['Model'],
    Contracts: ['Contracts', 'Model'],
    Presenter: ['Presenter', 'Contracts', 'Model'],
    View: ['View', 'Contracts', 'Model', 'I18n'],
    Infrastructure: ['Infrastructure', 'Contracts', 'Model'],
    I18n: ['I18n'],
};

/** Scripts配下のTypeScriptを列挙し、新しいファイルも検査対象に含める。 */
function filesIn(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? filesIn(path) : path.endsWith('.ts') ? [path] : [];
    });
}

/** import・再公開・型import・動的import・WorkerのURL参照を構文木から抽出する。 */
function dependencies(path) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const imports = new Set();
    /** 型専用の参照も依存方向の検査から除外しない。 */
    function visit(node) {
        let target;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) target = node.moduleSpecifier;
        if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) target = node.argument.literal;
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            target = node.arguments[0];
            assert.ok(target && ts.isStringLiteral(target), `検査できない動的import: ${path}`);
        }
        if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL') {
            const first = node.arguments?.[0];
            if (first && ts.isStringLiteral(first) && first.text.endsWith('.ts')) target = first;
        }
        if (target && ts.isStringLiteral(target)) imports.add(target.text);
        ts.forEachChild(node, visit);
    }
    visit(source);
    return [...imports];
}

/** 絶対パスからScripts内の層を取得する。範囲外とルート直下は許可しない。 */
function layerOf(path) {
    return relative(root, path).split(/[\\/]/)[0];
}

test('型参照を含む依存がMVPの境界を守り、循環参照や孤立ファイルがない', () => {
    const files = filesIn(root);
    const graph = new Map();
    for (const file of files) {
        const layer = layerOf(file);
        assert.ok(allowed[layer], `所属する層が不明: ${file}`);
        const edges = [];
        for (const specifier of dependencies(file)) {
            if (!specifier.startsWith('.')) {
                assert.ok(layer === 'View' && specifier === '@vanilla-extract/css', `未許可の外部依存: ${file} -> ${specifier}`);
                continue;
            }
            const target = resolve(dirname(file), specifier);
            assert.ok(files.includes(target), `参照先が検査対象に存在しない: ${file} -> ${specifier}`);
            assert.ok(allowed[layer].includes(layerOf(target)), `層の依存方向違反: ${file} -> ${specifier}`);
            if (layer === 'View' && target.endsWith('.css.ts')) {
                const sourceArea = relative(root, file).split(/[\\/]/)[1];
                const targetArea = relative(root, target).split(/[\\/]/)[1];
                assert.ok(sourceArea === targetArea || ['Components', 'Layout'].includes(targetArea),
                    `機能間のCSS参照は共通部品へ移す: ${file} -> ${specifier}`);
            }
            edges.push(target);
        }
        graph.set(file, edges);
    }
    const completed = new Set();
    const active = [];
    /** 探索中の経路に戻る参照を循環として報告する。 */
    function visit(file) {
        assert.ok(!active.includes(file), `循環参照: ${[...active, file].map(p => relative(root, p)).join(' -> ')}`);
        if (completed.has(file)) return;
        active.push(file);
        for (const target of graph.get(file)) visit(target);
        active.pop();
        completed.add(file);
    }
    for (const file of files) visit(file);

    const reachable = new Set();
    /** 起動入口から型・CSS・Workerも含めて辿り、孤立した移行残骸を検出する。 */
    function markReachable(file) {
        if (reachable.has(file)) return;
        reachable.add(file);
        for (const target of graph.get(file)) markReachable(target);
    }
    markReachable(resolve(root, 'App/Bootstrap.ts'));
    assert.deepEqual(files.filter(file => !reachable.has(file)).map(file => relative(root, file)), [],
        '起動入口から参照されていないファイル');
});
