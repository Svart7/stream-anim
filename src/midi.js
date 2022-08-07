import globalState from "./global";
import {WebMidi} from "webmidi";
import Particle from "./particle";


export function setupMidi() {
  const enable = WebMidi.enable();
  enable.then(() => {
    let inFiltered = WebMidi.inputs.find(({ name }) => {
      return name.indexOf('MkIII') !== -1 && name.indexOf('MIDI') !== -1;
    });

    if (inFiltered) {
      inFiltered.addListener('midimessage', captureMidi);
      globalState.midiEnabled = true;
    } else {
      for(let i = 0; i< WebMidi.inputs.length; i++){
        console.log(i + " IN: " + WebMidi.inputs[i].name);
      }

      console.warn('midi not enabled', inFiltered);
    }
  });

  enable.catch(err => console.error(err))
}

function captureMidi(e) {
  const { message } = e;
  const { type, dataBytes } = message;

  if (type === 'clock')
    return;

  console.log(`Received event ${type} ${dataBytes}`, e);

  if (type === 'noteon') {
    Particle.makeGhosts();
  }
}
