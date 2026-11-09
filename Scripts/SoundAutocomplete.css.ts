import { style } from '@vanilla-extract/css';

export const list = style({
    "position": "fixed",
    "zIndex": "20",
    "padding": "5px",
    "overflowY": "auto",
    "overscrollBehavior": "contain",
    "border": "1px solid #42634d",
    "borderRadius": "8px",
    "background": "var(--panel)",
    "color": "var(--text)",
    "boxShadow": "0 8px 24px #0006",
    "scrollbarWidth": "thin"
});
export const option = style({
    "padding": "8px 10px",
    "borderRadius": "4px",
    "font": "12px/1.5 Consolas, monospace",
    "overflowWrap": "anywhere",
    "cursor": "pointer",
    "selectors": {
        "&:hover, &[aria-selected=\"true\"]": {
            "background": "#283f33",
            "color": "var(--accent)"
        }
    }
});
