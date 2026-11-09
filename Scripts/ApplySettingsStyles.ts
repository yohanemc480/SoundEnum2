import * as styles from './Settings.css.ts';

export function applySettingsStyles(): void {
    document.querySelectorAll<HTMLElement>('[data-settings-style]').forEach(element => {
        for (const key of (element.dataset.settingsStyle ?? '').split(' ')) {
            if (!Object.hasOwn(styles, key)) throw new Error(`Unknown settings style: ${key}`);
            element.classList.add(styles[key as keyof typeof styles]);
        }
        delete element.dataset.settingsStyle;
    });
}
