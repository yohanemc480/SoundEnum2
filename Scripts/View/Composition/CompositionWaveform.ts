import type { CompositionWaveformLayer } from '../../Contracts/Views/CompositionView.ts';
import type { CompositionPlaybackState } from '../../Contracts/Services/CompositionPlayback.ts';

/** 取得済みの波形と再生時刻を表示する。通信やAudioContextは扱わない。 */
export class CompositionWaveform {
    private readonly canvas: HTMLCanvasElement;
    private readonly timeOutput: HTMLElement;
    private readonly resize: ResizeObserver;
    private totalDuration = 0;
    private layers: CompositionWaveformLayer[] = [];
    private time = 0;
    private duration: number | null = null;
    constructor(canvas: HTMLCanvasElement, timeOutput: HTMLElement) {
        this.canvas = canvas; this.timeOutput = timeOutput;
        this.resize = new ResizeObserver(() => this.draw()); this.resize.observe(canvas);
    }
    showLayers(layers: CompositionWaveformLayer[], duration: number): void {
        this.layers = layers; this.totalDuration = duration; this.draw();
    }
    showPlayback(state: CompositionPlaybackState): void {
        this.time = state.currentTime; this.duration = state.duration || null; this.draw();
    }
    /** Canvasのサイズ監視を解除する。 */
    dispose(): void { this.resize.disconnect(); }
    /** 取得済みの波形と時刻をCanvasへ描画する。 */
    private draw() {
        const duration = this.duration ?? this.totalDuration;
        /** 秒を小数一桁の分秒表示に変換する。 */
        const format = (seconds: number) => {
            const tenths = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 10);
            return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
        };
        this.timeOutput.textContent = `${format(this.time)} / ${format(duration)}`;
        const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
        if (!width || !height) return;
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(width * ratio); this.canvas.height = Math.round(height * ratio);
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(ratio, ratio);
        if (!duration) return;
        for (const layer of this.layers) {
            const span = width * layer.duration / duration;
            if (span <= 0) continue;
            ctx.fillStyle = `hsla(${(145 + layer.index * 67) % 360}, 65%, 70%, .5)`;
            const bars = Math.max(1, Math.floor(span / 3));
            for (let bar = 0; bar < bars; bar++) {
                let peak = 0;
                const start = Math.floor(bar * layer.peaks.length / bars);
                const end = Math.max(start + 1, Math.floor((bar + 1) * layer.peaks.length / bars));
                for (let i = start; i < end; i++) peak = Math.max(peak, layer.peaks[i] ?? 0);
                const size = Math.max(1, Math.min(1, peak * layer.volume) * (height - 4));
                ctx.fillRect(bar * span / bars, (height - size) / 2, Math.min(2, span), size);
            }
        }
        if (this.duration) {
            const x = Math.min(width - 1, width * this.time / duration);
            ctx.strokeStyle = '#e6eeeb'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
    }
}
