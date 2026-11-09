import type { WaveformSource } from '../../Contracts/Services/PlaybackResources.ts';

/** 表示中の短冊に事前生成した波形を描画する。 */
export class SearchWaveforms
{
    rotation: Map<HTMLCanvasElement, { hashes: string[] }>;
    cache: Map<string, Float32Array>;
    items: Map<HTMLCanvasElement, string>;
    queue: HTMLCanvasElement[];
    visible: Set<HTMLCanvasElement>;
    observer: IntersectionObserver;
    resize: ResizeObserver;
    timer: ReturnType<typeof setInterval> | null = null;
    running = false;

    private readonly source: WaveformSource;
    private readonly displayed = new Map<HTMLCanvasElement, string>();
    private readonly holdUntil = new Map<HTMLCanvasElement, number>();
    private readonly holdTimers = new Map<HTMLCanvasElement, ReturnType<typeof setTimeout>>();
    private readonly fades = new Map<HTMLCanvasElement, number>();

    constructor(list: HTMLElement, source: WaveformSource)
    {
        this.source = source;
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
                if (peaks && hash !== undefined) {
                    this.cancelFade(target);
                    this.draw(target, peaks);
                    this.displayed.set(target, hash);
                }
                else if (this.visible.has(target)) this.enqueue(target);
            }
        });
    }

    /** 監視と切り替えアニメーションを解除する。 */
    unobserve(canvas: HTMLCanvasElement)
    {
        this.cancelFade(canvas);
        this.cancelHold(canvas);
        this.holdUntil.delete(canvas);
        this.displayed.delete(canvas);
        this.observer.unobserve(canvas);
        this.resize.unobserve(canvas);
        this.rotation.delete(canvas);
        this.items.delete(canvas);
        this.visible.delete(canvas);
        this.queue = this.queue.filter(item => item !== canvas);
    }

    /** 一覧の破棄時に監視・描画待ち・アニメーションをすべて解除する。 */
    clear()
    {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
        for (const canvas of this.fades.keys()) this.cancelFade(canvas);
        for (const canvas of this.holdTimers.keys()) this.cancelHold(canvas);
        this.holdUntil.clear();
        this.displayed.clear();
        this.rotation.clear();
        this.observer.disconnect();
        this.resize.disconnect();
        this.items.clear();
        this.visible.clear();
        this.queue = [];
    }

    /** 波形を監視し、非表示からの復帰・取得失敗の再試行用タイマーを開始する。 */
    observe(canvas: HTMLCanvasElement, hashes: readonly string[], hash = hashes[0]): void
    {
        this.items.set(canvas, hash);
        this.rotation.set(canvas, { hashes: [...new Set(hashes)] });
        this.timer ??= setInterval(() => this.rotate(), 500);
        this.observer.observe(canvas);
        this.resize.observe(canvas);
    }

    /** 非表示からの復帰や取得失敗後の再試行だけを定期的に確認する。 */
    rotate(): void {
        for (const canvas of this.visible) this.advance(canvas);
    }

    /** 完全表示を400ms保ってから次候補へ進む。取得中・フェード中は候補を飛ばさない。 */
    private advance(canvas: HTMLCanvasElement): void {
        if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches
            || !this.visible.has(canvas) || !canvas.isConnected || !canvas.clientWidth || this.fades.has(canvas)) return;
        const state = this.rotation.get(canvas);
        const current = this.displayed.get(canvas);
        if (!state || state.hashes.length < 2 || current === undefined || this.items.get(canvas) !== current) return;
        const remaining = (this.holdUntil.get(canvas) ?? 0) - performance.now();
        if (remaining > 0) {
            if (!this.holdTimers.has(canvas)) {
                this.holdTimers.set(canvas, setTimeout(() => {
                    this.holdTimers.delete(canvas);
                    this.advance(canvas);
                }, remaining));
            }
            return;
        }
        this.cancelHold(canvas);
        const index = state.hashes.indexOf(current);
        this.items.set(canvas, state.hashes[(index + 1) % state.hashes.length]);
        this.enqueue(canvas);
    }

    enqueue(canvas: HTMLCanvasElement): void
    {
        if (!canvas.clientWidth || this.queue.includes(canvas)) return;
        this.queue.push(canvas);
        this.run();
    }

    /** 波形を順に読み込み、現在の候補に対応する結果だけを表示する。 */
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
                        peaks = await this.source.load(hash);
                        this.cache.set(hash, peaks);
                        if (this.cache.size > 128) {
                            const oldest = this.cache.keys().next().value;
                            if (oldest !== undefined) this.cache.delete(oldest);
                        }
                    }
                    if (this.items.get(canvas) === hash && canvas.isConnected) this.show(canvas, peaks, hash);
                } catch {
                    // 現在の波形を保ち、次の定期確認で取得を再試行する。
                    const displayed = this.displayed.get(canvas);
                    if (displayed !== undefined && this.items.get(canvas) === hash) this.items.set(canvas, displayed);
                }
            }
        } finally { this.running = false; }
    }

    /** 前後の波形を同じCanvasに重ね、空白を挟まずクロスフェードする。 */
    private show(canvas: HTMLCanvasElement, peaks: Float32Array, hash: string): void {
        const previousHash = this.displayed.get(canvas);
        const previous = previousHash === undefined ? undefined : this.cache.get(previousHash);
        this.cancelFade(canvas);
        if (!previous || previousHash === hash || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.draw(canvas, peaks);
            this.displayed.set(canvas, hash);
            if (previousHash !== hash) this.holdUntil.set(canvas, performance.now() + 400);
            this.advance(canvas);
            return;
        }
        const started = performance.now();
        /** 候補が有効な間だけ、前後の波形の不透明度を相補的に変える。 */
        const frame = (now: number) => {
            if (!this.fades.has(canvas)) return;
            if (this.items.get(canvas) !== hash || !canvas.isConnected || !this.visible.has(canvas)) {
                this.cancelFade(canvas);
                return;
            }
            const progress = Math.min(1, Math.max(0, (now - started) / 400));
            this.draw(canvas, peaks, previous, progress);
            if (progress < 1) this.fades.set(canvas, requestAnimationFrame(frame));
            else {
                this.fades.delete(canvas);
                this.displayed.set(canvas, hash);
                this.holdUntil.set(canvas, now + 400);
                this.advance(canvas);
            }
        };
        this.fades.set(canvas, requestAnimationFrame(frame));
    }

    /** 完全表示期間の終了待ちを解除し、破棄後の切り替えを防ぐ。 */
    private cancelHold(canvas: HTMLCanvasElement): void {
        const timer = this.holdTimers.get(canvas);
        if (timer !== undefined) clearTimeout(timer);
        this.holdTimers.delete(canvas);
    }

    /** 途中のクロスフェードの描画予約を解除する。 */
    private cancelFade(canvas: HTMLCanvasElement): void {
        const frame = this.fades.get(canvas);
        if (frame !== undefined) cancelAnimationFrame(frame);
        this.fades.delete(canvas);
    }

    /** 現在の表示サイズに合わせて波形の棒を描画する。 */
    draw(canvas: HTMLCanvasElement, peaks: Float32Array, previous?: Float32Array, progress = 1): void
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
        if (previous && progress < 1) {
            context.globalAlpha = 1 - progress;
            this.drawBars(context, previous, width, height);
        }
        context.globalAlpha = progress;
        this.drawBars(context, peaks, width, height);
        context.globalAlpha = 1;
    }

    /** 指定された透明度で1候補分の波形を描き、重ね描きでもCanvasを消去しない。 */
    private drawBars(context: CanvasRenderingContext2D, peaks: Float32Array, width: number, height: number): void {
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
