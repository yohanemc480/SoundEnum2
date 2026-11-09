import { DisposalScope } from './DisposalScope.ts';
import { applyLayoutStyles } from '../View/Layout/ApplyLayoutStyles.ts';
import { applySettingsStyles } from '../View/Settings/ApplySettingsStyles.ts';
import * as settingsStyles from '../View/Settings/Settings.css.ts';
import { bindSettingsPopover } from '../View/Components/BindSettingsPopover.ts';

/** 起動前の設定パネルを接続し、途中で失敗した場合も位置監視を解除する。 */
export function initializeSettingsPopovers(): () => void {
    const scope = new DisposalScope();
    try {
        applyLayoutStyles(); applySettingsStyles();
        scope.defer(bindSettingsPopover(document.querySelector<HTMLElement>(`.${settingsStyles.appSettingsButton}`), document.getElementById('app-settings')));
        return () => scope.dispose();
    } catch (error) { scope.dispose(); throw error; }
}
