import {audioVolume, canvasSideMulti,} from "./constants";

const canvasHalfSideMulti = 0.5 * canvasSideMulti;

class GlobalState {
  constructor() {
    this.touchRequired = audioVolume > 0;
    this.radiusRange = [0, 10];
    this.mainFont = undefined;
    this.shader = undefined;
    this.shaderTexture = undefined;
    this.bdSample = undefined;
    this.midiEnabled = false;
    this.bdBeatInterval = null;
    this.p = undefined;
    this.fps = 60;
    this.ghostParticles = [];
    this.particles = {};
  }

  horizontalLine(y) {
    const { p } = this;
    const halfWidth = this.getHalfSide('width');
    p.line(-1 * halfWidth, y, halfWidth, y);
  }

  verticalLine(x) {
    const { p } = this;
    const halfHeight = this.getHalfSide('height');
    p.line(x, -1 * halfHeight, x, halfHeight);
  }

  getHalfSide(sideName) {
    return Math.round(this.p[sideName] * canvasHalfSideMulti);
  }

  getMinSide() {
    const { width, height } = this.p;
    const minSide = width < height ? width : height;
    return minSide * canvasSideMulti;
  }

  getParticleIndexes() {
    const indexes = Object.values(this.particles)
      .map(particle => particle.index);
    indexes.sort((a, b) => a - b);
    return indexes;
  }

  getSize() {
    return {
      halfWidth: this.getHalfSide('width'),
      halfHeight: this.getHalfSide('height'),
    }
  }

  log() {
    const { particles, ghostParticles, p } = this;
    const { halfWidth, halfHeight } = this.getSize();
    const { width, height } = p;
    const objects = Object.values(particles);

    let title = `full: ${width}x${height} `;
    if (halfWidth && halfHeight && canvasSideMulti !== 1)
      title += `inner: ${halfWidth*2}x${halfHeight*2} `;

    title += ` ${objects.length} particles`;
    const ghostsCount = ghostParticles.length;
    if (ghostsCount)
      title += ` | ${ghostsCount} ghosts`

    console.groupCollapsed(title);
    objects.forEach((p) => {console.log(p.str())});
    if (ghostsCount)
      console.log('ghosts', ghostParticles);
    console.groupEnd()
  }
}

export default new GlobalState();
