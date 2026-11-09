import * as styles from './Playback.css.ts';

export function applyPlaybackStyles(): void {
    document.querySelectorAll<HTMLElement | SVGElement>('[data-playback-style]').forEach(element => {
        for (const key of (element.dataset.playbackStyle ?? '').split(' ')) {
            if (!Object.hasOwn(styles, key)) throw new Error(`Unknown playback style: ${key}`);
            element.classList.add(styles[key as keyof typeof styles]);
        }
        delete element.dataset.playbackStyle;
    });
}
