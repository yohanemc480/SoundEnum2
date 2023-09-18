import { SoundGenreNode, SoundGenreTree} from "./genre.js";
import {MCSoundHashResource ,MCPlaysoundCommandParamResource, NetworkFileLoader} from "./resource.js";
import { MCRawSound, MCCommandSound, MCCommandSoundSource, MCCommandSelector} from "./sound.js";
import { GenreButton, GenreButtonGenerator} from "./button.js";

function test() {

  let hoge = MCPlaysoundCommandParamResource.GetSoundParameters("entity.bee.sting");
  let hoge2 = MCPlaysoundCommandParamResource.GetSoundParameters("entity.parrot.imitate.blaze");
  let hoge3 = MCPlaysoundCommandParamResource.GetSoundParameters("entity.tadpole.flop");
  let hoge4 = MCPlaysoundCommandParamResource.GetSoundParameters("entity.blaze.ambient");
  let hoge5 = MCPlaysoundCommandParamResource.GetSoundParameters("music.creative");
  console.log(hoge);
  console.log(hoge2);
  console.log(hoge3);
  console.log(hoge4);
  console.log(hoge5);
  
  let commandSound = new MCCommandSound(
    "entity.enderman.ambient",
    MCCommandSelector.Random,
    MCCommandSoundSource.Hostile,
    3,2,1
    ).GetRawSoundRandomly();
  let link = commandSound.createLink();
  console.log(link);

  let soundNames = MCPlaysoundCommandParamResource.GetAllCommandSoundName();
  let tree = new SoundGenreTree(soundNames);
  let root = tree.GetRoot();

  GenreButtonGenerator.GenerateButtonsFromNodes(root.GetChildren());
  // GenreButtonGenerator.GenerateButtonsFromNodes(root.GetChildren()[3].GetChildren());
}

export {test};