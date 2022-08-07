import p5 from 'p5';
import 'p5/lib/addons/p5.sound';
import "./assets/style.css";
import globalState from "./global";
import { sketch, } from "./sketch";
import {makeBoom, toggleBeat} from "./midi";

const div = document.createElement('div');
document.body.appendChild(div);
new p5(sketch, div);

const beatToggler = document.createElement('button');
beatToggler.className = 'center-bottom';
beatToggler.innerText = 'Toggle beat';
beatToggler.onclick = () => toggleBeat();
document.body.appendChild(beatToggler);


const ghosts = document.createElement('button');
ghosts.className = 'left-bottom';
ghosts.innerText = 'Boom';
ghosts.onclick = () => makeBoom();
document.body.appendChild(ghosts);


const stop = document.createElement('button');
stop.className = 'right-bottom';
stop.innerText = 'Stop / Start';
document.body.appendChild(stop);
stop.onclick = () => {
  const { p } = globalState;
  p.isLooping() ? p.noLoop() : p.loop();
}
