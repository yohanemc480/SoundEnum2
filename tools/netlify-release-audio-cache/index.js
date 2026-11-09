const cacheDirectory = '.cache/release-audio';

/** 圧縮済み音声と検証用マニフェストをビルド開始前に復元する。 */
export async function onPreBuild({ utils }) {
    const restored = await utils.cache.restore(cacheDirectory);
    console.log(restored ? 'Release audio cache restored.' : 'Release audio cache not found; audio will be compressed.');
}

/** 成功したビルドの圧縮キャッシュを次回のビルド用に保存する。 */
export async function onPostBuild({ utils }) {
    const saved = await utils.cache.save(cacheDirectory);
    console.log(saved ? 'Release audio cache saved.' : 'Release audio cache directory not found; nothing saved.');
}
