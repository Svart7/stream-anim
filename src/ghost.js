import {ghostDisappearAfter, ghostRadiusRatio} from "./constants";
import globalState from "./global";
import chroma from "chroma-js";

const mixColor = chroma(255,255,255);

export default class ParticleGhost {
  /**
   * @param particle {Particle}
   */
  constructor(particle) {
    const { p } = globalState;
    const { x, y, z, r, color } = particle;
    this.x = x.coord;
    this.y = y.coord;
    this.z = z;
    this.r = r.value;
    this.startTime = p.millis();
    this.color = color;
  }

  step() {
    const { p } = globalState;
    let { startTime, r, color, x, y, z } = this;
    const timeDiff = p.millis() - startTime;
    const timeRemaining = ghostDisappearAfter - timeDiff;
    if (timeRemaining <= 0) {
      return false;
    }

    const ratio = timeRemaining / ghostDisappearAfter;
    let ghostColor = chroma.mix(color, mixColor,ratio * 0.9 + 0.1);
    ghostColor = ghostColor.alpha(ratio)

    p.push()
    p.noStroke();
    p.fill(...ghostColor.rgba());
    p.translate(x, y, z);
    p.sphere(r * ghostRadiusRatio * (1 - ratio));
    p.pop()

    return true;
  }
}
