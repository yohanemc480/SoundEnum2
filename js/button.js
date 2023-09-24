import { MCCommandSound , MCCommandSelector,MCCommandSoundSource} from "./sound.js";
import {SoundManager} from "./sound_manager.js";
import { HistoryManager } from "./history.js";


const Genre = Object.freeze({
  First:1,
  Second:2,
  Third:3,
  Max:3,
})

class GenreButton {
  constructor(appendTarget, displayName, linkingNode, outputArea) {
    $(document).ready(function() {
      let name;
      if (linkingNode.IsTreeEnd()) {
        name = "[📣] " + displayName;
      }
      else {
        name = displayName;
      }
      // div要素を生成して追加する
      let button = $('<div>').text(name).appendTo(appendTarget);
      button.addClass('genre-button');

      // クリックイベントを設定
      button.click(function() {
        let depth = linkingNode.GetDepth();
        GenreButtonGenerator.ClearGenreButtons(depth + 1);
        GenreButtonGenerator.ClearGenreButtons(depth + 2);
        GenreButtonGenerator.GenerateButtonsFromNodes(linkingNode.GetChildren(), outputArea);
  
        if (linkingNode.IsTreeEnd()) {
          let commandSound = new MCCommandSound(
            linkingNode.GetPath(),
            MCCommandSelector.Random,
            SoundManager.GetSource(),
            SoundManager.GetVolume(),
            SoundManager.GetPitch(),
            SoundManager.GetMinVolume()
            )
          SoundManager.Play(commandSound);
          // 出力エリアにコマンドを代入する。
          outputArea.SetText(commandSound.ToString());
          HistoryManager.Register(commandSound);
        }
      });
    });
  }
}
class GenreButtonGenerator {
  Instance = null
  constructor() {
    if (GenreButtonGenerator.Instance) {
      return GenreButtonGenerator.Instance;
    }
    GenreButtonGenerator.Instance = this;
  }
  static ClearGenreButtons(genre) {
    if (genre > Genre.Max) {
      return;
    }
    const $element = $(this.GenreToID(genre));
    $element.empty();
  }
  static GenreToID(genre) {
    switch(genre) {
      case Genre.First:
        return "#sound-genres-first";
      case Genre.Second:
        return "#sound-genres-second";
      case Genre.Third:
        return "#sound-genres-third";
      case Genre.Forth:
        return "#sound-genres-forth";
      default:
        console.log("定義されていないGenreが渡されました。");
    }
  }
  static GenerateButtonsFromNodes(nodes, outputArea) {
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      // ノードの深さを参照して
      let genre = node.GetDepth();
      if (genre > Genre.Max) {
        continue;
      }
      new GenreButton(this.GenreToID(genre), node.GetValue(), node, outputArea);
    }
  }
}

export {GenreButton, GenreButtonGenerator, Genre};