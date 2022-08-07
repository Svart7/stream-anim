import p5 from 'p5';
import "./style.css";
import globalState from "./global";
import Particle from "./particle";
import { sketch, } from "./sketch";

const div = document.createElement('div');
document.body.appendChild(div);
new p5(sketch, div);

const stop = document.createElement('button');
stop.className = 'right-bottom';
stop.innerText = 'Stop / Start';
document.body.appendChild(stop);

const ghosts = document.createElement('button');
ghosts.className = 'left-bottom';
ghosts.innerText = 'Boom';
document.body.appendChild(ghosts);

ghosts.onclick = () => Particle.makeGhosts();
stop.onclick = function() {
  const { p } = globalState;
  p.isLooping() ? p.noLoop() : p.loop();
}
