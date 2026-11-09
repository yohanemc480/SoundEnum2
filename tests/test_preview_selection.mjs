import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSoundPreview } from '../Scripts/View/Components/SelectSoundPreview.ts';
import { selected } from '../Scripts/View/Components/SoundPreviewRow.css.ts';

test('別画面の試聴選択を解除し、最後に選んだ対象だけを選択状態にする', () => {
    const previous = globalThis.document;
    const buttons = Array.from({ length: 3 }, () => {
        const classes = new Set([selected]);
        return { classes, classList: { remove: value => classes.delete(value), add: value => classes.add(value) } };
    });
    globalThis.document = { querySelectorAll: selector => {
        assert.equal(selector, `.${selected}`);
        return buttons.filter(button => button.classes.has(selected));
    } };
    try {
        selectSoundPreview(buttons[1]);
        assert.deepEqual(buttons.map(button => button.classes.has(selected)), [false, true, false]);
        selectSoundPreview(buttons[2]);
        assert.deepEqual(buttons.map(button => button.classes.has(selected)), [false, false, true]);
    } finally {
        if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
    }
});
