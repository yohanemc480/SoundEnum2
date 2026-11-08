import { SoundManager } from "./Singletons/SoundManager.js";
import { createCopyButton } from "./CopyButton.js";

export class HistoryLog
{
    constructor(appendTarget, commandSound)
    {
        const row = document.createElement('div');
        row.className = 'history-log';
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'history-play';
        play.textContent = commandSound.ToString();
        play.addEventListener('click', () => SoundManager.Instance.Play(commandSound));
        row.append(play, createCopyButton(() => commandSound.ToString()));
        document.querySelector(appendTarget).append(row);
    }
}
