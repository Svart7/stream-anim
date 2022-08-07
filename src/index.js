import p5 from 'p5';
import chroma from 'chroma-js';
import { WebMidi } from "webmidi";
import "./style.css";
import loadedFont from "@fontsource/roboto/files/roboto-all-700-normal.woff";
import sh_vert from './shaders/sh.vert'
import sh_frag from './shaders/sh.frag'

const totalParticles = 30;
const maxSpeed = 5;
const lessMaxAccel = 40000;
const maxRadius = 50;
const minRadius = 2;
const fontSize = 26;
const canvasSideMulti = 1;
const showGrid = false;
const cameraZ = 1500;
const shaderCanvasSize = 256;
let shader;
let shaderTexture;

/**
 * @param p {p5}
 */
function sketch(p) {
  let particles = {};
  let font;
  let midiEnabled = false;
  let fps = 60;
  let logAfter = Date.now() + 1000;

  class Particle {
    constructor(index, { halfWidth, halfHeight }) {
      let color = chroma.random();

      while (chroma.contrast(color, "white") < 4.5) {
        color = chroma.random();
      }

      this.color = color;
      this.index = index;

      const r = this.r = p.random(minRadius, maxRadius);
      this.x = makeInitialCoord(halfWidth - r);
      this.y = makeInitialCoord(halfHeight - r);
      this.z = p.random(index * cameraZ / totalParticles)
      this.fixRadius()
    }

    fixRadius() {
      this.fixRadiusUntil = Date.now() + 100;
    }

    touchMaxDist({ halfWidth, halfHeight }) {
      return Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight) / 2;
    }

    coordStep(dimensionName, halfSide) {
      const { r } = this;
      const dimension = this[dimensionName];
      let { speed, accel, coord } = dimension;
      const sign = Math.sign(coord);
      const maxCoord = halfSide - r - 2;
      const overMax = Math.abs(coord + speed) - maxCoord;
      const accelMaxDelta = maxCoord / lessMaxAccel * (r - minRadius);

      if (Math.abs(speed) > maxSpeed) {
        accel = -1 * Math.sign(accel) * p.random(accelMaxDelta);
        console.debug(`${this.str()} max speed reached starting decrease`);
      }

      if (Math.abs(speed) < 0.1) {
        accel += Math.sign(accel) * p.random(accelMaxDelta);
        console.debug(`${this.str()} stopped starting increase`);
      }

      if(overMax > 0) {
        let text = `${this.str()} hitting ${dimensionName}. `
        text += `with V=${speed.toFixed(1)}, a=${accel.toFixed(3)}. `
        speed = speed * -1;

        if (accel === 0) {
          accel = -1 * sign * p.random(accelMaxDelta);
        } else {
          accel *= -1.05;
        }

        coord = sign * maxCoord;
        this.fixRadius()

        console.debug(`${text} acceleration ${accel.toFixed(3)}`)
      } else {
        coord += speed;
      }

      dimension.speed = speed + accel;
      dimension.coord = coord;
      dimension.accel = accel;
      return coord;
    }

    step({ halfWidth, halfHeight, indexes }) {
      let { color, r, fixRadiusUntil, x, y, z, index } = this;
      const touchDist = this.touchMaxDist({halfHeight, halfWidth});

      if (Date.now() > fixRadiusUntil && p.random() < 0.5) {
        r = r + p.random(-0.5, 0.5);

        if (r > maxRadius)
          r = maxRadius;
        else if (r < minRadius)
          r = minRadius;

        this.r = r;
      }

      const xPos = this.coordStep('x', halfWidth);
      const yPos = this.coordStep('y', halfHeight);

      indexes.forEach((j) => {
        const {x: x2, y: y2, z: z2, color: color2} = particles[j];
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
        p.line(xPos, yPos, z, x2Pos, y2Pos, z2);
      });

      p.noStroke()
      p.fill(color.rgb())
      p.translate(xPos, yPos, z);
      p.sphere(r);
      p.translate(-1 * xPos, -1 * yPos, -z);
      p.noFill()
    }

    str() {
      const { x, y, z, color } = this;
      const coords = `(${x.coord.toFixed(0)};${y.coord.toFixed(0)};${z.toFixed(0)})`;
      const speed = `(${x.speed.toFixed(1)};${y.speed.toFixed(1)})`;
      const accel = `(${x.accel.toFixed(3)};${y.accel.toFixed(3)})`;
      return `${this.index} ${color.hex()} ${coords} V=${speed} a=${accel}`
    }
  }

  p.windowResized = function () {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  }

  p.preload = function () {
    font = p.loadFont(loadedFont)
    shader = p.loadShader(sh_vert, sh_frag);
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
    p.noStroke()

    shaderTexture = p.createGraphics(shaderCanvasSize, shaderCanvasSize, p.WEBGL);
    shaderTexture.noStroke();

    const options = makeOptions();
    for(let i = 0; i < totalParticles; i++){
      particles[i] = new Particle(i, options);
    }

    const { halfWidth, halfHeight } = options;
    p.ortho(-halfWidth, halfWidth, -halfHeight, halfHeight, 0, cameraZ);
    logState();
  };

  p.draw = function () {
    const options = drawBg();

    options.indexes.forEach(i => particles[i].step(options));
    if (Date.now() > logAfter) {
      logState(options);
      logAfter = Date.now() + 5000;
    }
  }

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
    const { halfWidth, halfHeight } = options;

    shaderTexture.shader(shader)
    shader.setUniform("time", p.millis() / 1000.0);

    shaderTexture.rect(-shaderCanvasSize / 2, -shaderCanvasSize / 2, shaderCanvasSize, shaderCanvasSize);
    p.background(255);
    p.push()
    p.texture(shaderTexture)
    p.textureWrap(p.MIRROR)
    p.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2)

    printInfo(options)
    if (showGrid) {
      p.stroke(20);
      p.strokeWeight(1);

      horizontal(options, -1 * halfHeight);
      horizontal(options, halfHeight);
      vertical(options, -1 * halfWidth);
      vertical(options, halfWidth);

      p.stroke(128, 128, 128, 0.25);
      vertical(options, 0);
      horizontal(options, 0);
    }

    printInfo(options);
    return options;
  }

  function printInfo({ indexes }) {
    p.textFont(font, fontSize);
    p.fill("blue");
    p.textAlign(p.CENTER, p.TOP);

    const currentFps = Math.round(p.frameRate());
    if (Math.abs(fps - currentFps) > 30 || (p.frameCount % currentFps) === 0)
      fps = currentFps;

    const count = `${indexes.length} particles`;
    let str = `${count} | ${fps}fps`
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
      halfWidth: Math.round(p.width * canvasSideMulti * 0.5),
      halfHeight: Math.round(p.height * canvasSideMulti * 0.5),
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
}

const div = document.createElement('div');
document.body.appendChild(div);
new p5(sketch, div);
