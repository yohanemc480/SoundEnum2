import * as styles from './Layout.css.ts';

/** HTMLの指定を生成クラスへ置き換え、レイアウトのスタイルを適用する。 */
export function applyLayoutStyles(): void {
    document.querySelectorAll<HTMLElement>('[data-layout-style]').forEach(element => {
        for (const key of (element.dataset.layoutStyle ?? '').split(' ')) {
            if (!Object.hasOwn(styles, key)) throw new Error(`Unknown layout style: ${key}`);
            element.classList.add(styles[key as keyof typeof styles]);
        }
        delete element.dataset.layoutStyle;
    });
}
