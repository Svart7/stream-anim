import chroma from "chroma-js";
import {
  lessMaxAccel, maxSpeed, radiusMutatePause, radiusStepMaxDelta, showConnections,
} from "./constants";
import globalState from "./global";
import ParticleGhost from "./ghost";

export default class Particle {
  constructor(index, { halfWidth, halfHeight }) {
    const { p, radiusRange } = globalState;
    const r = p.random(radiusRange[0], radiusRange[1]);

    this.x = this.makeInitialCoord(halfWidth - r);
    this.y = this.makeInitialCoord(halfHeight - r);
    this.z = 0;
    this.r = { value: r, mutate: false };

    this.index = index;
    this.color = chroma.random();
    this.mutateTimer = null;
  }

  makeInitialCoord(maxCoord) {
    const { p } = globalState;
    let accel = 0;

    while (accel === 0)
      accel = p.random(-0.02, 0.02)

    return {
      coord: p.random(-1 * maxCoord, maxCoord),
      speed: 0,
      accel: accel,
    }
  }

  allowMutate() {
    this.mutateTimer = null;
    this.r.mutate = true;
  }

  temporaryDisallowMutate() {
    const { r, mutateTimer } = this;
    if (mutateTimer)
      clearTimeout(mutateTimer);

    r.mutate = false;
    this.mutateTimer = setTimeout(() => this.allowMutate(), radiusMutatePause);
  }

  touchMaxDist({ halfWidth, halfHeight }) {
    return Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight) / 2;
  }

  coordStep(dimensionName, halfSide) {
    const { p, radiusRange } = globalState;
    const { value: r } = this.r;
    const dimension = this[dimensionName];
    let { speed, accel, coord } = dimension;
    const sign = Math.sign(coord);
    const maxCoord = halfSide - r - 2;
    const overMax = Math.abs(coord + speed) - maxCoord;
    const accelMaxDelta = maxCoord / lessMaxAccel * (r - radiusRange[0]);
    const absSpeed = Math.abs(speed);

    if (absSpeed > maxSpeed)
      accel = -1 * Math.sign(accel) * p.random(accelMaxDelta);

    if (absSpeed < 0.1)
      accel += Math.sign(accel) * p.random(accelMaxDelta);

    if(overMax > 0) {
      if (accel === 0) {
        accel = -1 * sign * p.random(accelMaxDelta);
      } else {
        accel *= -1.05;
      }

      speed = speed * -1;
      coord = sign * maxCoord;
      this.temporaryDisallowMutate();
    } else {
      coord += speed;
    }

    dimension.speed = speed + accel;
    dimension.coord = coord;
    dimension.accel = accel;
    return coord;
  }

  step({ halfWidth, halfHeight, indexes }) {
    const {particles, p, radiusRange } = globalState;
    let { color, r, x, y, z, index } = this;
    let { value: radius, mutate } = r;

    if (mutate) {
      radius += p.random(-radiusStepMaxDelta, radiusStepMaxDelta);

      if (radius > radiusRange[1])
        radius = radiusRange[1];
      else if (radius < radiusRange[0])
        radius = radiusRange[1];

      r.value = radius;
    }

    const xPos = this.coordStep('x', halfWidth);
    const yPos = this.coordStep('y', halfHeight);

    if (showConnections) {
      const touchDist = this.touchMaxDist({halfHeight, halfWidth});

      indexes.forEach((j) => {
        if (j < index)
          return true;

        const {x: x2, y: y2, z: z2, color: color2} = particles[j];
        const {coord: x2Pos} = x2;
        const {coord: y2Pos} = y2;

        const dist = p.dist(xPos, yPos, x2Pos, y2Pos);
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
    }

    p.push();
    p.noStroke();
    p.fill(color.rgb());
    p.translate(xPos, yPos, z);
    p.sphere(radius);
    p.pop();
  }

  makeGhost() {
    return new ParticleGhost(this);
  }

  str() {
    const { x, y, z, r, color } = this;
    const coords = `(${x.coord.toFixed(0)};${y.coord.toFixed(0)};${z.toFixed(0)})`;
    const speed = `(${x.speed.toFixed(1)};${y.speed.toFixed(1)})`;
    const accel = `(${x.accel.toFixed(3)};${y.accel.toFixed(3)})`;
    return `${this.index} ${color.hex()} ${coords} r=${r.value} V=${speed} a=${accel}`
  }

  static makeGhosts() {
    const { particles, ghostParticles } = globalState;
    const ghosts = Object.values(particles).map(particle => particle.makeGhost());
    ghostParticles.push(...ghosts);
  }
}
