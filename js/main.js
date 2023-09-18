console.log("main.jsの読み込みを始めました");
import { SoundGenreNode, SoundGenreTree} from "./genre.js";
import {MCSoundHashResource ,MCPlaysoundCommandParamResource, NetworkFileLoader} from "./resource.js";
import { GenreButton, GenreButtonGenerator} from "./button.js";
import {test} from "./test.js";
import { SoundManager } from "./sound_manager.js";

// リソースの読み込み
new MCSoundHashResource(
  await new NetworkFileLoader('../resource/1.20.1.json').FetchData()
).ParseResource();

new MCPlaysoundCommandParamResource(
  await new NetworkFileLoader('../resource/sounds.json').FetchData()
).ParseResource();

new SoundManager();
// test();

let soundNames = MCPlaysoundCommandParamResource.GetAllCommandSoundName();
let tree = new SoundGenreTree(soundNames);
let root = tree.GetRoot();

GenreButtonGenerator.GenerateButtonsFromNodes(root.GetChildren());
