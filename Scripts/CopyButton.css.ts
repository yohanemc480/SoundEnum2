import { style } from '@vanilla-extract/css';

export const button = style({
    "position": "absolute",
    "top": "6px",
    "right": "6px",
    "display": "grid",
    "placeItems": "center",
    "width": "30px",
    "height": "30px",
    "padding": "6px",
    "border": "1px solid transparent",
    "borderRadius": "5px",
    "background": "transparent",
    "color": "var(--muted)",
    "cursor": "pointer",
    "selectors": {
        "&:hover:not(:disabled)": {
            "color": "var(--accent)",
            "background": "#283f33",
            "borderColor": "#42634d"
        },
        ".output > &": {
            "position": "static",
            "width": "42px",
            "height": "auto",
            "alignSelf": "stretch",
            "border": "0",
            "borderLeft": "1px solid #3b5748",
            "borderRadius": "0"
        },
        ".output > &:focus-visible": {
            "outlineOffset": "-3px"
        }
    },
    ":disabled": {
        "opacity": ".35",
        "cursor": "default"
    }
});
export const icon = style({
    "width": "16px",
    "height": "16px",
    "fill": "none",
    "stroke": "currentColor",
    "strokeWidth": "1.7",
    "strokeLinejoin": "round"
});
