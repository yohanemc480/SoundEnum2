import { copyCommand } from "./CopyCommand.js";
import { createCopyButton } from "./CopyButton.js";

export class OutputArea
{
    constructor(appendTarget, displayName)
    {
        this.value = '';
        this.text = document.createElement('div');
        this.text.className = 'output-text';
        this.text.textContent = displayName;
        this.copyButton = createCopyButton(() => this.value);
        this.copyButton.disabled = true;
        this.text.addEventListener('click', () => {
            if (!this.copyButton.disabled) copyCommand(this.value);
        });
        document.querySelector(appendTarget).append(this.text, this.copyButton);
    }

    SetText(text)
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
