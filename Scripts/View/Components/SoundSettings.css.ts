import * as layout from '../Layout/Layout.css.ts';
import * as fields from './InputFields.css.ts';
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

// 音量・ピッチと折りたたんだコマンド専用項目を、それぞれ2列で表示する。
globalStyle(`#playback-settings`, { flex: '1', minWidth: 0, width: 'auto', padding: 0 });
globalStyle(`#playback-settings .${fields.fields}`, { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px' });
globalStyle(`#playback-settings .${fields.field}`, { width: 'auto', gridTemplateColumns: 'minmax(0, 1fr) 48px', gap: '4px' });
globalStyle(`#playback-settings .${fields.label}`, { gridColumn: '1 / -1' });
// 選択欄は文字と上下の余白が収まる高さを確保し、矢印用の余白を小さくする。
globalStyle(`#playback-settings .${soundSettingsSource}`, {
    gridColumn: '1 / -1', width: '100%', height: '32px',
    padding: '4px 24px 4px 8px', fontSize: '12px', lineHeight: '20px',
    backgroundPosition: 'right 8px center',
});
globalStyle(`#playback-settings input:not([type="range"])`, { width: '48px', padding: '4px', height: '28px' });
// リセットは4項目の右下に控えめに置き、補助操作だけで大きな余白を作らない。
globalStyle(`#playback-settings .${resetSoundSettings}`, {
    margin: '2px 0 0 auto', padding: '2px 0', border: 'none',
    background: 'transparent', color: 'var(--muted)', fontSize: '11px', lineHeight: '16px',
});
globalStyle(`#playback-settings .${resetSoundSettings}:hover`, {
    color: 'var(--text)', textDecoration: 'underline',
});

export const commandDetails = style({ marginTop: '6px' });
globalStyle(`.${commandDetails} > summary`, {
    color: 'var(--muted)', fontSize: '11px', lineHeight: '20px', cursor: 'pointer',
});
globalStyle(`.${commandDetails} > summary:hover`, { color: 'var(--text)' });
globalStyle(`.${commandDetails} > summary:focus-visible`, {
    outline: '2px solid var(--accent)', outlineOffset: '2px',
});
globalStyle(`.${commandDetails}[open] > summary`, { marginBottom: '6px' });
