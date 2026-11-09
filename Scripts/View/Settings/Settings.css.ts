import * as layout from '../Layout/Layout.css.ts';
import * as fields from '../Components/InputFields.css.ts';
import { globalStyle, style } from '@vanilla-extract/css';
export const settingsButton = style({
    "padding": "6px 12px",
    "border": "1px solid var(--line)",
    "borderRadius": "6px",
    "color": "var(--text)",
    "background": "var(--surface)",
    "font": "inherit",
    "fontSize": "12px",
    "cursor": "pointer"
});
export const closeButton = style({});
export const settingsPopover = style({
    "position": "fixed",
    "inset": "auto",
    "margin": "0",
    "width": "min(320px, calc(100vw - 24px))",
    "maxHeight": "calc(100dvh - 24px)",
    "overflowY": "auto",
    "padding": "20px",
    "border": "1px solid #42634d",
    "borderRadius": "12px",
    "background": "var(--panel)",
    "color": "var(--text)",
    "boxShadow": "0 12px 40px #0008"
});
export const soundSettings = style({
    "width": "min(380px, calc(100vw - 24px))",
    "padding": "16px"
});
export const soundSettingsSource = style({});
export const resetSoundSettings = style({
    "display": "block",
    "margin": "12px 0 0 auto"
});
export const appSettingsButton = style({});
export const appSettingsPopover = style({});
globalStyle(`.${settingsButton}.${appSettingsButton}`, {
    "display": "grid",
    "placeItems": "center",
    "width": "36px",
    "height": "36px",
    "padding": "0"
});
globalStyle(`.${appSettingsButton} svg`, {
    "width": "20px",
    "height": "20px",
    "fill": "none",
    "stroke": "currentColor",
    "strokeWidth": "1.6",
    "strokeLinejoin": "round"
});
globalStyle(`.${settingsButton}:hover`, {
    "borderColor": "var(--accent)"
});
globalStyle(`.${settingsButton}.${closeButton}`, {
    "position": "relative",
    "flex": "0 0 28px",
    "width": "28px",
    "height": "28px",
    "padding": "0",
    "borderColor": "transparent",
    "background": "transparent",
    "color": "var(--muted)"
});
globalStyle(`.${closeButton}::before, .${closeButton}::after`, {
    "content": "\"\"",
    "position": "absolute",
    "top": "50%",
    "left": "50%",
    "width": "14px",
    "height": "1.5px",
    "borderRadius": "1px",
    "background": "currentColor",
    "transform": "translate(-50%, -50%) rotate(45deg)"
});
globalStyle(`.${closeButton}::after`, {
    "transform": "translate(-50%, -50%) rotate(-45deg)"
});
globalStyle(`.${settingsButton}.${closeButton}:hover`, {
    "background": "var(--surface)",
    "color": "var(--text)"
});
globalStyle(`.${settingsPopover} .${fields.fields}`, {
    "gridTemplateColumns": "minmax(0, 1fr)"
});
globalStyle(`.${soundSettings} .${layout.sectionHeading}`, {
    "marginBottom": "12px"
});
globalStyle(`.${soundSettings} .${fields.fields}`, {
    "gap": "10px"
});
globalStyle(`.${soundSettings} .${fields.field}`, {
    "display": "grid",
    "gridTemplateColumns": "70px minmax(0, 1fr) 64px",
    "gap": "8px"
});
globalStyle(`.${soundSettings} .${fields.label}`, {
    "fontSize": "12px"
});
globalStyle(`.${soundSettings} input[type="range"]`, {
    "width": "100%",
    "minWidth": "0"
});
globalStyle(`.${soundSettings} input:not([type="range"]), .${soundSettings} select`, {
    "height": "32px",
    "padding": "5px 8px"
});
globalStyle(`.${soundSettings} select`, {
    "paddingRight": "34px"
});
globalStyle(`.${soundSettings} .${soundSettingsSource}`, {
    "gridColumn": "2 / -1"
});
globalStyle(`.${appSettingsPopover} > button`, {
    "width": "100%",
    "textAlign": "left"
});
