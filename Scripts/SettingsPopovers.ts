import { bindSettingsPopover } from './BindSettingsPopover.ts';

bindSettingsPopover(document.querySelector<HTMLElement>('.app-settings-button'), document.getElementById('app-settings'));
bindSettingsPopover(document.getElementById('command-settings-button'), document.getElementById('command-settings'));
