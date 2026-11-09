import { Text } from "./Text.ts";

/** HTML の文言と表示用属性を日本語辞書から設定する。子要素を持つ箇所では専用の span に指定する。 */
export function applyText(root: ParentNode = document): void
{
    for (const attribute of [null, 'aria-label', 'title', 'placeholder', 'data-empty-text']) {
        const marker = attribute ? `data-i18n-${attribute}` : 'data-i18n';
        for (const element of root.querySelectorAll(`[${marker}]`)) {
            const key = element.getAttribute(marker);
            if (!isTextKey(key)) throw new Error(`Unknown text key: ${key}`);
            const text = Text[key];
            if (typeof text !== 'string') throw new Error(`Unknown text key: ${key}`);
            if (attribute) element.setAttribute(attribute, text);
            else element.textContent = text;
        }
    }
}

function isTextKey(key: string | null): key is keyof typeof Text {
    return key !== null && Object.hasOwn(Text, key);
}
