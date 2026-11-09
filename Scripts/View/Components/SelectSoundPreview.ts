import { selected } from './SoundPreviewRow.css.ts';

/** 検索結果・候補一覧・組み合わせ行の選択を解除し、試聴対象だけを選択する。 */
export function selectSoundPreview(button: HTMLButtonElement): void {
    document.querySelectorAll(`.${selected}`).forEach(element => element.classList.remove(selected));
    button.classList.add(selected);
}
