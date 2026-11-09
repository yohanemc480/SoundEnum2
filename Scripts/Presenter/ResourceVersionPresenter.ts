import { selectResourceVersion, validateVersions } from '../Model/Resources/ResourceVersions.ts';
import type { ResourceVersions, ResourceVersionNavigation } from '../Contracts/Services/ResourceVersions.ts';
import type { BrowserPreferencesStore } from '../Contracts/Services/BrowserPreferencesStore.ts';
import type { ResourceVersionView } from '../Contracts/Views/ResourceVersionView.ts';

/** バージョンの復元・保存・選択後の遷移を調整する。DOMやURL APIは扱わない。 */
export class ResourceVersionPresenter {
    private readonly view: ResourceVersionView;
    private readonly resources: ResourceVersions;
    private readonly preferences: BrowserPreferencesStore;
    private readonly navigation: ResourceVersionNavigation;
    private readonly unbind: () => void;
    private versions: string[] = [];
    private loading?: Promise<string>;
    private disposed = false;
    constructor(view: ResourceVersionView, resources: ResourceVersions, preferences: BrowserPreferencesStore, navigation: ResourceVersionNavigation) {
        this.view = view; this.resources = resources; this.preferences = preferences; this.navigation = navigation;
        this.unbind = view.bind(version => this.changeVersion(version));
    }
    /** 同時初期化は共有する。失敗は起動処理へ返し、次の呼び出しで再試行可能にする。 */
    load(): Promise<string> {
        if (this.disposed) return Promise.reject(new Error('Version selector disposed'));
        return this.loading ??= this.loadVersions().catch(error => { this.loading = undefined; throw error; });
    }
    /** URL指定を保存設定より優先し、不明な指定には一覧の先頭を使う。 */
    private async loadVersions(): Promise<string> {
        this.view.showLoading();
        try {
            const versions = await this.resources.load();
            if (this.disposed) throw new Error('Version selector disposed');
            validateVersions(versions);
            const selected = selectResourceVersion(versions, this.navigation.requestedVersion() ?? this.preferences.read().version);
            this.preferences.update({ version: selected }); this.versions = [...versions];
            this.view.showVersions(this.versions, selected); return selected;
        } catch (error) { if (!this.disposed) this.view.showFailure(); throw error; }
    }
    /** 一覧に存在する選択だけを保存し、画面遷移を依頼する。 */
    private changeVersion(version: string): void {
        if (this.disposed || !this.versions.includes(version)) return;
        this.preferences.update({ version }); this.navigation.navigate(version);
    }
    /** 購読と通信を解放し、遅い応答による表示や保存を防ぐ。 */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true; this.unbind(); this.resources.dispose();
    }
}
