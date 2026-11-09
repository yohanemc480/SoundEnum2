import { applyLayoutStyles } from './ApplyLayoutStyles.ts';
import { applySettingsStyles } from './ApplySettingsStyles.ts';
import * as settingsStyles from './Settings.css.ts';
import { bindSettingsPopover } from './BindSettingsPopover.ts';

applyLayoutStyles();
applySettingsStyles();
bindSettingsPopover(document.querySelector<HTMLElement>(`.${settingsStyles.appSettingsButton}`), document.getElementById('app-settings'));
bindSettingsPopover(document.getElementById('command-settings-button'), document.getElementById('command-settings'));
