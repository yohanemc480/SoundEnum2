import { settingsButton } from '../Components/SoundSettings.css.ts';
import { globalStyle, style } from '@vanilla-extract/css';
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
globalStyle(`.${appSettingsPopover} > button`, {
    "width": "100%",
    "textAlign": "left"
});
