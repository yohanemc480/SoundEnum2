import { SoundResourcePaths } from "./Constants/SoundResourcePaths.js";
import { SoundManager } from "./Singletons/SoundManager.js";
import { HistoryManager } from "./Singletons/HistoryManager.js";
import { MCCommandSound } from "./MCCommandSound.js";
import { MCCommandSelector } from "./Constants/MCCommandSelector.js";

/** 同じイベントに複数音声がある場合は、再生時間の範囲として扱う。 */
export function createDurationEntries(resource, hashes, durations)
{
    return resource.GetAllCommandSoundName().flatMap(name => {
        const sounds = resource.GetSoundParameters(name);
        const times = sounds.map(sound => {
            if (!hashes.IsSoundResourceExist(sound.name)) return NaN;
            return durations[hashes.NameToHash(sound.name)] / (sound.pitch ?? 1);
        });
        if (!times.length || times.some(time => !Number.isFinite(time) || time < 0)) return [];
        return [{ name, min: Math.min(...times), max: Math.max(...times), count: times.length }];
    });
}

export function filterDurationEntries(entries, query, min, max, descending)
{
    // 候補すべてが指定した時間範囲に収まるイベントを表示する。
    return entries.filter(row => row.name.includes(query.toLowerCase()) && row.min >= min && row.max <= max)
        .sort((a, b) => (descending ? b.max - a.max : a.min - b.min) || a.name.localeCompare(b.name));
}

export class DurationBrowser
{
    constructor(resource, hashes, outputArea)
    {
        this.entries = null;
        this.loading = false;
        this.resource = resource;
        this.hashes = hashes;
        this.outputArea = outputArea;
        this.page = 0;
        this.panel = document.querySelector('#duration-panel');
        this.status = document.querySelector('#duration-status');
        this.list = document.querySelector('#duration-list');
        this.pagination = document.querySelector('#duration-pagination');
        this.previous = document.querySelector('#duration-previous');
        this.next = document.querySelector('#duration-next');
        this.pageSelect = document.querySelector('#duration-page');
        this.panel.querySelectorAll('input, select').forEach(input => input.addEventListener('input', () => this.render()));
        this.previous.addEventListener('click', () => { this.page--; this.renderPage(); });
        this.next.addEventListener('click', () => { this.page++; this.renderPage(); });
        this.pageSelect.addEventListener('change', () => { this.page = Number(this.pageSelect.value); this.renderPage(); });
        document.querySelector('#duration-retry').addEventListener('click', () => this.load());
        const tabs = [...document.querySelectorAll('[data-browser-tab]')];
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                tabs.forEach(other => {
                    const selected = other === tab;
                    other.setAttribute('aria-selected', selected);
                    other.tabIndex = selected ? 0 : -1;
                    document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
                });
                if (tab.id === 'duration-tab') this.load();
            });
            tab.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
                tabs[next].focus(); tabs[next].click();
            });
        });
    }

    async load()
    {
        if (this.entries !== null || this.loading) return;
        this.loading = true;
        this.status.textContent = '再生時間を読み込み中…';
        document.querySelector('#duration-retry').hidden = true;
        try {
            const response = await fetch(SoundResourcePaths.Durations);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.entries = createDurationEntries(this.resource, this.hashes, await response.json());
            this.render();
        } catch (error) {
            this.status.textContent = '再生時間を読み込めませんでした。データを生成済みか確認してください。';
            document.querySelector('#duration-retry').hidden = false;
            console.error(error);
        } finally { this.loading = false; }
    }

    render()
    {
        if (this.entries === null) return;
        const minInput = document.querySelector('#duration-min');
        const maxInput = document.querySelector('#duration-max');
        const min = minInput.value === '' ? 0 : minInput.valueAsNumber;
        const max = maxInput.value === '' ? Infinity : maxInput.valueAsNumber;
        this.list.replaceChildren();
        this.pagination.hidden = true;
        if (!minInput.validity.valid || !maxInput.validity.valid || Number.isNaN(min) || Number.isNaN(max) || min > max) {
            this.status.textContent = '0以上の秒数を、最小 ≤ 最大になるように指定してください。';
            return;
        }
        this.filtered = filterDurationEntries(this.entries, document.querySelector('#duration-query').value.trim(), min, max, document.querySelector('#duration-sort').value === 'desc');
        this.page = 0;
        this.renderPage();
    }

    renderPage()
    {
        const totalPages = Math.ceil(this.filtered.length / 100);
        this.page = Math.max(0, Math.min(this.page, totalPages - 1));
        this.list.replaceChildren();
        this.list.scrollTop = 0;
        this.pageSelect.replaceChildren();
        for (let index = 0; index < totalPages; index++) {
            this.pageSelect.add(new Option(`${index + 1} / ${totalPages} ページ`, index));
        }
        this.pageSelect.value = String(this.page);
        this.previous.disabled = this.page === 0;
        this.next.disabled = this.page >= totalPages - 1;
        this.pagination.hidden = totalPages === 0;
        for (const entry of this.filtered.slice(this.page * 100, (this.page + 1) * 100)) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'duration-row';
            const name = document.createElement('span');
            name.textContent = entry.name;
            const duration = document.createElement('span');
            duration.className = 'duration-value';
            duration.textContent = Math.abs(entry.max - entry.min) < 0.001 ? `${entry.min.toFixed(3)} 秒` : `${entry.min.toFixed(3)}–${entry.max.toFixed(3)} 秒`;
            button.append(name, duration);
            button.addEventListener('click', () => {
                const manager = SoundManager.Instance;
                const command = new MCCommandSound(entry.name, manager.GetSource(), MCCommandSelector.All, manager.GetVolume(), manager.GetPitch(), manager.GetMinVolume());
                manager.Play(command);
                this.outputArea.SetText(command.ToString());
                HistoryManager.Instance.Register(command);
                HistoryManager.Instance.ScrollToBottom();
                this.list.querySelectorAll('.selected').forEach(row => row.classList.remove('selected'));
                button.classList.add('selected');
            });
            this.list.append(button);
        }
        const first = this.page * 100 + 1;
        const last = Math.min((this.page + 1) * 100, this.filtered.length);
        this.status.textContent = this.filtered.length ? `${this.filtered.length} 件中 ${first}–${last} 件` : '条件に合うサウンドはありません。';
    }
}
