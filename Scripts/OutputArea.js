import { copyCommand } from "./CopyCommand.js";
import { createCopyButton } from "./CopyButton.js";

export class OutputArea
{
    constructor(appendTarget, displayName)
    {
        this.text = document.createElement('div');
        this.text.className = 'output-text';
        this.text.textContent = displayName;
        this.copyButton = createCopyButton(() => this.text.textContent);
        this.copyButton.disabled = true;
        this.text.addEventListener('click', () => {
            if (!this.copyButton.disabled) copyCommand(this.text.textContent);
        });
        document.querySelector(appendTarget).append(this.text, this.copyButton);
    }

    SetText(text)
    {
        this.text.textContent = text;
        this.copyButton.disabled = !text;
    }
}
