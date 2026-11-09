import * as styles from './Layout.css.ts';
import { toast as toastClass } from '../Components/Toast/Toast.css.ts';

/** HTMLの指定を生成クラスへ置き換え、レイアウトのスタイルを適用する。 */
export function applyLayoutStyles(): void {
    const toast = document.getElementById('toast');
    if (!toast) throw new Error('Missing toast element');
    // 初回通知より前に位置と非表示状態を確定し、中央寄せの横移動をアニメーションさせない。
    toast.classList.add(toastClass);
    document.querySelectorAll<HTMLElement>('[data-layout-style]').forEach(element => {
        for (const key of (element.dataset.layoutStyle ?? '').split(' ')) {
            if (!Object.hasOwn(styles, key)) throw new Error(`Unknown layout style: ${key}`);
            element.classList.add(styles[key as keyof typeof styles]);
        }
        delete element.dataset.layoutStyle;
    });
}
