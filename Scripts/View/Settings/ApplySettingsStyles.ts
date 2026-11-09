import * as appStyles from './Settings.css.ts';
import * as sharedStyles from '../Components/SoundSettings.css.ts';

const styles = { ...sharedStyles, ...appStyles };

/** HTMLの指定を生成クラスへ置き換え、設定部品のスタイルを適用する。 */
export function applySettingsStyles(): void {
    document.querySelectorAll<HTMLElement>('[data-settings-style]').forEach(element => {
        for (const key of (element.dataset.settingsStyle ?? '').split(' ')) {
            if (!Object.hasOwn(styles, key)) throw new Error(`Unknown settings style: ${key}`);
            element.classList.add(styles[key as keyof typeof styles]);
        }
        delete element.dataset.settingsStyle;
    });
}
