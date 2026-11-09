import { globalStyle, style } from '@vanilla-extract/css';

export const fields = style({
    "display": "grid",
    "gridTemplateColumns": "repeat(2, minmax(0, 1fr))",
    "gap": "16px 24px",
    "@media": {
        "(min-width: 1400px)": {
            "gridTemplateColumns": "repeat(4, minmax(0, 1fr))",
            "gap": 16
        },
        "(max-width: 560px)": {
            "gap": 14
        }
    }
});
export const field = style({
    "minWidth": "0",
    "display": "flex",
    "alignItems": "center",
    "gap": "10px",
    "flexWrap": "wrap"
});
export const label = style({
    "flex": "0 0 100%",
    "color": "var(--muted)",
    "fontSize": "12px"
});
globalStyle(`input, select`, {
    "font": "inherit",
    "color": "var(--text)"
});
globalStyle(`input:not([type="range"]), select`, {
    "minWidth": "0",
    "height": "38px",
    "padding": "8px 10px",
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "background": "var(--surface)"
});
globalStyle(`select`, {
    "width": "100%"
});
globalStyle(`select`, {
    "appearance": "none",
    "paddingRight": "34px",
    "backgroundImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='m3 4.5 3 3 3-3' fill='none' stroke='%2394a6a1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    "backgroundRepeat": "no-repeat",
    "backgroundPosition": "right 12px center",
    "backgroundSize": "12px 12px"
});
globalStyle(`.${field} input:not([type="range"])`, {
    "width": "64px",
    "textAlign": "right"
});
globalStyle(`input[type="range"]`, {
    "flex": "1",
    "width": "80px",
    "minWidth": "50px",
    "margin": "0",
    "accentColor": "var(--accent)",
    "cursor": "pointer"
});
globalStyle(`input:focus-visible, select:focus-visible, button:focus-visible`, {
    "outline": "2px solid var(--accent)",
    "outlineOffset": "3px"
});
