import { globalStyle, style } from '@vanilla-extract/css';

export const open = style({
    selectors: { '.preview-volume-control&': { width: 112 } },
});
globalStyle(`.preview-volume-control.${open} .param`, { opacity: 1, visibility: 'visible' });
export const slider = style({ flex: 1, width: '100%', minWidth: 0, margin: 0, padding: 0 });
