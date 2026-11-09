import { globalStyle, style } from '@vanilla-extract/css';
export const browserHeader = style({
    "display": "flex",
    "alignItems": "flex-end",
    "justifyContent": "space-between",
    "gap": "12px",
    "marginBottom": "16px",
    "borderBottom": "2px solid var(--line)"
});
export const browserTabs = style({
    "display": "flex",
    "gap": "4px",
    "padding": "0 4px"
});
export const searchPagination = style({
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": "12px",
    "marginTop": "12px",
    "flexWrap": "wrap"
});
// 入力欄の内容によって暗黙の列が広がるのを防ぐ。
export const searchTextField = style({ gridTemplateColumns: 'minmax(0, 1fr)' });
export const searchTagsField = style({});
export const searchFilters = style({
    "display": "grid",
    "gap": "12px",
    "marginBottom": "12px",
    "gridTemplateColumns": "minmax(140px, 1fr) minmax(180px, 1fr) minmax(260px, 1.6fr)",
    "alignItems": "start"
});
export const searchTags = style({
    "display": "flex",
    "flexWrap": "wrap",
    "gap": "4px 10px",
    "minHeight": "38px",
    "alignContent": "center"
});
export const searchOptionsRow = style({
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "space-between",
    "flexWrap": "wrap",
    "gap": "8px 16px",
    "margin": "8px 0"
});
export const searchOption = style({
    "display": "flex",
    "alignItems": "center",
    "gap": "6px",
    "margin": "0",
    "fontSize": "12px"
});
export const clearableInput = style({
    "position": "relative",
    "minWidth": "0"
});
export const inputClear = style({
    "position": "absolute",
    "right": "1px",
    "top": "1px",
    "width": "36px",
    "height": "36px",
    "padding": "0",
    "border": "0",
    "borderRadius": "5px",
    "background": "transparent",
    "color": "var(--muted)",
    "cursor": "pointer"
});
globalStyle(`.${browserTabs} [role="tab"]`, {
    "position": "relative",
    "padding": "10px 19px",
    "color": "var(--muted)",
    "background": "var(--surface)",
    "border": "2px solid transparent",
    "borderRadius": "8px 8px 0 0",
    "font": "inherit",
    "cursor": "pointer",
    "transition": "color .15s, background .15s"
});
globalStyle(`.${browserTabs} [role="tab"]:hover`, {
    "color": "var(--text)",
    "background": "#22312b"
});
globalStyle(`.${browserTabs} [role="tab"][aria-selected="true"]`, {
    "marginBottom": "-2px",
    "paddingBottom": "12px",
    "color": "var(--text)",
    "background": "var(--panel)",
    "borderColor": "var(--line)",
    "borderBottomColor": "var(--panel)",
    "fontWeight": "600"
});
globalStyle(`.${browserTabs} [role="tab"]:focus-visible`, {
    "outline": "2px solid var(--accent)",
    "outlineOffset": "-5px"
});
globalStyle(`.${searchPagination} button`, {
    "padding": "9px 16px",
    "color": "var(--muted)",
    "background": "var(--surface)",
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "font": "inherit",
    "cursor": "pointer"
});
globalStyle(`.${searchTextField}, .${searchTagsField}`, {
    "minWidth": "0",
    "display": "grid",
    "gap": "6px",
    "fontSize": "12px",
    "color": "var(--muted)"
});
globalStyle(`.${searchTextField} input`, {
    "width": "100%",
    "maxWidth": "100%",
    "minWidth": "0",
    "boxSizing": "border-box"
});
globalStyle(`#search-base-preview`, {
    "marginBottom": "8px"
});
globalStyle(`.${searchPagination} button:disabled`, {
    "opacity": ".4",
    "cursor": "default"
});
globalStyle(`#search-form`, {
    "border": "0",
    "padding": "0",
    "margin": "0",
    "minWidth": "0"
});
globalStyle(`#search-form-container`, {
    "borderBottom": "1px solid var(--line)",
    "paddingBottom": "4px",
    "marginBottom": "12px"
});
globalStyle(`#search-status`, {
    "minHeight": "1.5em"
});
globalStyle(`.${searchTags} label`, {
    "display": "flex",
    "alignItems": "center",
    "minHeight": "20px",
    "lineHeight": "20px",
    "gap": "5px",
    "cursor": "pointer"
});
// テキスト入力用の高さと余白を解除し、タグ1行分の領域を小さく保つ。
globalStyle(`.${searchTags} input[type="checkbox"]`, {
    width: '14px', height: '14px', padding: 0, margin: 0, flex: '0 0 14px',
});
globalStyle(`#search-form:disabled`, {
    "opacity": ".5"
});
globalStyle(`.${searchFilters}`, {
    "@media": {
        "(max-width: 700px)": {
            "gridTemplateColumns": "minmax(0, 1fr) minmax(0, 1fr)"
        }
    }
});
globalStyle(`.${searchTagsField}`, {
    "@media": {
        "(max-width: 700px)": {
            "gridColumn": "1 / -1"
        }
    }
});
globalStyle(`.${searchOptionsRow} #search-clear`, {
    "marginLeft": "auto",
    "padding": "6px 10px"
});
globalStyle(`.${searchOption} input[type="checkbox"]`, {
    "height": "auto",
    "padding": "0",
    "flex": "0 0 auto"
});
globalStyle(`.${browserHeader}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flex": "0 0 auto"
        }
    }
});
globalStyle(`.${browserHeader}`, {
    "@media": {
        "(max-width: 560px)": {
            "flexWrap": "wrap"
        }
    }
});
globalStyle(`.${clearableInput} input:not([type="range"])`, {
    "paddingRight": "40px"
});
globalStyle(`.${clearableInput} input::-webkit-search-cancel-button`, {
    "WebkitAppearance": "none",
    "appearance": "none"
});
globalStyle(`.${inputClear}:hover`, {
    "background": "#283f33",
    "color": "var(--text)"
});
globalStyle(`.${clearableInput}:has(input:placeholder-shown) .${inputClear}`, {
    "visibility": "hidden"
});
