import * as layout from '../Layout/Layout.css.ts';
import * as settingsStyles from '../Settings/Settings.css.ts';
import * as styles from './Compositions.css.ts';
import { playing as playingClass } from '../Playback/Playback.css.ts';
import { OutputArea } from '../Components/OutputArea/OutputArea.ts';
import { SelectMasterVolumeArea } from '../Components/VolumeControl/SelectMasterVolumeArea.ts';
import { revealAddedItem } from '../Components/RevealAddedItem.ts';
import { bindSettingsPopover } from '../Components/BindSettingsPopover.ts';
import { Text } from '../../Text.ts';
import { createCommandSettingsView } from '../Settings/CommandSettingsView.ts';
import { CompositionWaveform } from './CompositionWaveform.ts';
import type { CommandSettingsView } from '../../Contracts/Views/CommandSettingsView.ts';
import type { CommandSettingsValue } from '../../Model/Command/CommandSettings.ts';
import type { CompositionView, CompositionViewActions, CompositionDisplayRow, CompositionDisplayState, CompositionWaveformLayer } from '../../Contracts/Views/CompositionView.ts';
import type { CompositionPlaybackState } from '../../Contracts/Services/CompositionPlayback.ts';

/** 組み合わせ画面の必須要素。 */
interface CompositionElements {
    waveform: HTMLCanvasElement;
    play: HTMLButtonElement;
    time: HTMLElement;
    list: HTMLElement;
    count: HTMLElement;
    status: HTMLElement;
    loading: HTMLElement;
}

/** DOM・入力欄・Canvasを所有し、操作を値でPresenterへ通知する。 */
export class HtmlCompositionView implements CompositionView {
    private actions?: CompositionViewActions;
    private readonly output = new OutputArea('#composition-output');
    private readonly waveform: CompositionWaveform;
    private readonly volumeControl: SelectMasterVolumeArea;
    private readonly selectPreview: (button: HTMLButtonElement) => void;
    private readonly lifecycle = new AbortController();
    private readonly settingsViews = new Map<number, CommandSettingsView>();
    private disposePopovers: (() => void)[] = [];
    private buildingRows = false;
    constructor(volume: number, selectPreview: (button: HTMLButtonElement) => void) {
        this.selectPreview = selectPreview;
        this.waveform = new CompositionWaveform(this.element('waveform'), this.element('time'));
        this.volumeControl = new SelectMasterVolumeArea('#composition-volume', { value: volume, onChange: value => this.actions?.volume(value) });
        this.element('play').addEventListener('click', () => this.actions?.toggle(), { signal: this.lifecycle.signal });
    }
    /** キーに対応する要素を取得し、誤ったHTML構造は初期化時に検出する。 */
    private element<K extends keyof CompositionElements>(id: K): CompositionElements[K] {
        const element = document.getElementById(`composition-${id}`);
        const expectedType = id === 'waveform' ? HTMLCanvasElement : id === 'play' ? HTMLButtonElement : HTMLElement;
        if (!(element instanceof expectedType)) throw new Error(`Missing/invalid composition element: ${id}`);
        // 上の要素種別検証を、キーごとの戻り値型へ反映する。
        return element as CompositionElements[K];
    }

    bind(actions: CompositionViewActions): () => void { this.actions = actions; return () => { this.actions = undefined; }; }
    /** 行の増減や利用可否の変更時に一覧を再構築する。 */
    showRows(rows: CompositionDisplayRow[]): void {
        this.buildingRows = true;
        const list = this.element('list');
        this.disposePopovers.forEach(dispose => dispose()); this.disposePopovers = []; this.settingsViews.clear();
        list.replaceChildren();
        rows.forEach(({ command: row, available, missing }, index) => {
            const item = document.createElement('div'); item.className = styles.compositionRow;
            const heading = document.createElement('div'); heading.className = layout.sectionHeading;
            const name = document.createElement('button'); name.type = 'button'; name.className = styles.compositionName; name.textContent = row.name; name.title = row.name;
            name.disabled = !available;
            name.addEventListener('click', () => { this.selectPreview(name); this.actions?.preview(index); });
            item.addEventListener('click', event => {
                if (event.target instanceof Element && event.target.closest(`button, .${settingsStyles.settingsPopover}`)) return;
                name.click();
            });
            const similar = document.createElement('button'); similar.type = 'button';
            similar.className = settingsStyles.settingsButton; similar.textContent = Text.searchSimilar;
            similar.setAttribute('aria-label', Text.searchSimilarTo(row.name));
            similar.disabled = name.disabled;
            similar.addEventListener('click', () => this.actions?.similar(index));
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = `${settingsStyles.settingsButton} ${settingsStyles.closeButton}`;
            remove.setAttribute('aria-label', `${Text.compositionRemove}: ${row.name}`);
            remove.addEventListener('click', () => {
                this.actions?.remove(index);
            });
            const settings = document.createElement('button'); settings.type = 'button';
            settings.className = settingsStyles.settingsButton; settings.textContent = Text.settings;
            settings.setAttribute('aria-label', `${Text.settings}: ${row.name}`);
            const panel = document.createElement('div'); panel.popover = 'auto';
            panel.className = `${settingsStyles.settingsPopover} ${settingsStyles.soundSettings}`;
            panel.setAttribute('aria-label', `${Text.settings}: ${row.name}`);
            settings.popoverTargetElement = panel;
            const actions = document.createElement('div'); actions.className = styles.compositionActions;
            actions.append(similar, settings, remove);
            heading.append(name, actions); item.append(heading);
            this.disposePopovers.push(bindSettingsPopover(settings, panel));
            if (missing) {
                const note = document.createElement('p'); note.className = layout.sectionNote; note.textContent = Text.favoritesUnavailable; item.append(note);
            }
            const settingsView = createCommandSettingsView(panel, () => this.reportValidity());
            settingsView.bind({ change: value => this.actions?.settings(index, value), reset: () => this.actions?.settings(index, {}) });
            this.settingsViews.set(index, settingsView); settingsView.show(row);
            item.append(panel); list.append(item);
        });

        this.buildingRows = false; this.reportValidity();
    }
    showSettings(index: number, settings: CommandSettingsValue): void { this.settingsViews.get(index)?.show(settings); }
    showState(state: CompositionDisplayState): void {
        this.output.SetText(state.command);
        this.element('count').textContent = Text.compositionCount(state.count);
        this.element('status').textContent = state.status === 'failure' ? Text.compositionFailure : state.status === 'empty' ? Text.compositionEmpty : state.status === 'unavailable' ? Text.compositionUnavailable : '';
        this.element('loading').hidden = !state.loading;
        const play = this.element('play'); play.disabled = !state.busy && !state.canPlay;
        play.classList.toggle(playingClass, state.busy);
        play.setAttribute('aria-label', state.busy ? Text.compositionStop : Text.compositionPlay);
        play.title = state.busy ? Text.compositionStop : Text.compositionPlay;
    }
    showPlayback(state: CompositionPlaybackState): void { this.waveform.showPlayback(state); }
    showWaveform(layers: CompositionWaveformLayer[], duration: number): void { this.waveform.showLayers(layers, duration); }
    revealAdded(): void { revealAddedItem(this.element('list')); }
    /** 入力途中の不正な数値を通知する。再生中でも停止ボタンは使用可能にする。 */
    private reportValidity(): void {
        if (this.buildingRows) return;
        const valid = [...this.element('list').querySelectorAll('input')].every(input => input.validity.valid && Number.isFinite(input.valueAsNumber));
        this.actions?.validity(valid);
    }
    /** windowへのポップオーバー購読とCanvas監視を含めて解放する。 */
    dispose(): void {
        this.lifecycle.abort(); this.actions = undefined; this.disposePopovers.forEach(dispose => dispose());
        this.volumeControl.dispose(); this.waveform.dispose(); this.settingsViews.clear(); this.element('list').replaceChildren();
    }
}
