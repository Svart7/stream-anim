import loadedFont from "@fontsource/roboto/files/roboto-all-700-normal.woff";
import globalState from "./global";
import sh_vert from "./shaders/sh.vert";
import sh_frag from "./shaders/sh.frag";
import {
  cameraZ, canvasSideMulti,
  fontSize,
  logStateInterval, maxRadiusRatio, minRadiusRatio,
  setupMidiDelay,
  shaderCanvasK,
  shaderSpeed,
  showGrid,
  totalParticles
} from "./constants";
import Particle from "./particle";
import {setupMidi} from "./midi";

/**
 * @param p {p5}
 */
export function sketch(p) {
  globalState.p = p;

  p.preload = function () {
    globalState.mainFont = p.loadFont(loadedFont)
    globalState.shader = p.loadShader(sh_vert, sh_frag);
  }

  p.setup = function () {
    const { particles } = globalState;
    const options = globalState.getSize();
    const { innerWidth, innerHeight } = window;

    const radiusVal = globalState.getMinSide();
    globalState.radiusRange = [minRadiusRatio * radiusVal, maxRadiusRatio * radiusVal];
    p.createCanvas(innerWidth, innerHeight, p.WEBGL);
    p.colorMode(p.RGB, 255, 255, 255, 1);
    p.noStroke()

    const texture = p.createGraphics(innerWidth, innerHeight, p.WEBGL);
    texture.noStroke();
    globalState.shaderTexture = texture;

    [...Array(totalParticles).keys()]
      .map(index => new Particle(index, options))
      .forEach(particle => {
        particle.temporaryDisallowMutate();
        particles[particle.index] = particle;
      });

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
    const { particles, ghostParticles } = globalState;
    const options = globalState.getSize();

    const indexes = options.indexes = Object.keys(particles).sort();
    indexes.forEach(i => particles[i].step(options));

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
  let {fps, midiEnabled, p, mainFont, ghostParticles, particles} = globalState;
  const {width, height} = p;

  p.textFont(mainFont, fontSize);
  p.fill("white");
  p.textAlign(p.RIGHT, p.TOP);

  const currentFps = Math.round(p.frameRate());
  if (Math.abs(fps - currentFps) > 30 || (p.frameCount % currentFps) === 0)
    globalState.fps = fps = currentFps;

  let str = `${Object.keys(particles).length} particles`;
  const ghostsCount = ghostParticles.length;
  if (ghostsCount)
    str += ` | ${ghostsCount} ghosts`

  if (midiEnabled)
    str = `MIDI | ${str} `;
  str += ` | ${fps}fps`

  p.text(str, width / 2, -height / 2);
}
