import * as layout from '../Layout/Layout.css.ts';
import { globalStyle, style } from '@vanilla-extract/css';

/** 試聴対象の選択状態を検索結果と組み合わせ行で共有する。 */
export const selected = style({});
export const row = style({
    "padding": "4px 8px",
    "margin": "4px 0",
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "background": "var(--surface)"
});
export const name = style({
    "padding": "0",
    "border": "0",
    "background": "transparent",
    "textAlign": "left",
    "cursor": "pointer"
});
globalStyle(`.${row} > .${layout.sectionHeading}`, {
    "flexWrap": "nowrap",
    "marginBottom": "0"
});
globalStyle(`.${row} .${name}`, {
    "font": "12px/1.5 Consolas, monospace",
    "color": "var(--text)",
    "flex": "1",
    "minWidth": "0",
    "overflow": "hidden",
    "textOverflow": "ellipsis",
    "whiteSpace": "nowrap"
});
globalStyle(`.${row} button:disabled`, {
    "opacity": ".45",
    "cursor": "default"
});
globalStyle(`.${row} .${name}`, {
    "minHeight": "28px"
});
globalStyle(`.${row} .${name}:hover:not(:disabled), .${row} .${name}.${selected}`, {
    "color": "var(--accent)"
});
globalStyle(`.${row}:has(.${name}:not(:disabled)):hover, .${row}:has(.${name}.${selected})`, {
    background: '#283f33',
    borderColor: 'var(--row-highlight-border, #42634d)'
});
