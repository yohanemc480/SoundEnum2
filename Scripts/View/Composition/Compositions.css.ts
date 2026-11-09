import * as layout from '../Layout/Layout.css.ts';
import * as settingsStyles from '../Components/SoundSettings.css.ts';
import { button as copyButton } from '../Components/CopyButton/CopyButton.css.ts';
import { globalStyle, style } from '@vanilla-extract/css';

export const compositionActions = style({
    "display": "flex",
    "alignItems": "center",
    "gap": "4px",
    "flexShrink": "0",
    "marginLeft": "auto",
    "whiteSpace": "nowrap"
});
export const savedComposition = style({
    "padding": "12px",
    "marginBottom": "8px",
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "background": "var(--surface)"
});
export const savedCompositionSounds = style({
    "font": "12px/1.7 Consolas, monospace",
    "color": "var(--muted)",
    "marginBottom": "8px"
});
export const savedCompositionDelete = style({});
export const savedCompositionCopy = style({
    selectors: { [`&.${copyButton}`]: { position: 'static', width: 32, height: 32, borderColor: 'var(--line)', background: 'var(--surface)' } },
    "position": "static",
    "width": "32px",
    "height": "32px",
    "borderColor": "var(--line)",
    "background": "var(--surface)"
});
export const savedCompositionLoad = style({
    "color": "var(--accent)",
    "background": "#283f33",
    "borderColor": "#42634d"
});
export const savedCompositionHeading = style({
    "display": "flex",
    "alignItems": "baseline",
    "justifyContent": "flex-end",
    "flexWrap": "wrap",
    "gap": "4px 16px",
    "minWidth": "0",
    "marginLeft": "auto",
    "color": "var(--muted)",
    "fontSize": "11px"
});
export const savedCompositionVersion = style({
    "color": "var(--muted)",
    "fontSize": "11px",
    "fontWeight": "normal",
    "whiteSpace": "nowrap"
});
export const savedCompositionTitle = style({
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "minWidth": "0"
});
export const savedCompositionEdit = style({
    "display": "grid",
    "placeItems": "center",
    "flex": "0 0 28px",
    "width": "28px",
    "height": "28px",
    "padding": "5px",
    "borderColor": "transparent",
    "color": "var(--muted)"
});

globalStyle(`.${compositionActions} > .${settingsStyles.settingsButton}:not(.${settingsStyles.closeButton})`, {
    "padding": "3px 8px",
    "minHeight": "28px"
});

globalStyle(`.${savedComposition} .${layout.sectionHeading}`, {
    "marginBottom": "8px",
    "overflowWrap": "anywhere"
});
globalStyle(`.${savedCompositionSounds} > div`, {
    "overflow": "hidden",
    "textOverflow": "ellipsis",
    "whiteSpace": "nowrap"
});
globalStyle(`.${savedComposition} > .${compositionActions}`, {
    "justifyContent": "flex-end",
    "gap": "8px"
});
globalStyle(`.${savedComposition} .${compositionActions} > .${savedCompositionDelete}`, {
    "display": "grid",
    "placeItems": "center",
    "flex": "0 0 32px",
    "width": "32px",
    "height": "32px",
    "padding": "0",
    "color": "#e69a91"
});
globalStyle(`.${savedCompositionDelete}:hover:not(:disabled)`, {
    "color": "#ffb4aa",
    "borderColor": "#a55c55",
    "background": "#3a2525"
});
globalStyle(`.${savedCompositionDelete} svg`, {
    "width": "18px",
    "height": "18px",
    "fill": "none",
    "stroke": "currentColor",
    "strokeWidth": "1.6",
    "strokeLinecap": "round",
    "strokeLinejoin": "round"
});
globalStyle(`.${savedComposition} .${settingsStyles.settingsButton}:disabled`, {
    "opacity": ".45",
    "cursor": "default"
});
globalStyle(`.${savedComposition} > .${compositionActions} > .${savedCompositionDelete}`, {
    "marginRight": "12px"
});
globalStyle(`.${savedCompositionEdit} svg`, {
    "width": "16px",
    "height": "16px",
    "fill": "none",
    "stroke": "currentColor",
    "strokeWidth": "1.6",
    "strokeLinejoin": "round"
});
