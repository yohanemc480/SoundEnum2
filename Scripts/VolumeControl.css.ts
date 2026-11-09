import * as fields from './InputFields.css.ts';
import { globalStyle, style } from '@vanilla-extract/css';

export const control = style({
    "display": "flex",
    "alignItems": "center",
    "justifySelf": "start",
    "width": "40px",
    "maxWidth": "100%",
    "height": "40px",
    "minWidth": "0",
    "overflow": "hidden",
    "border": "1px solid #42634d",
    "borderRadius": "6px",
    "background": "#283f33",
    "transition": "width .18s ease",
    "@media": {
        "(prefers-reduced-motion: reduce)": {
            "transition": "none"
        }
    }
});

export const open = style({
    selectors: { [`${control}&`]: { width: 112 } },
});
globalStyle(`.${control}.${open} .${fields.field}`, { opacity: 1, visibility: 'visible' });
export const slider = style({ flex: 1, width: '100%', minWidth: 0, margin: 0, padding: 0 });

globalStyle(`.${control} > button`, {
    "width": "38px",
    "height": "38px",
    "flex": "0 0 38px",
    "border": "0",
    "background": "transparent"
});

globalStyle(`.${control} > button:focus-visible`, {
    "outlineOffset": "-3px"
});

globalStyle(`.${control} .${fields.field}`, {
    "display": "flex",
    "flex": "1",
    "minWidth": "0",
    "margin": "0",
    "padding": "0 8px 0 2px",
    "opacity": "0",
    "visibility": "hidden",
    "transition": "opacity .18s ease, visibility .18s",
    "@media": {
        "(prefers-reduced-motion: reduce)": {
            "transition": "none"
        }
    }
});
