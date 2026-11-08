import { getWaveform } from './WaveformResource.js';

export class CompositionWaveform {
    constructor(canvas, timeOutput) {
        this.timeOutput = timeOutput;
        this.totalDuration = 0;
        this.canvas = canvas;
        this.layers = [];
        this.revision = 0;
        this.time = 0;
        this.resize = new ResizeObserver(() => this.draw());
        this.resize.observe(canvas);
    }
    async setRows(rows) {
        const revision = ++this.revision;
        this.totalDuration = Math.max(0, ...rows.map(row => row.candidate.duration / row.pitch));
        this.layers = [];
        this.draw();
        const layers = await Promise.all(rows.map(async (row, index) => {
            try {
                return { peaks: await getWaveform(row.candidate.hash),
                    duration: row.candidate.duration / row.pitch,
                    volume: row.volume * row.candidate.volume, index };
            } catch (error) { console.warn('Cannot load composition waveform', error); return null; }
        }));
        if (revision !== this.revision) return;
        this.layers = layers.filter(Boolean);
        this.draw();
    }
    play(context, start, duration) {
        this.stop();
        this.duration = duration;
        const tick = () => {
            this.time = Math.min(duration, Math.max(0, context.currentTime - start));
            this.draw();
            if (this.time < duration) this.frame = requestAnimationFrame(tick);
        };
        tick();
    }
    stop() {
        cancelAnimationFrame(this.frame);
        this.frame = null;
        this.time = 0;
        this.duration = null;
        this.draw();
    }
    draw() {
        const duration = this.duration ?? this.totalDuration;
        const format = seconds => {
            const tenths = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 10);
            return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
        };
        this.timeOutput.textContent = `${format(this.time)} / ${format(duration)}`;
        const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
        if (!width || !height) return;
        const ratio = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(width * ratio); this.canvas.height = Math.round(height * ratio);
        const ctx = this.canvas.getContext('2d');
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
