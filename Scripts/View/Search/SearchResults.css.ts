import { compositionRow, compositionName } from '../Composition/Compositions.css.ts';
import { globalStyle, style } from '@vanilla-extract/css';

export const compositionAdd = style({});
export const selected = style({});
export const searchRow = style({
    "display": "flex",
    "flexDirection": "column",
    "padding": "3px 0"
});
export const searchRowMain = style({
    "display": "flex",
    "gap": "8px",
    "alignItems": "center",
    "paddingRight": "6px",
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "background": "var(--surface)",
    "cursor": "pointer"
});
export const searchRowContent = style({
    "flex": "1",
    "minWidth": "0",
    "padding": "6px 10px"
});
export const searchRowWaveform = style({
    "width": "clamp(80px, 14vw, 180px)",
    "height": "30px",
    "flex": "0 0 auto",
    "opacity": ".65",
    "pointerEvents": "none"
});
export const searchRowHeading = style({
    "display": "flex",
    "flexWrap": "wrap",
    "alignItems": "center",
    "gap": "4px 8px"
});
export const searchPreview = style({
    "minWidth": "0",
    "textAlign": "left"
});
export const searchRowMetadata = style({
    "display": "flex",
    "flexWrap": "wrap",
    "alignItems": "center",
    "gap": "4px 8px",
    "marginTop": "3px"
});
export const searchRowBase = style({});
export const soundTagBadges = style({
    "display": "flex",
    "flexWrap": "wrap",
    "gap": "6px"
});
export const soundTagBadge = style({
    "display": "inline-block",
    "padding": "1px 7px",
    "border": "1px solid #42634d",
    "borderRadius": "999px",
    "background": "#283f33",
    "color": "var(--accent)",
    "font": "12px/1.5 \"Segoe UI\", \"Yu Gothic UI\", sans-serif"
});
export const soundTagEmpty = style({
    "color": "var(--muted)",
    "fontSize": "12px"
});
export const searchRowActions = style({
    "display": "flex",
    "gap": "5px",
    "flexShrink": "0"
});
export const soundCandidatesPopover = style({
    "position": "fixed",
    "inset": "auto",
    "margin": "0",
    "width": "min(440px, calc(100vw - 24px))",
    "maxHeight": "min(520px, calc(100dvh - 24px))",
    "overflowY": "auto",
    "overscrollBehavior": "contain",
    "padding": "16px",
    "border": "1px solid #42634d",
    "borderRadius": "12px",
    "background": "var(--panel)",
    "color": "var(--text)",
    "boxShadow": "0 12px 40px #0008"
});
export const soundTagCandidate = style({});
export const searchCandidateTrigger = style({});
export const searchSimilarity = style({
    "fontVariantNumeric": "tabular-nums",
    "whiteSpace": "pre"
});
globalStyle(`.${searchRowWaveform}`, {
    "@media": {
        "(max-width: 900px)": {
            "display": "none"
        }
    }
});
globalStyle(`.${searchPreview} span`, {
    "overflowWrap": "anywhere"
});
globalStyle(`.${searchRowMetadata} small`, {
    "opacity": ".75"
});
globalStyle(`.${searchRow} button, #search-clear, #search-retry`, {
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "background": "var(--surface)",
    "color": "var(--text)",
    "padding": "10px",
    "font": "inherit",
    "cursor": "pointer"
});
globalStyle(`.${searchRow} .${searchPreview}`, {
    "padding": "0",
    "border": "0",
    "background": "transparent"
});
globalStyle(`.${searchRow} .${searchCandidateTrigger}`, {
    "padding": "2px 6px",
    "fontSize": "12px",
    "flexShrink": "0"
});
globalStyle(`.${searchRowMain}:hover, .${searchRowMain}:has(.${searchPreview}.${selected}), .${compositionRow}:has(.${compositionName}:not(:disabled)):hover, .${compositionRow}:has(.${compositionName}.${selected})`, {
    "background": "#283f33",
    "borderColor": "var(--row-highlight-border, #42634d)"
});
globalStyle(`.${searchRowMain}.${searchRowBase}`, {
    "borderColor": "var(--accent)",
    "boxShadow": "inset 3px 0 var(--accent)",
    "vars": {
        "--row-highlight-border": "var(--accent)"
    }
});
globalStyle(`.${searchRowActions} button`, {
    "padding": "6px 10px",
    "fontSize": "12px"
});
globalStyle(`.${soundCandidatesPopover} h2`, {
    "overflowWrap": "anywhere",
    "minWidth": "0",
    "flex": "1"
});
globalStyle(`.${soundCandidatesPopover} .${soundTagCandidate}`, {
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "background": "var(--surface)",
    "color": "var(--text)",
    "padding": "10px",
    "cursor": "pointer",
    "font": "inherit",
    "display": "flex",
    "flexDirection": "column",
    "gap": "6px",
    "width": "100%",
    "marginTop": "6px",
    "textAlign": "left",
    "overflowWrap": "anywhere",
    "fontSize": "12px"
});
globalStyle(`.${soundCandidatesPopover} .${soundTagCandidate}:hover, .${soundCandidatesPopover} .${soundTagCandidate}.${selected}`, {
    "background": "#283f33",
    "borderColor": "#42634d"
});
globalStyle(`.${searchRowActions}`, {
    "@media": {
        "(max-width: 560px)": {
            "flexDirection": "column"
        }
    }
});
globalStyle(`.${searchRow} button:disabled`, {
    "opacity": ".45",
    "cursor": "default"
});
globalStyle(`.${searchRow} button[data-favorite]`, {
    "width": "34px",
    "padding": "6px",
    "fontSize": "20px",
    "lineHeight": "18px"
});
globalStyle(`.${searchRow} button[data-favorite][aria-pressed="false"]`, {
    "color": "#71827b"
});
globalStyle(`.${searchRow} button[data-favorite][aria-pressed="true"]`, {
    "color": "#f5c451"
});
globalStyle(`.${searchRow} button.${compositionAdd}`, {
    "fontSize": "20px",
    "lineHeight": "18px",
    "width": "34px",
    "padding": "6px"
});
globalStyle(`.${compositionRow} .${compositionName}:hover:not(:disabled), .${compositionRow} .${compositionName}.${selected}`, {
    "color": "var(--accent)"
});
