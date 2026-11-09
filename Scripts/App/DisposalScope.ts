/** 作成済みの部品を逆順に解放する。途中の失敗でも残りの解放を続ける。 */
export class DisposalScope {
    private readonly callbacks: (() => void)[] = [];
    private disposed = false;
    /** 部品を登録して返す。終了後に届いた部品は即座に解放する。 */
    own<T extends { dispose(): void }>(value: T): T {
        this.defer(() => value.dispose()); return value;
    }
    /** 任意の解放処理を登録する。終了後の登録は実行したうえで拒否する。 */
    defer(callback: () => void): void {
        if (this.disposed) { callback(); throw new Error('Application disposed'); }
        this.callbacks.push(callback);
    }
    /** 非同期初期化の再開時に、既に終了していないことを確認する。 */
    throwIfDisposed(): void { if (this.disposed) throw new Error('Application disposed'); }
    /** 一度だけ逆順に解放し、失敗は全処理が終わってからまとめて返す。 */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const errors: unknown[] = [];
        for (const callback of this.callbacks.reverse()) {
            try { callback(); } catch (error) { errors.push(error); }
        }
        this.callbacks.length = 0;
        if (errors.length) throw new AggregateError(errors, 'Application cleanup failed');
    }
}
