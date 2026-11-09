import { globalStyle, style } from '@vanilla-extract/css';
export const appHeader = style({
    "maxWidth": "1600px",
    "margin": "auto",
    "padding": "28px 32px 24px",
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "space-between",
    "gap": "24px"
});
export const eyebrow = style({
    "color": "var(--muted)",
    "fontSize": "10px",
    "letterSpacing": ".18em",
    "fontWeight": "600"
});
export const appHeaderIdentity = style({
    "display": "flex",
    "alignItems": "flex-end",
    "flexWrap": "wrap",
    "gap": "12px 32px",
    "minWidth": "0"
});
export const appBrand = style({
    "minWidth": "0"
});
export const brandName = style({
    "display": "block",
    "fontSize": "clamp(22px, 3vw, 30px)",
    "lineHeight": "1.5"
});
export const appHeaderActions = style({
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "flex-end",
    "flexWrap": "wrap",
    "gap": "12px"
});
export const workspace = style({
    "maxWidth": "1600px",
    "margin": "auto",
    "padding": "0 32px 28px",
    "display": "grid",
    "gridTemplateColumns": "minmax(0, 1fr) clamp(420px, 36vw, 560px)",
    "gap": "20px"
});
export const main = style({});
export const sub = style({});
export const panel = style({
    "background": "var(--panel)",
    "border": "1px solid var(--line)",
    "borderRadius": "12px",
    "padding": "20px",
    "minWidth": "0"
});
export const sectionHeading = style({
    "display": "flex",
    "alignItems": "center",
    "justifyContent": "space-between",
    "flexWrap": "wrap",
    "gap": "8px",
    "marginBottom": "16px"
});
export const browserPanel = style({
    "flex": "1",
    "paddingBottom": "12px"
});
export const sectionNote = style({
    "color": "var(--muted)",
    "fontSize": "11px",
    "marginBottom": "14px"
});
export const compositionPanel = style({
    "display": "flex",
    "flexDirection": "column",
    "minHeight": "0"
});
export const searchList = style({
    "maxHeight": "clamp(320px, 52vh, 650px)",
    "overflowY": "auto",
    "scrollbarWidth": "thin"
});
export const versionSelector = style({
    "display": "flex",
    "alignItems": "center",
    "gap": ".5rem",
    "fontSize": ".85rem",
    "flex": "0 0 auto"
});
export const compositionToolbar = style({
    "marginBottom": "12px",
    "alignItems": "center"
});
export const compositionHeadingStatus = style({
    "display": "flex",
    "alignItems": "center",
    "gap": "8px"
});
export const compositionTitle = style({
    "display": "flex",
    "alignItems": "baseline",
    "gap": "8px"
});
export const compositionCommand = style({
    "marginTop": "12px",
    "paddingTop": "12px",
    "borderTop": "1px solid var(--line)"
});
export const compositionSaveActions = style({
    "display": "flex",
    "justifyContent": "flex-end",
    "marginTop": "8px"
});
globalStyle(`:root`, {
    "colorScheme": "dark",
    "vars": {
        "--bg": "#111617",
        "--panel": "#1b2223",
        "--surface": "#131a1b",
        "--line": "#303c3d",
        "--text": "#e6eeeb",
        "--muted": "#94a6a1",
        "--accent": "#9bdfb5"
    }
});
globalStyle(`*`, {
    "boxSizing": "border-box"
});
globalStyle(`body`, {
    "margin": "0",
    "background": "var(--bg)",
    "color": "var(--text)",
    "font": "14px/1.5 \"Segoe UI\", \"Yu Gothic UI\", sans-serif"
});
globalStyle(`h1, h2, h3, p`, {
    "margin": "0"
});
globalStyle(`h1`, {
    "fontSize": "30px",
    "letterSpacing": "-.04em",
    "fontWeight": "650"
});
globalStyle(`.${appBrand} .${eyebrow}`, {
    "display": "block",
    "color": "var(--accent)",
    "letterSpacing": ".18em"
});
globalStyle(`.${appHeader} p`, {
    "color": "var(--muted)",
    "fontSize": "13px"
});
globalStyle(`.${main}, .${sub}`, {
    "display": "flex",
    "flexDirection": "column",
    "gap": "20px",
    "minWidth": "0"
});
globalStyle(`h2`, {
    "fontSize": "14px",
    "fontWeight": "650"
});
globalStyle(`.${sectionHeading} > span`, {
    "color": "var(--muted)",
    "fontSize": "10px",
    "letterSpacing": ".05em"
});
globalStyle(`.${workspace}`, {
    "@media": {
        "(max-width: 1000px)": {
            "gridTemplateColumns": "minmax(0, 1fr)"
        }
    }
});
globalStyle(`.${sub}`, {
    "@media": {
        "(max-width: 1000px)": {
            "display": "grid",
            "gridTemplateColumns": "minmax(0, 1fr)",
            "alignItems": "start"
        }
    }
});
globalStyle(`.${compositionPanel}`, {
    "@media": {
        "(max-width: 1000px)": {
            "gridColumn": "1 / -1"
        }
    }
});
globalStyle(`.${appHeader}`, {
    "@media": {
        "(max-width: 560px)": {
            "padding": "20px 16px"
        }
    }
});
globalStyle(`.${appHeader} p`, {
    "@media": {
        "(max-width: 560px)": {
            "display": "none"
        }
    }
});
globalStyle(`.${workspace}`, {
    "@media": {
        "(max-width: 560px)": {
            "padding": "0 16px 20px",
            "gap": "16px"
        }
    }
});
globalStyle(`.${panel}`, {
    "@media": {
        "(max-width: 560px)": {
            "padding": "14px"
        }
    }
});
globalStyle(`.${main}, .${sub}`, {
    "@media": {
        "(max-width: 560px)": {
            "gap": "16px"
        }
    }
});
globalStyle(`.${sub}`, {
    "@media": {
        "(max-width: 560px)": {
            "gridTemplateColumns": "1fr"
        }
    }
});
globalStyle(`*`, {
    "@media": {
        "(prefers-reduced-motion: reduce)": {
            "transition": "none !important"
        }
    }
});
globalStyle(`[hidden]`, {
    "display": "none !important"
});
globalStyle(`.${versionSelector} > span`, {
    "flex": "0 0 auto",
    "whiteSpace": "nowrap"
});
globalStyle(`.${versionSelector} select`, {
    "flex": "0 0 auto",
    "width": "auto",
    "minWidth": "7rem",
    "maxWidth": "12rem"
});
globalStyle(`body`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "height": "100dvh",
            "display": "flex",
            "flexDirection": "column"
        }
    }
});
globalStyle(`.${appHeader}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "width": "100%",
            "margin": "0 auto",
            "flex": "0 0 auto"
        }
    }
});
globalStyle(`.${workspace}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "width": "100%",
            "margin": "0 auto",
            "flex": "1",
            "minHeight": "0",
            "gridTemplateRows": "minmax(0, 1fr)"
        }
    }
});
globalStyle(`.${main}, .${sub}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "minHeight": "0"
        }
    }
});
globalStyle(`.${browserPanel}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "display": "flex",
            "flexDirection": "column",
            "minHeight": "0",
            "overflowY": "auto"
        }
    }
});
globalStyle(`#search-panel`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "display": "flex",
            "flexDirection": "column",
            "flex": "1",
            "minHeight": "0"
        }
    }
});
globalStyle(`#search-panel > :not(.${searchList})`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flexShrink": "0"
        }
    }
});
globalStyle(`.${searchList}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flex": "1",
            "minHeight": "0",
            "maxHeight": "none"
        }
    }
});
globalStyle(`.${sub} > .${panel}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flexShrink": "0"
        }
    }
});
globalStyle(`#favorites-panel`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "display": "flex",
            "flexDirection": "column",
            "flex": "1",
            "minHeight": "0"
        }
    }
});
globalStyle(`#favorites-status`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flexShrink": "0"
        }
    }
});
globalStyle(`#composition-count`, {
    "fontSize": "12px"
});
globalStyle(`.${compositionPanel} .${sectionNote}`, {
    "marginBottom": "8px"
});
globalStyle(`#composition-list`, {
    "maxHeight": "360px",
    "scrollbarGutter": "stable",
    "overflowX": "hidden"
});
globalStyle(`.${sub} > .${compositionPanel}`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flex": "1",
            "minHeight": "0",
            "overflowY": "auto"
        }
    }
});
globalStyle(`.${compositionPanel} > :not(.${searchList})`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flexShrink": "0"
        }
    }
});
globalStyle(`#composition-list`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "minHeight": "0",
            "maxHeight": "none"
        }
    }
});
globalStyle(`#composition-status:empty`, {
    "display": "none"
});
globalStyle(`.${compositionTitle} #composition-count`, {
    "color": "var(--muted)",
    "fontSize": "12px"
});
globalStyle(`.${compositionCommand} .${sectionHeading}`, {
    "marginBottom": "8px"
});
globalStyle(`#compositions-panel:not([hidden])`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "display": "flex",
            "flexDirection": "column",
            "flex": "1",
            "minHeight": "0"
        }
    }
});
globalStyle(`#compositions-panel > :not(.${searchList})`, {
    "@media": {
        "(min-width: 1100px) and (min-height: 700px)": {
            "flexShrink": "0"
        }
    }
});
globalStyle(`.${compositionSaveActions} button:disabled`, {
    "opacity": ".45",
    "cursor": "default"
});
globalStyle(`#saved-compositions-list`, {
    "overflowX": "hidden",
    "scrollbarGutter": "stable"
});
