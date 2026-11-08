import { bindSettingsPopover } from './BindSettingsPopover.js';

bindSettingsPopover(document.querySelector('.app-settings-button'), document.getElementById('app-settings'));
bindSettingsPopover(document.getElementById('command-settings-button'), document.getElementById('command-settings'));
