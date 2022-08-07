import loadedFont from "@fontsource/roboto/files/roboto-all-700-normal.woff";
import globalState from "./global";
import shVert from "./assets/shaders/sh.vert";
import bdSample from "./assets/kick001.wav";
import shFrag from "./assets/shaders/sh.frag";
import {
  bdInterval,
  cameraZ,
  audioVolume,
  fontSize,
  logStateInterval,
  maxRadiusRatio,
  minRadiusRatio,
  setupMidiDelay,
  shaderCanvasK,
  shaderSpeed,
  showGrid,
  totalParticles
} from "./constants";
import Particle from "./particle";
import {makeBoom, setupMidi, toggleBeat} from "./midi";

/**
 * @param p {p5}
 */
export function sketch(p) {
  globalState.p = p;

  p.preload = function () {
    globalState.mainFont = p.loadFont(loadedFont)
    globalState.shader = p.loadShader(shVert, shFrag);
  }

  p.touchStarted = function() {
    const { touchRequired } = globalState;

    if (touchRequired) {
      const audioContext = p.getAudioContext();
      globalState.touchRequired = false;

      audioContext.resume().then(() => {
        // noinspection JSCheckFunctionSignatures
        globalState.bdSample = p.loadSound(bdSample);
        p.outputVolume(audioVolume);
        console.log('audio activated, loaded ', globalState.bdSample);
        toggleBeat();
      });
    }
  }

  p.setup = function () {
    const { innerWidth, innerHeight } = window;
    const radiusVal = globalState.getMinSide();
    globalState.radiusRange = [minRadiusRatio * radiusVal, maxRadiusRatio * radiusVal];
    p.createCanvas(innerWidth, innerHeight, p.WEBGL);
    p.colorMode(p.RGB, 255, 255, 255, 1);
    p.noStroke()

    const texture = p.createGraphics(innerWidth, innerHeight, p.WEBGL);
    texture.noStroke();
    globalState.shaderTexture = texture;

    const halfWidth = innerWidth / 2;
    const halfHeight = innerHeight / 2;
    p.ortho(-halfWidth, halfWidth, -halfHeight, halfHeight, 0, cameraZ);

    setTimeout(() => setupMidi(true), setupMidiDelay);
    if (logStateInterval)
      setInterval(() => globalState.log(), logStateInterval);

    globalState.log();
  };

  p.draw = function () {
    drawBg();

    const { mainFont, particles, ghostParticles, touchRequired } = globalState;
    const options = globalState.getSize();

    if (touchRequired) {
      const {halfHeight, halfWidth} = options;
      p.fill(0, 0, 0, 0.5);
      p.rect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
      p.textFont(mainFont, halfHeight / 10);
      p.fill("white");
      p.textAlign(p.CENTER, p.CENTER);
      p.text("Touch anywhere\nto start", 0, 0);
      return;
    }

    const indexes = globalState.getParticleIndexes();
    const particlesBefore = indexes.length;

    if (particlesBefore < totalParticles) {
      const newIndex = particlesBefore === 0 ? 1 : indexes[particlesBefore-1] + 1;
      const newParticle = new Particle(newIndex, options);

      indexes.push(newIndex)
      particles[newIndex] = newParticle;

      newParticle.temporaryDisallowMutate();
    }

    options.indexes = indexes;
    Object.values(particles).forEach(particle => particle.step(options));

    const keepGhost = ghostParticles.filter(ghost => ghost.step());
    if (keepGhost.length < ghostParticles.length) {
      ghostParticles.length = 0;
      ghostParticles.push(...keepGhost);
    }
  }
}

function drawBg() {
  const { halfWidth, halfHeight } = globalState.getSize();
  const { p, shaderTexture, shader, horizontalLine, verticalLine } = globalState;

  shaderTexture.shader(shader)
  shader.setUniform("u_time", p.millis() * shaderSpeed / 1000);

  let xSideRatio = 1;
  let ySideRatio = halfHeight / halfWidth;
  if (ySideRatio > 1) {
    xSideRatio = 1 / ySideRatio;
    ySideRatio = 1;
  }

  const shaderScale = [shaderCanvasK * xSideRatio, shaderCanvasK * ySideRatio]
  const rectCoords = [-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2];
  shader.setUniform("u_scale", shaderScale);
  shaderTexture.rect(...rectCoords);

  p.background(0);
  p.texture(shaderTexture);
  p.rect(...rectCoords);
  printInfo()

  if (showGrid) {
    p.strokeWeight(1);
    p.stroke(256, 256, 256);

    horizontalLine(-1 * halfHeight);
    horizontalLine(halfHeight);
    verticalLine(-1 * halfWidth);
    verticalLine(halfWidth);

    p.stroke(128, 128, 128, 0.25);
    verticalLine(0);
    horizontalLine(0);
  }
}

function printInfo() {
  let {fps, midiEnabled, p, bdSample, bdBeatInterval, mainFont, ghostParticles, particles} = globalState;
  const {width, height} = p;

  p.textFont(mainFont, fontSize);
  p.fill("white");
  p.textAlign(p.RIGHT, p.TOP);

  const currentFps = Math.round(p.frameRate());
  if (Math.abs(fps - currentFps) > 30 || (p.frameCount % currentFps) === 0)
    globalState.fps = fps = currentFps;

  let str = '';
  const ghostsCount = ghostParticles.length;
  if (ghostsCount)
    str = `${ghostsCount} ghosts | `

  str += `${Object.keys(particles).length} particles`;

  if (midiEnabled)
    str += ` | MIDI`;

  if (bdSample)
    str += ` | Audio`

  if (bdBeatInterval)
    str += ` | Beat`

  str += ` | ${fps}fps `

  p.text(str, -5 + width / 2, 5 - height / 2);
}
