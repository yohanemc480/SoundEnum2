import { SoundManager } from "./sound_manager.js";

/**
 * 再生履歴のマネージャークラス
 */
class HistoryManager {
	static Instance = null;
	latestSound = null;

	constructor() {
		if (HistoryManager.Instance) {
			return HistoryManager.Instance;
		}
		HistoryManager.Instance = this;
	}

	/**
	 * 再生履歴を登録する。
	 */
	static Register(commandSound) {
		if (this.Instance.latestSound == null || !this.Instance.latestSound.Equals(commandSound)) {
			new HistoryLog(".history", commandSound);
			this.Instance.latestSound = commandSound;
		}
	}

	/**
	 * 一番下までスクロールを進める。
	 */
	static ScrollToBottom() {
		$(document).ready(() => {
			let $container = $(".history");
			$container.scrollTop($container[0].scrollHeight);
		})
	}
}

/**
 * 再生履歴一つを表すクラス
 */
class HistoryLog {
	constructor(appendTarget, commandSound) {
		$(document).ready(() => {
			let $button = $('<div>')
				.text(commandSound.ToString())
				.appendTo(appendTarget)
				.addClass('history-log');
			this._button = $button;
			// クリック時にサウンドの再生ができるように。
			$button.click(() => {
				navigator.clipboard.writeText(commandSound.ToString());
				SoundManager.Play(commandSound);
			});
		});
	}
}

export { HistoryManager, HistoryLog };