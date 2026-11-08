import { getWaveform } from './WaveformResource.js';

/** 表示中の短冊に事前生成した波形を描画する。 */
export class SearchWaveforms
{
    constructor(list)
    {
        this.cache = new Map();
        this.items = new Map();
        this.queue = [];
        this.visible = new Set();
        this.observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.visible.add(entry.target);
                    this.enqueue(entry.target);
                } else this.visible.delete(entry.target);
            }
        }, { root: list });
        this.resize = new ResizeObserver(entries => {
            for (const { target } of entries) {
                const peaks = this.cache.get(this.items.get(target));
                if (peaks) this.draw(target, peaks);
                else if (this.visible.has(target)) this.enqueue(target);
            }
        });
    }

    clear()
    {
        this.observer.disconnect();
        this.resize.disconnect();
        this.items.clear();
        this.visible.clear();
        this.queue = [];
    }

    observe(canvas, hash)
    {
        this.items.set(canvas, hash);
        this.observer.observe(canvas);
        this.resize.observe(canvas);
    }

    enqueue(canvas)
    {
        if (!canvas.clientWidth || this.queue.includes(canvas)) return;
        this.queue.push(canvas);
        this.run();
    }

    async run()
    {
        if (this.running) return;
        this.running = true;
        try {
            while (this.queue.length) {
                const canvas = this.queue.shift();
                if (!this.visible.has(canvas) || !canvas.isConnected || !canvas.clientWidth) continue;
                const hash = this.items.get(canvas);
                try {
                    let peaks = this.cache.get(hash);
                    if (!peaks) {
                        peaks = await getWaveform(hash);
                        this.cache.set(hash, peaks);
                        if (this.cache.size > 128) this.cache.delete(this.cache.keys().next().value);
                    }
                    if (this.items.has(canvas) && canvas.isConnected) this.draw(canvas, peaks);
                } catch {
                    // 波形を取得できなくても短冊の試聴操作は維持する。
                }
            }
        } finally { this.running = false; }
    }

    draw(canvas, peaks)
    {
        const width = canvas.clientWidth, height = canvas.clientHeight;
        if (!width || !height) return;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const context = canvas.getContext('2d');
        context.scale(ratio, ratio);
        context.fillStyle = getComputedStyle(canvas).getPropertyValue('--accent');
        const bars = Math.max(1, Math.floor(width / 3));
        for (let bar = 0; bar < bars; bar++) {
            let peak = 0;
            const start = Math.floor(bar * peaks.length / bars);
            const end = Math.max(start + 1, Math.floor((bar + 1) * peaks.length / bars));
            for (let i = start; i < end; i++) peak = Math.max(peak, peaks[i] ?? 0);
            const size = Math.max(1, peak * (height - 4));
            context.fillRect(bar * width / bars, (height - size) / 2, 2, size);
        }
    }
}
