import * as styles from './OutputArea.css.ts';
import { copyCommand } from "../../../CopyCommand.ts";
import { createCopyButton } from "../CopyButton/CopyButton.ts";

/** 複数行のコマンドとコピー操作を表示する共通部品。 */
export class OutputArea
{
    value: string;
    readonly text: HTMLDivElement;
    readonly copyButton: HTMLButtonElement;

    constructor(appendTarget: string)
    {
        const target = document.querySelector<HTMLElement>(appendTarget);
        if (!target) throw new Error(`Missing command output element: ${appendTarget}`);
        target.classList.add(styles.output);
        this.value = '';
        this.text = document.createElement('div');
        this.text.className = styles.text;
        this.copyButton = createCopyButton(() => this.value);
        this.copyButton.disabled = true;
        this.text.addEventListener('click', () => {
            if (!this.copyButton.disabled) copyCommand(this.value);
        });
        target.append(this.text, this.copyButton);
    }

    /** 表示とコピー対象を同時に更新し、空の場合はコピーを無効にする。 */
    SetText(text: string): void
    {
        this.value = text;
        const lines = text.split('\n');
        this.text.replaceChildren(...lines.map(line => {
            const element = document.createElement('div');
            element.className = styles.line;
            element.textContent = line;
            element.title = line;
            return element;
        }));
        this.copyButton.disabled = !text;
    }
}
