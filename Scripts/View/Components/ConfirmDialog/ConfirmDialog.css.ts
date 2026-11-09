import { keyframes, style } from '@vanilla-extract/css';

const enter = keyframes({"from": {"opacity": 0, "transform": "translateY(-6px)"}, "to": {"opacity": 1, "transform": "none"}});
const leave = keyframes({"from": {"opacity": 1, "transform": "none"}, "to": {"opacity": 0, "transform": "translateY(-4px)"}});
const backdropEnter = keyframes({"from": {"opacity": 0}, "to": {"opacity": 1}});
const backdropLeave = keyframes({"from": {"opacity": 1}, "to": {"opacity": 0}});
export const closing = style({});
export const dialog = style({
    selectors: {
        '&[open]': { animation: `${enter} .16s ease-out both` },
        '&[open]::backdrop': { animation: `${backdropEnter} .16s ease-out both` },
        [`&.${closing}`]: { animation: `${leave} .12s ease-in both` },
        [`&.${closing}::backdrop`]: { animation: `${backdropLeave} .12s ease-in both` },
    },
    '@media': {
        '(prefers-reduced-motion: reduce)': {
            selectors: { '&[open], &[open]::backdrop': { animation: 'none' } },
        },
    },
    "width": "min(420px, calc(100vw - 32px))",
    "maxHeight": "calc(100dvh - 32px)",
    "overflowY": "auto",
    "margin": "auto",
    "padding": "24px",
    "border": "1px solid #42634d",
    "borderRadius": "12px",
    "background": "var(--panel)",
    "color": "var(--text)",
    "boxShadow": "0 16px 48px #0008",
    "::backdrop": {
        "background": "#0009"
    }
});
export const title = style({
    "marginBottom": "12px"
});
export const description = style({
    "color": "#c6d4ce",
    "overflowWrap": "anywhere",
    "whiteSpace": "pre-wrap"
});
export const actions = style({
    "display": "flex",
    "justifyContent": "flex-end",
    "flexWrap": "wrap",
    "gap": "10px",
    "marginTop": "24px"
});
export const input = style({
    "width": "100%",
    "marginTop": "12px"
});
export const accept = style({ selectors: { [`${dialog} &`]: {"background": "#283f33", "borderColor": "#42634d", "color": "var(--accent)"} } });
