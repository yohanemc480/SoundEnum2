import { copyCommand } from "./CopyCommand.ts";
import { createCopyButton } from "./CopyButton.ts";

export class OutputArea
{
    value: string;
    readonly text: HTMLDivElement;
    readonly copyButton: HTMLButtonElement;

    constructor(appendTarget: string)
    {
        const target = document.querySelector<HTMLElement>(appendTarget);
        if (!target) throw new Error(`Missing command output element: ${appendTarget}`);
        this.value = '';
        this.text = document.createElement('div');
        this.text.className = 'output-text';
        this.copyButton = createCopyButton(() => this.value);
        this.copyButton.disabled = true;
        this.text.addEventListener('click', () => {
            if (!this.copyButton.disabled) copyCommand(this.value);
        });
        target.append(this.text, this.copyButton);
    }

    SetText(text: string): void
    {
        this.value = text;
        const lines = text.split('\n');
        this.text.replaceChildren(...lines.map(line => {
            const element = document.createElement('div');
            element.className = 'output-line';
            element.textContent = line;
            element.title = line;
            return element;
        }));
        this.copyButton.disabled = !text;
    }
}
