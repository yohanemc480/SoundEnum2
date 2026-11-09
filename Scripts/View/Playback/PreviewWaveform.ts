/** 波形ピークと進捗をCanvasへ描画する。音声要素や取得処理には依存しない。 */
export class PreviewWaveform
{
    readonly canvas: HTMLCanvasElement;
    peaks: Float32Array | null;
    progress: number;
    private readonly resize: ResizeObserver;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas; this.peaks = null; this.progress = 0;
        this.resize = new ResizeObserver(() => this.draw()); this.resize.observe(canvas);
    }
    /** 取得済みピークを表示する。nullは未取得の表示に戻す。 */
    setPeaks(peaks: Float32Array | null): void { this.peaks = peaks; this.draw(); }
    /** リサイズ監視を終了する。 */
    dispose(): void { this.resize.disconnect(); }
    /** 再生位置の割合を表示範囲に収める。 */
    setProgress(progress: number): void
    {
        this.progress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
        this.draw();
    }

    /** ピークと進捗を現在のCanvasサイズで描画する。 */
    private draw()
    {
        const canvas = this.canvas;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        const scale = window.devicePixelRatio || 1;
        if (canvas.width !== Math.round(width * scale)) canvas.width = Math.round(width * scale);
        if (canvas.height !== Math.round(height * scale)) canvas.height = Math.round(height * scale);
        const context = canvas.getContext('2d');
        if (!context) return;
        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.clearRect(0, 0, width, height);
        const colors = getComputedStyle(canvas);
        const paint = (color: string) => {
            context.fillStyle = color;
            if (!this.peaks) {
                context.fillRect(0, height / 2 - 1, width, 2);
                return;
            }
            const bars = Math.max(1, Math.floor(width / 3));
            for (let bar = 0; bar < bars; bar++) {
                let peak = 0;
                const start = Math.floor(bar * this.peaks.length / bars);
                const end = Math.max(start + 1, Math.floor((bar + 1) * this.peaks.length / bars));
                for (let i = start; i < end; i++) peak = Math.max(peak, this.peaks[i] ?? 0);
                const size = Math.max(2, peak * (height - 4));
                context.fillRect(bar * width / bars, (height - size) / 2, 2, size);
            }
        };
        paint(colors.getPropertyValue('--muted'));
        context.save();
        context.beginPath();
        context.rect(0, 0, width * this.progress, height);
        context.clip();
        paint(colors.getPropertyValue('--accent'));
        context.restore();
        context.fillStyle = colors.getPropertyValue('--accent');
        context.fillRect(Math.min(width - 1, width * this.progress), 0, 1, height);
    }
}
