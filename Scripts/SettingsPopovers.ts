import { applyLayoutStyles } from './View/Layout/ApplyLayoutStyles.ts';
import { applySettingsStyles } from './View/Settings/ApplySettingsStyles.ts';
import * as settingsStyles from './View/Settings/Settings.css.ts';
import { bindSettingsPopover } from './View/Components/BindSettingsPopover.ts';

applyLayoutStyles();
applySettingsStyles();
bindSettingsPopover(document.querySelector<HTMLElement>(`.${settingsStyles.appSettingsButton}`), document.getElementById('app-settings'));
bindSettingsPopover(document.getElementById('command-settings-button'), document.getElementById('command-settings'));
