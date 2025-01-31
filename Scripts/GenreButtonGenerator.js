import { GenreButton } from "./GenreButton.js";
import { Genre } from "./Constants/Genre.js";

/**
 * ジャンル選択ボタンの生成
 */
export class GenreButtonGenerator
{
    Instance = null
    constructor()
    {
        if (GenreButtonGenerator.Instance)
        {
            return GenreButtonGenerator.Instance;
        }
        GenreButtonGenerator.Instance = this;
    }

    static ClearGenreButtons(genre)
    {
        if (genre > Genre.Max)
        {
            return;
        }
        const $element = $(this.GenreToID(genre));
        $element.empty();
    }

    static RemoveClassFromGenreButtons(genre, _class)
    {
        $(this.GenreToID(genre)).find(`.${GenreButton.className}, ${_class}`).removeClass(_class);
    }

    static GenreToID(genre)
    {
        switch (genre)
        {
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

    static GenerateButtonsFromNodes(nodes, outputArea)
    {
        for (let i = 0; i < nodes.length; i++)
        {
            let node = nodes[i];
            // ノードの深さを参照して
            let genre = node.GetDepth();
            if (genre > Genre.Max)
            {
                continue;
            }
            new GenreButton(this.GenreToID(genre), node.GetValue(), node, outputArea);
        }
    }
}