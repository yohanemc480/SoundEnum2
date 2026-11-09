import { getWaveform } from '../../WaveformResource.ts';

/** 表示中の短冊に事前生成した波形を描画する。 */
export class SearchWaveforms
{
    rotation: Map<HTMLCanvasElement, { hashes: string[]; next: number }>;
    cache: Map<string, Float32Array>;
    items: Map<HTMLCanvasElement, string>;
    queue: HTMLCanvasElement[];
    visible: Set<HTMLCanvasElement>;
    observer: IntersectionObserver;
    resize: ResizeObserver;
    timer: ReturnType<typeof setInterval> | null = null;
    running = false;

    constructor(list: HTMLElement)
    {
        this.rotation = new Map();
        this.cache = new Map();
        this.items = new Map();
        this.queue = [];
        this.visible = new Set();
        this.observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!(entry.target instanceof HTMLCanvasElement)) continue;
                if (entry.isIntersecting) {
                    this.visible.add(entry.target);
                    this.enqueue(entry.target);
                } else this.visible.delete(entry.target);
            }
        }, { root: list });
        this.resize = new ResizeObserver(entries => {
            for (const { target } of entries) {
                if (!(target instanceof HTMLCanvasElement)) continue;
                const hash = this.items.get(target);
                const peaks = hash === undefined ? undefined : this.cache.get(hash);
                if (peaks) this.draw(target, peaks);
                else if (this.visible.has(target)) this.enqueue(target);
            }
        });
    }

    unobserve(canvas: HTMLCanvasElement)
    {
        this.observer.unobserve(canvas);
        this.resize.unobserve(canvas);
        this.rotation.delete(canvas);
        this.items.delete(canvas);
        this.visible.delete(canvas);
        this.queue = this.queue.filter(item => item !== canvas);
    }

    clear()
    {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
        this.rotation.clear();
        this.observer.disconnect();
        this.resize.disconnect();
        this.items.clear();
        this.visible.clear();
        this.queue = [];
    }

    observe(canvas: HTMLCanvasElement, hashes: readonly string[], hash = hashes[0]): void
    {
        this.items.set(canvas, hash);
        this.rotation.set(canvas, { hashes: [...new Set(hashes)], next: Date.now() + 500 });
        this.timer ??= setInterval(() => this.rotate(), 500);
        this.observer.observe(canvas);
        this.resize.observe(canvas);
    }

    rotate()
    {
        if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (const canvas of this.visible) {
            const state = this.rotation.get(canvas);
            if (!state || state.hashes.length < 2 || !canvas.clientWidth) continue;
            if (Date.now() < state.next) continue;
            const index = state.hashes.indexOf(this.items.get(canvas) ?? '');
            this.items.set(canvas, state.hashes[(index + 1) % state.hashes.length]);
            state.next = Date.now() + 500;
            this.enqueue(canvas);
        }
    }

    enqueue(canvas: HTMLCanvasElement): void
    {
        if (!canvas.clientWidth || this.queue.includes(canvas)) return;
        this.queue.push(canvas);
        this.run();
    }

    async run(): Promise<void>
    {
        if (this.running) return;
        this.running = true;
        try {
            while (this.queue.length) {
                const canvas = this.queue.shift();
                if (!canvas) continue;
                if (!this.visible.has(canvas) || !canvas.isConnected || !canvas.clientWidth) continue;
                const hash = this.items.get(canvas);
                if (hash === undefined) continue;
                try {
                    let peaks = this.cache.get(hash);
                    if (!peaks) {
                        peaks = await getWaveform(hash);
                        this.cache.set(hash, peaks);
                        if (this.cache.size > 128) {
                            const oldest = this.cache.keys().next().value;
                            if (oldest !== undefined) this.cache.delete(oldest);
                        }
                    }
                    if (this.items.get(canvas) === hash && canvas.isConnected) this.draw(canvas, peaks);
                } catch {
                    // 波形を取得できなくても短冊の試聴操作は維持する。
                }
            }
        } finally { this.running = false; }
    }

    draw(canvas: HTMLCanvasElement, peaks: Float32Array): void
    {
        const width = canvas.clientWidth, height = canvas.clientHeight;
        if (!width || !height) return;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const context = canvas.getContext('2d');
        if (!context) return;
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
