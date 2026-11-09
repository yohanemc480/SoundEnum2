import test from 'node:test';
import assert from 'node:assert/strict';
import { CopyCommandPresenter } from '../Scripts/Presenter/CopyCommandPresenter.ts';
import { createCopyButton } from '../Scripts/View/Components/CopyButton/CopyButton.ts';

test('書き込み成功を待って通知し、複数行のコマンドをそのままコピーする', async () => {
    let finish, written; const notices = [];
    const presenter = new CopyCommandPresenter({ writeText: text => { written = text; return new Promise(resolve => { finish = resolve; }); } }, result => notices.push(result));
    const text = 'playsound minecraft:a block @a ~ ~ ~ 1 1 0\nplaysound minecraft:b master @a ~ ~ ~ 0.5 1.2 0';
    const pending = presenter.copy(text);
    assert.equal(written, text); assert.deepEqual(notices, []);
    finish(); await pending; assert.deepEqual(notices, ['success']);
});

test('コピー失敗を一度だけ通知し、その後の再試行で成功できる', async () => {
    let fail = true; const notices = [];
    const presenter = new CopyCommandPresenter({ async writeText() { if (fail) throw new Error('denied'); } }, result => notices.push(result));
    await assert.doesNotReject(presenter.copy('command')); assert.deepEqual(notices, ['failure']);
    fail = false; await presenter.copy('command'); assert.deepEqual(notices, ['failure', 'success']);
});

test('クリック時の最新テキストを注入された処理でコピーする', () => {
    const old = globalThis.document;
    class Button extends EventTarget { setAttribute() {} querySelector() { return null; } }
    globalThis.document = { createElement: () => new Button() };
    try {
        let current = 'old'; const copied = [];
        const button = createCopyButton(() => current, async text => { copied.push(text); });
        current = 'new'; button.dispatchEvent(new Event('click')); assert.deepEqual(copied, ['new']);
    } finally { if (old === undefined) delete globalThis.document; else globalThis.document = old; }
});
