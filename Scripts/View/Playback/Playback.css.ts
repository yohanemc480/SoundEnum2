import { playing } from '../Components/PlaybackState.css.ts';
import * as layout from '../Layout/Layout.css.ts';
import { globalStyle, keyframes, style } from '@vanilla-extract/css';
const spin = keyframes({ to: { transform: 'rotate(360deg)' } });
export const transport = style({
    "display": "grid",
    "gridTemplateColumns": "40px auto minmax(0, 1fr) auto",
    "alignItems": "center",
    "gap": "8px"
});
export const indicator = style({
    "position": "relative",
    "width": "12px",
    "height": "12px"
});
export const button = style({
    "flex": "0 0 40px",
    "width": "40px",
    "height": "40px",
    "display": "grid",
    "placeItems": "center",
    "padding": "8px",
    "border": "1px solid #42634d",
    "borderRadius": "6px",
    "color": "var(--accent)",
    "background": "#283f33",
    "cursor": "pointer"
});
export const waveformContainer = style({
    "position": "relative",
    "minWidth": "0",
    "height": "36px",
    "borderRadius": "4px"
});
export const heading = style({});
export const command = style({
    "marginTop": "12px",
    "paddingTop": "12px",
    "borderTop": "1px solid var(--line)"
});
export const pauseIcon = style({});
export const playIcon = style({});
export const stopIcon = style({});
export const compositionPlayIcon = style({});
globalStyle(`#preview-loading, #composition-loading`, {
    "position": "absolute",
    "right": "0",
    "top": "50%",
    "width": "12px",
    "height": "12px",
    "marginTop": "-6px",
    "border": "2px solid var(--line)",
    "borderTopColor": "var(--accent)",
    "borderRadius": "50%",
    "animation": `${spin} .8s linear infinite`
});
globalStyle(`#preview-loading, #composition-loading`, {
    "@media": {
        "(prefers-reduced-motion: reduce)": {
            "animation": "none"
        }
    }
});
globalStyle(`.${button} svg`, {
    "width": "22px",
    "height": "22px",
    "fill": "currentColor"
});
globalStyle(`.${button}:disabled`, {
    "opacity": ".45",
    "cursor": "default"
});
globalStyle(`#preview-seek:disabled`, {
    "cursor": "default"
});
globalStyle(`#preview-time`, {
    "display": "block",
    "color": "var(--muted)",
    "font": "12px Consolas, monospace",
    "fontVariantNumeric": "tabular-nums"
});
globalStyle(`.${waveformContainer}:focus-within`, {
    "outline": "2px solid var(--accent)",
    "outlineOffset": "2px"
});
globalStyle(`#preview-waveform`, {
    "display": "block",
    "width": "100%",
    "height": "100%",
    "pointerEvents": "none"
});
globalStyle(`#preview-seek`, {
    "position": "absolute",
    "inset": "0",
    "display": "block",
    "width": "100%",
    "height": "100%",
    "minWidth": "0",
    "margin": "0",
    "padding": "0",
    "opacity": "0",
    "cursor": "pointer"
});
globalStyle(`#preview-sound-id`, {
    "flex": "1",
    "minWidth": "0",
    "overflow": "hidden",
    "textOverflow": "ellipsis",
    "whiteSpace": "nowrap",
    "font": "12px/1.5 Consolas, monospace",
    "letterSpacing": "normal"
});
globalStyle(`.${layout.sectionHeading}.${heading}`, {
    "flexWrap": "nowrap"
});
globalStyle(`.${heading} h2, .${heading} .${indicator}`, {
    "flexShrink": "0"
});
globalStyle(`#preview-status`, {
    "margin": "0",
    "color": "var(--muted)",
    "fontSize": "11px"
});
globalStyle(`#preview-status:not(:empty)`, {
    "marginTop": "6px"
});
globalStyle(`#preview-time`, {
    "justifySelf": "end",
    "textAlign": "right",
    "whiteSpace": "nowrap"
});
globalStyle(`.${command} .${layout.sectionHeading}`, {
    "alignItems": "flex-start",
    "marginBottom": "8px"
});
globalStyle(`#composition-waveform`, {
    "display": "block",
    "width": "100%",
    "minWidth": "0",
    "height": "36px",
    "borderRadius": "4px"
});
globalStyle(`#composition-time`, {
    "marginLeft": "auto",
    "color": "var(--muted)",
    "font": "12px Consolas, monospace",
    "fontVariantNumeric": "tabular-nums",
    "whiteSpace": "nowrap"
});
globalStyle(`.${transport}`, {
    "@media": {
        "(max-width: 400px)": {
            "gridTemplateColumns": "40px auto minmax(0, 1fr)"
        }
    }
});
globalStyle(`.${transport} #preview-time, .${transport} #composition-time`, {
    "@media": {
        "(max-width: 400px)": {
            "gridColumn": "1 / -1"
        }
    }
});
// HTMLのアイコンは共通の再生状態クラスで切り替える。
globalStyle(`#preview-toggle .${pauseIcon}, #preview-toggle.${playing} .${playIcon}`, { display: 'none' });
globalStyle(`#preview-toggle.${playing} .${pauseIcon}`, { display: 'block' });
globalStyle(`#composition-play .${stopIcon}, #composition-play.${playing} .${compositionPlayIcon}`, { display: 'none' });
globalStyle(`#composition-play.${playing} .${stopIcon}`, { display: 'block' });
