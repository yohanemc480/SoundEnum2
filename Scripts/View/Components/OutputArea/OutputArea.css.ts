import { style } from '@vanilla-extract/css';

export const output = style({
    "display": "grid",
    "gridTemplateColumns": "minmax(0, 1fr) 42px",
    "overflow": "hidden",
    "position": "relative",
    "border": "1px solid #3b5748",
    "borderRadius": "7px",
    "background": "#14221b",
    ":hover": {
        "borderColor": "var(--accent)"
    }
});
export const text = style({
    "width": "100%",
    "height": "44px",
    "padding": "11px 10px 11px 14px",
    "color": "#bfe6ce",
    "font": "12px/22px Consolas, monospace",
    "overflow": "hidden",
    "cursor": "pointer",
    "selectors": {
        "#composition-output &": {
            "height": "88px",
            "overflowY": "auto",
            "scrollbarGutter": "stable",
            "scrollbarWidth": "thin",
            "scrollbarColor": "#4c6059 transparent"
        }
    }
});
export const line = style({
    "overflow": "hidden",
    "textOverflow": "ellipsis",
    "whiteSpace": "nowrap"
});
