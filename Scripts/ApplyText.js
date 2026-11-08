import { Text } from "./Text.js";

/** HTML の文言と表示用属性を日本語辞書から設定する。子要素を持つ箇所では専用の span に指定する。 */
export function applyText(root = document)
{
    for (const attribute of [null, 'aria-label', 'title', 'placeholder', 'data-empty-text']) {
        const marker = attribute ? `data-i18n-${attribute}` : 'data-i18n';
        for (const element of root.querySelectorAll(`[${marker}]`)) {
            const key = element.getAttribute(marker);
            if (!Object.hasOwn(Text, key) || typeof Text[key] !== 'string') {
                throw new Error(`Unknown text key: ${key}`);
            }
            if (attribute) element.setAttribute(attribute, Text[key]);
            else element.textContent = Text[key];
        }
    }
}
