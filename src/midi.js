import globalState from "./global";
import {WebMidi} from "webmidi";
import Particle from "./particle";
import {bdInterval, totalParticles} from "./constants";


export function setupMidi() {
  const enable = WebMidi.enable();

  enable.then(() => {
    console.debug(WebMidi.inputs.map(i => i.name));

    let inFiltered = WebMidi.inputs.find(({ name }) => {
      return name.indexOf('IAC') !== -1 && name.indexOf('1') !== -1;
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

  if (type === 'noteon' && dataBytes[0] === 36) {
    Particle.makeGhosts(Math.ceil(Math.random() * totalParticles));
  }
}

export function makeBoom() {
  const { bdSample } = globalState;
  if (bdSample)
    bdSample.play();

  Particle.makeGhosts();
}

export function toggleBeat() {
  const { bdBeatInterval } = globalState;

  if (bdBeatInterval) {
    clearInterval(bdBeatInterval);
    globalState.bdBeatInterval = null;
    console.log('beat disabled');
    return
  }

  if (bdInterval) {
    console.log(`beat enabled`);
    globalState.bdBeatInterval = setInterval(makeBoom, bdInterval);
  }
}
