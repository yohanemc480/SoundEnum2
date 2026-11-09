import * as styles from './SearchControls.css.ts';

export function applySearchStyles(): void {
    document.querySelectorAll<HTMLElement>('[data-search-style]').forEach(element => {
        for (const key of (element.dataset.searchStyle ?? '').split(' ')) {
            if (!Object.hasOwn(styles, key)) throw new Error(`Unknown search style: ${key}`);
            element.classList.add(styles[key as keyof typeof styles]);
        }
        delete element.dataset.searchStyle;
    });
}
