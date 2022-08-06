import p5 from 'p5';
import chroma from 'chroma-js';
import { WebMidi } from "webmidi";
import "./style.css";
import loadedFont from "@fontsource/roboto/files/roboto-all-700-normal.woff";
import sh_vert from './shaders/sh.vert'
import sh_frag from './shaders/sh.frag'

const totalParticles = 3;
const maxRadius = 150;
const minRadius = 50;
const fontSize = 26;
const canvasSideMulti = 0.90;
let shader;

/**
 * @param p {p5}
 */
function sketch(p) {
  let particles = {};
  let bgColor = chroma.rgb(0, 0, 0);
  let font;
  let midiEnabled = false;
  let fps = 60;
  let logAfter = Date.now() + 1000;

  function horizontal(options, y) {
    const { halfWidth } = options;
    p.line(-1 * halfWidth, y, halfWidth, y);
  }

  function vertical(options, x) {
    const { halfHeight } = options;
    p.line(x,-1 * halfHeight, x, halfHeight);
  }

  function drawBg() {
    const options = makeOptions();
    p.background(bgColor.rgb());
    printInfo(options)

    p.stroke(20);
    p.strokeWeight(1);

    const {halfWidth, halfHeight} = options;
    horizontal(options, -1 * halfHeight);
    horizontal(options, halfHeight);
    vertical(options, -1 * halfWidth);
    vertical(options, halfWidth);

    p.stroke(128, 128, 128, 0.25);
    vertical(options, 0);
    horizontal(options, 0);
    return options;
  }

  function printInfo({ indexes }) {
    p.textFont(font, fontSize);
    p.fill(10, 150, 20);
    p.textAlign(p.CENTER, p.TOP);

    const currentFps = p.frameRate();
    if (Math.abs(fps - currentFps) > 10)
      fps = currentFps;

    const fpsText = `${fps.toFixed(0)}fps`
    const count = `${indexes.length} particles`;
    let str = `${count} | ${fpsText}`
    if (midiEnabled)
      str = `MIDI | ${str}`;

    p.text(str, 0, -0.5 * p.height)
  }

  function logState({ halfWidth, halfHeight } = {}) {
    const objects = Object.values(particles);
    let title = `full: ${p.width}x${p.height} `;

    if (halfWidth && halfHeight)
      title += `inner: ${halfWidth*2}x${halfHeight*2} `;

    title += ` ${objects.length} particles`;
    console.groupCollapsed(title);
    objects.forEach((p) => {console.log(p.str())});
    console.groupEnd()
  }

  function makeOptions() {
    return {
      halfWidth: Math.ceil(p.width * canvasSideMulti * 0.5),
      halfHeight: Math.ceil(p.height * canvasSideMulti * 0.5),
      indexes: Object.keys(particles).sort(),
    }
  }

  function makeInitialCoord(maxCoord) {
    let accel = 0;

    while (accel === 0)
      accel = p.random(-0.02, 0.02)

    return {
      coord: p.random(-1 * maxCoord, maxCoord),
      speed: 0,
      accel: accel,
    }
  }

  function coordStep(particle, dimensionName, halfSide) {
    const { r } = particle;
    const dimension = particle[dimensionName];
    let { speed, accel, coord } = dimension;
    const sign = Math.sign(coord);
    const maxCoord = halfSide - r - 2;
    const overMax = Math.abs(coord + speed) - maxCoord;
    const accelMaxDelta = maxCoord / 20000 * (r - minRadius);

    if (Math.abs(speed) > 10) {
      accel = -1 * Math.sign(accel) * p.random(accelMaxDelta);
      console.debug(`${particle.str()} max speed reached starting decrease`);
    }

    if (Math.abs(speed) < 0.1) {
      accel += Math.sign(accel) * p.random(accelMaxDelta);
      console.debug(`${particle.str()} stopped starting increase`);
    }

    if(overMax > 0) {
      let text = `${particle.str()} hitting ${dimensionName}. `
      text += `with V=${speed.toFixed(1)}, a=${accel.toFixed(3)}. `
      speed = speed * -1;

      if (accel === 0) {
        accel = -1 * sign * p.random(accelMaxDelta);
      } else {
        accel *= -1.05;
      }

      coord = sign * maxCoord;
      particle.fixRadius()

      console.debug(`${text} acceleration ${accel.toFixed(3)}`)
    } else {
      coord += speed;
    }

    dimension.speed = speed + accel;
    dimension.coord = coord;
    dimension.accel = accel;
    return coord;
  }

  class Particle {
    constructor(index, { halfWidth, halfHeight }) {
      this.color = chroma.random();
      this.index = index;

      const r = this.r = p.random(minRadius, maxRadius);
      this.x = makeInitialCoord(halfWidth - r);
      this.y = makeInitialCoord(halfHeight - r);
      this.fixRadius()
    }

    fixRadius() {
      this.fixRadiusUntil = Date.now() + 100;
    }

    touchMaxDist({ halfWidth, halfHeight }) {
      return Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight) / 2;
    }

    step({ halfWidth, halfHeight, indexes }) {
      let { color, r, fixRadiusUntil, x, y, index } = this;
      const touchDist = this.touchMaxDist({halfHeight, halfWidth});

      if (Date.now() > fixRadiusUntil && p.random() < 0.5) {
        r = r + p.random(-0.5, 0.5);

        if (r > maxRadius)
          r = maxRadius;
        else if (r < minRadius)
          r = minRadius;

        this.r = r;
      }

      const xPos = coordStep(this, 'x', halfWidth);
      const yPos = coordStep(this, 'y', halfHeight);

      p.noStroke()
      p.translate(xPos, yPos);
      p.sphere(r);
      p.translate(-1 * xPos, -1 * yPos);

      indexes.forEach((j) => {
        const {x: x2, y: y2, color: color2} = particles[j];
        if (j < index)
          return true;

        const {coord: x2Pos} = x2;
        const {coord: y2Pos} = y2;

        const dist = p.dist(xPos, yPos, x2Pos, y2Pos)
        const delta = touchDist - dist;
        if(delta < 0)
          return;

        const alfa = (delta / 50);
        const mixed = chroma.mix(color, color2).alpha(alfa);
        [x, y, x2, y2].forEach(coord => coord.accel *= (1 - alfa * 0.002));

        p.stroke(...mixed.rgba());
        p.strokeWeight(alfa * 5);
        p.line(xPos, yPos, x2Pos, y2Pos);
      });
    }

    str() {
      const { x, y } = this;
      const coords = `(${x.coord.toFixed(0)};${y.coord.toFixed(0)})`;
      const speed = `(${x.speed.toFixed(1)};${y.speed.toFixed(1)})`;
      const accel = `(${x.accel.toFixed(3)};${y.accel.toFixed(3)})`;
      return `${this.index} ${coords} V=${speed} a=${accel}`
    }
  }

  p.preload = function () {
    font = p.loadFont(loadedFont)
    // shader = p.loadShader('shaders/sh.vert', 'shaders/sh.frag');
    shader = p.loadShader(sh_vert, sh_frag);
  }

  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  }

  p.setup = function () {
    const enable = WebMidi.enable();
    enable.then(() => {
      let inFiltered = WebMidi.inputs.filter(({ name }) => name.indexOf('MkIII') !== -1);
      inFiltered = inFiltered.filter(({ name }) => name.indexOf('MIDI') !== -1);

      if (inFiltered.length !== 1) {
        for(let i = 0; i< WebMidi.inputs.length; i++){
          console.log(i + " IN: " + WebMidi.inputs[i].name);
        }

        console.warn('midi not enabled', inFiltered);
      } else {
        const midiIn = inFiltered[0];
        midiIn.addListener('midimessage',
          function (e) {
            const { message, note } = e;
            const { type, dataBytes } = message;

            if (type !== 'clock') {
              console.log(`Received event ${type} ${note} ${dataBytes}`, e);
            }
          }
        );

        midiEnabled = true;
      }
	  });

    enable.catch(err => console.error(err))
    const { innerWidth, innerHeight } = window;
    p.createCanvas(innerWidth, innerHeight, p.WEBGL);
    p.colorMode(p.RGB);

    p.shader(shader)
    const options = makeOptions();
    for(let i = 0; i < totalParticles; i++){
      particles[i] = new Particle(i, options);
    }

    logState();
  };

  p.draw = function () {
    const options = drawBg();
    options.indexes.forEach(i => particles[i].step(options));

    if (Date.now() > logAfter) {
      logState(options);
      logAfter = Date.now() + 5000;
    }

    p.pointLight("white", 0, -options.halfHeight, 0);
  }
}

const div = document.createElement('div');
document.body.appendChild(div);
new p5(sketch, div);
