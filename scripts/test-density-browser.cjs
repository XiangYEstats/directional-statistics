"use strict";

// Numerical and minimal-DOM unit tests; this does not launch or simulate a
// graphical browser. Run from any directory with Node and the project's venv.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const project = path.resolve(__dirname, "..");
const math = require(path.join(project, "static/js/density-math.js"));
const mathSource = fs.readFileSync(path.join(project, "static/js/density-math.js"), "utf8");
const uiSource = fs.readFileSync(path.join(project, "static/js/density-plots.js"), "utf8");
const template = fs.readFileSync(path.join(project, "templates/_density_lab.html"), "utf8");
const TAU = 2 * Math.PI;

const reference = JSON.parse(execFileSync(path.join(project, ".venv/bin/python"), ["-c", `
import json, math, random
from density_math import density_settings, log_bessel_i0_scaled, log_vm_density, log_lavm_density
from density_diagrams import density_panels
cases = []
for kind, fn, locations in (("vm", log_vm_density, [-math.pi, -1.1, 0, 2.3, math.pi]),
                            ("lavm", log_lavm_density, [-4, -1.05, 0, 1.05, 4])):
    for kappa in [0, 0.1, 1, 2, 10, 50, 100, 1e6]:
        scaled = log_bessel_i0_scaled(kappa)
        for location in locations:
            for x in [-math.pi, -math.pi+1e-8, -2.1, 0, 0.7, math.pi-1e-8, math.pi]:
                cases.append([kind, x, location, kappa, scaled, fn(x, location, kappa, scaled)])
rng = random.Random(20260906)
intermediate = [1e-9, 0.05, 0.10001, 0.99999, 1.00001, 49.99999, 50.00001, 99.99999]
intermediate += [rng.uniform(0, 100) for _ in range(128)]
print(json.dumps({"settings": density_settings(), "cases": cases,
                  "intermediate": [[k, log_bessel_i0_scaled(k)] for k in intermediate],
                  "panels": density_panels()}, allow_nan=False))
`], { cwd: project, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }));
const settings = reference.settings;

function close(actual, expected, tolerance = 2e-12, message = "") {
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${message}: ${actual} differs from ${expected} by more than ${tolerance}`);
}

// Python and JavaScript use the same log-normalizer but independent arithmetic.
for (const [kind, x, location, kappa, scaled, expected] of reference.cases) {
  const actual = (kind === "vm" ? math.logVM : math.logLAvM)(x, location, kappa, scaled);
  close(actual, expected, kappa > 100 ? 2e-9 : 3e-13, `${kind}, x=${x}, location=${location}, kappa=${kappa}`);
}
for (let index = 0; index <= 1000; index++) {
  close(math.logScaledAt(index / 10, settings), settings.log_bessel_scaled[index], 0);
}
for (const [kappa, expected] of reference.intermediate) {
  close(math.logScaledAt(kappa, settings), expected, 2e-13, `interpolated parameter kappa=${kappa}`);
}

// Integrate true density values (not normalized plot samples) over the circle.
const integrationCount = 16384;
const integrationWidth = TAU / integrationCount;
for (const kind of ["vm", "lavm"]) {
  const density = kind === "vm" ? math.logVM : math.logLAvM;
  const locations = kind === "vm" ? [-Math.PI, 0, 1.3, Math.PI] : [-4, -1, 0, 1, 4];
  for (const kappa of [0, 0.05, 0.1, 0.912345, 1, 10, 49.99999, 50.00001, 83.48293, 100]) {
    const scaled = math.logScaledAt(kappa, settings);
    for (const location of locations) {
      let sum = 0;
      for (let index = 0; index < integrationCount; index++) {
        sum += Math.exp(density(-Math.PI + (index + 0.5) * integrationWidth, location, kappa, scaled));
      }
      close(sum * integrationWidth, 1, 2e-11, `${kind} integrates to one, ${location}, ${kappa}`);
    }
  }
}

for (const kappa of [0, 0.1, 2, 100]) {
  const scaled = math.logScaledAt(kappa, settings);
  for (const x of [-Math.PI, -2, 0, 0.7, Math.PI]) {
    close(math.logLAvM(x, 0, kappa, scaled), math.logVM(x, 0, kappa, scaled), 2e-13, "eta zero identity");
    for (const eta of [-4, 0, 4]) {
      close(math.logLAvM(-x, -eta, kappa, scaled), math.logLAvM(x, eta, kappa, scaled), 2e-13, "reflection");
    }
  }
  for (const eta of [-4, 0, 4]) {
    close(math.logLAvM(-Math.PI, eta, kappa, scaled), math.logLAvM(Math.PI, eta, kappa, scaled), 0, "exact seam");
  }
  for (const mu of [-Math.PI, 0, Math.PI]) {
    close(math.logVM(-Math.PI, mu, kappa, scaled), math.logVM(Math.PI, mu, kappa, scaled), 2e-13, "VM seam");
  }
}
close(math.logVM(0, 1, 0, 0), -Math.log(TAU), 0);
assert.notEqual(math.logLAvM(0, 2, 0, 0), math.logLAvM(Math.PI, 2, 0, 0));

function pathPairs(value) {
  return [...value.matchAll(/([ML])(-?\d+\.\d+|-?\d+),(-?\d+\.\d+|-?\d+)/g)]
    .map(([, command, x, y]) => [command, +x, +y]);
}

function checkPaths(paths) {
  assert.match(paths.polarArea, /M185,280 A95,95 0 1,0 375,280 A95,95 0 1,0 185,280 Z$/,
    "Polar fill must explicitly exclude the entire zero-density circle.");
  for (const [name, value] of Object.entries(paths)) {
    assert.equal(typeof value, "string");
    assert.match(value, /^M/);
    assert.doesNotMatch(value, /NaN|Infinity|undefined/);
    const pairs = pathPairs(value);
    assert.ok(pairs.length >= 1441);
    for (const [, x, y] of pairs) {
      if (name === "polar" || name === "polarArea") {
        const radius = Math.hypot(x - 280, y - 280);
        assert.ok(radius >= 95 - 0.001 && radius <= 220 + 0.001,
          `${name} must lie outside the zero-density circle, never at the origin: r=${radius}`);
      } else {
        assert.ok(+x >= 50 - 0.001 && +x <= 530 + 0.001);
        assert.ok(+y >= 25 - 0.001 && +y <= 135 + 0.001);
      }
    }
  }
}

// Build-time Python and interactive JavaScript geometry must agree. Compare
// rounded SVG coordinates without assuming identical floating-point duplicate
// removal at wrapped sample angles.
for (const panel of reference.panels) {
  const sampled = math.sample(panel.kind, panel.location, panel.kappa, settings);
  const client = math.paths(sampled.points, sampled.scale);
  const server = {polar: panel.polar, polarArea: panel.polar_area, linear: panel.line, area: panel.area};
  checkPaths(server);
  assert.equal(panel.scale, Number(sampled.scale.toPrecision(3)).toString());
  for (const name of ["polar", "linear"]) {
    const clientPoints = pathPairs(client[name]);
    for (const [, x, y] of pathPairs(server[name])) {
      assert.ok(clientPoints.some(([, cx, cy]) => Math.hypot(cx - x, cy - y) <= 0.0015),
        `Python/JavaScript ${panel.kind} ${name} geometry mismatch at ${x},${y}`);
    }
  }
}

// Zero density lives on the model circle. All angles follow the usual
// mathematical convention: zero right, pi/2 top, +/-pi left, -pi/2 bottom.
const cardinalAngles = [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI];
for (const density of [0, 0.5, 1]) {
  const actual = pathPairs(math.paths(cardinalAngles.map(angle => [angle, density]), 1).polar);
  const radius = 95 + 125 * density;
  const expected = [[280 - radius, 280], [280, 280 + radius], [280 + radius, 280],
    [280, 280 - radius], [280 - radius, 280]];
  actual.forEach(([, x, y], i) => {
    close(x, expected[i][0], 0.00051, "cardinal x");
    close(y, expected[i][1], 0.00051, "cardinal y");
  });
  const linear = pathPairs(math.paths(cardinalAngles.map(angle => [angle, density]), 1).linear);
  linear.forEach(([, x, y], i) => {
    close(x, 50 + 120 * i, 0.00051, "unwrapped radian x");
    close(y, 135 - 110 * density, 0.00051, "unwrapped density y");
  });
}

// No nice-number threshold should suddenly rescale either view. The extra
// scale margin is continuous for all peaks, including old 0.5/1/2 boundaries.
for (const peak of [0, 0.1, 0.5, 1, 2, 2.5, 5, 10, 100]) {
  close(math.displayScale(peak), 0.25 + 1.1 * peak, 0);
  if (peak > 0) {
    close(math.displayScale(peak + 1e-7) - math.displayScale(peak - 1e-7), 2.2e-7, 5e-14);
  }
}

// Check transformed peak resolution against a much denser angular grid.
for (const kind of ["vm", "lavm"]) {
  const density = kind === "vm" ? math.logVM : math.logLAvM;
  const locations = kind === "vm" ? [-Math.PI, -1.1, 0, Math.PI] : [-4, -1.05, 0, 1.05, 4];
  for (const kappa of [0, 0.1, 0.9, 1, 2, 100]) {
    const scaled = math.logScaledAt(kappa, settings);
    for (const location of locations) {
      const sample = math.sample(kind, location, kappa, settings);
      assert.ok(sample.points.length >= 1441);
      assert.equal(sample.points[0][0], -Math.PI);
      assert.equal(sample.points.at(-1)[0], Math.PI);
      for (let index = 1; index < sample.points.length; index++) {
        assert.ok(sample.points[index][0] > sample.points[index - 1][0]);
        assert.ok(Number.isFinite(sample.points[index][1]) && sample.points[index][1] >= 0);
      }
      assert.ok(sample.scale >= sample.peak);
      close(sample.scale, math.displayScale(sample.peak), 0);
      let densePeak = 0;
      const denseCount = 100000;
      for (let index = 0; index <= denseCount; index++) {
        densePeak = Math.max(densePeak,
          Math.exp(density(-Math.PI + TAU * index / denseCount, location, kappa, scaled)));
      }
      assert.ok(Math.abs(sample.peak - densePeak) / densePeak < 0.001,
        `${kind} sampled peak ${sample.peak} vs dense ${densePeak}, location=${location}, kappa=${kappa}`);
      checkPaths(math.paths(sample.points, sample.scale));
    }
  }
}

for (const invalid of [NaN, Infinity, -Infinity, "1", null, undefined]) {
  for (const density of [math.logVM, math.logLAvM]) {
    for (const args of [[invalid, 0, 1, -1], [0, invalid, 1, -1], [0, 0, invalid, -1], [0, 0, 1, invalid]]) {
      assert.throws(() => density(...args), RangeError);
    }
  }
  assert.throws(() => math.logScaledAt(invalid, settings), RangeError);
}
for (const invalid of [-1, 100.1]) {
  assert.throws(() => math.logScaledAt(invalid, settings), RangeError);
}
assert.throws(() => math.logVM(0, 0, -1, 0), RangeError);
assert.throws(() => math.logLAvM(0, 0, -1, 0), RangeError);
assert.throws(() => math.sample("unknown", 0, 1, settings), RangeError);

// A deliberately tiny DOM implements only the public APIs used by this script.
// This checks input wiring and accessibility text, not layout/rendering.
class Element {
  constructor(value = "") {
    this.value = String(value);
    this.defaultValue = String(value);
    this.textContent = "";
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = new Map();
    this.dataset = {};
    this.disabled = false;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name); }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(listener);
  }
  dispatch(name) { for (const listener of this.listeners.get(name) || []) listener({ target: this }); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) { return this.children.get(selector) || []; }
  put(selector, ...elements) { this.children.set(selector, elements); return elements[0]; }
}

function makeCard(kind) {
  const card = new Element();
  card.dataset.densityCard = kind;
  card.put("[data-density-kappa]", new Element(2));
  card.put("[data-density-location]", new Element(kind === "vm" ? 0 : 1));
  for (const name of ["polar", "polar-area", "line", "area", "kappa-output", "location-output", "note", "status", "reset"]) {
    card.put(`[data-density-${name}]`, new Element());
  }
  card.put("[data-density-scale]", new Element(), new Element());
  const polarDescription = new Element();
  polarDescription.dataset.densityDescription = "polar";
  const lineDescription = new Element();
  lineDescription.dataset.densityDescription = "line";
  card.put("[data-density-description]", polarDescription, lineDescription);
  const controls = card.put("[data-density-controls]", new Element());
  let disabled = true;
  Object.defineProperty(controls, "disabled", {
    get() { return disabled; },
    set(value) {
      if (value === false) {
        assert.match(card.querySelector("[data-density-polar]").getAttribute("d") || "", /^M/,
          "Controls must not enable before successful plot initialization.");
        assert.ok(card.querySelector("[data-density-status]").textContent);
      }
      disabled = value;
    }
  });
  return card;
}

function harness({ present = true, mathPresent = true, reducedMotion = false } = {}) {
  const cards = [makeCard("vm"), makeCard("lavm")];
  const lab = new Element();
  const config = lab.put("[data-density-settings]", new Element());
  config.textContent = JSON.stringify(settings);
  lab.put("[data-density-card]", ...cards);
  let frameId = 0;
  let time = 0;
  const frames = new Map();
  const motion = {matches: reducedMotion};
  const window = {matchMedia(query) {
    assert.equal(query, "(prefers-reduced-motion: reduce)");
    return motion;
  }};
  const context = vm.createContext({
    window,
    performance: {now: () => time},
    document: { querySelector: selector => selector === "[data-density-lab]" && present ? lab : null },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => { frames.delete(id); }
  });
  if (mathPresent) vm.runInContext(mathSource, context, { filename: "density-math.js" });
  const samples = [];
  if (mathPresent) {
    const originalSample = window.DirectionalDensities.sample;
    window.DirectionalDensities.sample = (...args) => {
      samples.push({kind: args[0], location: args[1], kappa: args[2]});
      return originalSample(...args);
    };
  }
  function step(milliseconds = 16) {
    time += milliseconds;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(time));
  }
  return {
    cards, frames, samples, motion, step,
    run() { vm.runInContext(uiSource, context, { filename: "density-plots.js" }); },
    flush() {
      let count = 0;
      while (frames.size) {
        assert.ok(++count <= 100, "Animation must settle without an endless frame loop.");
        step();
      }
    }
  };
}

assert.match(template, /<fieldset\b[^>]*data-density-controls[^>]*\bdisabled\b/);
assert.match(template, /aria-live="polite"/);
assert.match(template, /<noscript>/);
assert.doesNotMatch(template, /°|degrees|Angles increase clockwise/);
assert.match(template, /data-density-polar-area/);

function angleText(value) {
  const names = new Map([[-Math.PI, "−π"], [-Math.PI / 2, "−π/2"], [0, "0"],
    [Math.PI / 2, "π/2"], [Math.PI, "π"]]);
  return `${names.get(value) ?? value.toFixed(3)} rad`;
}
for (const options of [{ present: false }, { mathPresent: false }]) {
  const inactive = harness(options);
  inactive.run();
  inactive.cards.forEach(card => assert.equal(card.querySelector("[data-density-controls]").disabled, true));
}

const dom = harness();
dom.cards.forEach(card => assert.equal(card.querySelector("[data-density-controls]").disabled, true));
dom.run();
for (const card of dom.cards) {
  assert.equal(card.querySelector("[data-density-controls]").disabled, false);
  assert.equal(card.querySelector("[data-density-kappa-output]").textContent, "2.0");
  const kind = card.dataset.densityCard;
  assert.equal(card.querySelector("[data-density-location-output]").textContent, kind === "vm" ? "0 rad" : "1.00");
  const kappa = card.querySelector("[data-density-kappa]");
  const location = card.querySelector("[data-density-location]");
  const initialPath = card.querySelector("[data-density-polar]").getAttribute("d");

  for (const [newKappa, newLocation] of kind === "vm"
    ? [[100, -Math.PI], [100, Math.PI], [0, Math.PI / 2], [2.1, -Math.PI / 2], [3, 0.3456789]]
    : [[100, -4], [100, 4], [0, 4], [2, 0]]) {
    kappa.value = String(newKappa);
    kappa.dispatch("input");
    location.value = String(newLocation);
    location.dispatch("input");
    assert.equal(dom.frames.size, 1, "Rapid inputs should coalesce into a single redraw.");
    dom.flush();
    assert.equal(card.querySelector("[data-density-kappa-output]").textContent, newKappa.toFixed(1));
    const locationText = kind === "vm" ? angleText(newLocation) : newLocation.toFixed(2);
    assert.equal(card.querySelector("[data-density-location-output]").textContent, locationText);
    assert.equal(kappa.getAttribute("aria-valuetext"), `Kappa ${newKappa.toFixed(1)}`);
    assert.equal(location.getAttribute("aria-valuetext"), kind === "vm" ? locationText : `Eta ${newLocation.toFixed(2)}`);
    for (const selector of ["[data-density-polar]", "[data-density-polar-area]", "[data-density-line]", "[data-density-area]"]) {
      assert.doesNotMatch(card.querySelector(selector).getAttribute("d"), /NaN|Infinity/);
    }
    const status = card.querySelector("[data-density-status]").textContent;
    assert.ok(status.includes(`kappa ${newKappa.toFixed(1)}`));
    card.querySelectorAll("[data-density-description]").forEach(element => {
      assert.ok(element.textContent.endsWith(status));
      assert.match(element.textContent, element.dataset.densityDescription === "polar"
        ? /Density is zero on the model circle and increases outward/
        : /Horizontal axis: angle in radians from minus pi to pi/);
    });
    const scales = card.querySelectorAll("[data-density-scale]");
    assert.equal(scales[0].textContent, scales[1].textContent);
    if (kind === "vm" && newKappa === 0) assert.match(status, /Uniform.*μ has no effect/);
    if (kind === "lavm" && newKappa === 0) assert.match(status, /non-uniform even when κ = 0/);
    if (kind === "lavm" && newLocation === 0) assert.match(status, /exactly a von Mises/);
  }
  assert.notEqual(card.querySelector("[data-density-polar]").getAttribute("d"), initialPath);
  kappa.value = "8";
  kappa.dispatch("input");
  assert.equal(dom.frames.size, 1);
  const beforeReset = card.querySelector("[data-density-polar]").getAttribute("d");
  card.querySelector("[data-density-reset]").dispatch("click");
  assert.equal(dom.frames.size, 1, "Reset smoothly replaces pending animation with the defaults.");
  assert.equal(card.querySelector("[data-density-polar]").getAttribute("d"), beforeReset,
    "Reset must not jump directly to its destination.");
  assert.equal(kappa.value, kappa.defaultValue);
  assert.equal(location.value, location.defaultValue);
  dom.flush();
  assert.equal(card.querySelector("[data-density-polar]").getAttribute("d"), initialPath);
}

// A large slider change must pass through valid intermediate parameter states;
// a new input while moving starts at the displayed state, never the old target.
for (const kind of ["vm", "lavm"]) {
  const animation = harness();
  animation.run();
  const card = animation.cards.find(item => item.dataset.densityCard === kind);
  const kappa = card.querySelector("[data-density-kappa]");
  const location = card.querySelector("[data-density-location]");
  const original = card.querySelector("[data-density-polar]").getAttribute("d");
  kappa.value = "100";
  location.value = kind === "vm" ? String(Math.PI) : "4";
  kappa.dispatch("input");
  location.dispatch("input");
  assert.equal(animation.frames.size, 1);
  animation.step(0);
  assert.equal(card.querySelector("[data-density-polar]").getAttribute("d"), original);
  animation.step(60);
  const midway = animation.samples.at(-1);
  assert.ok(midway.kappa > 2 && midway.kappa < 100);
  assert.ok(midway.location > (kind === "vm" ? 0 : 1));
  assert.ok(midway.location < (kind === "vm" ? Math.PI : 4));
  const midwayPath = card.querySelector("[data-density-polar]").getAttribute("d");
  assert.notEqual(midwayPath, original);
  const target = math.sample(kind, Number(location.value), 100, settings);
  assert.notEqual(midwayPath, math.paths(target.points, target.scale).polar);

  kappa.value = "20";
  location.value = kind === "vm" ? String(-Math.PI) : "-4";
  kappa.dispatch("input");
  location.dispatch("input");
  animation.step(0);
  assert.equal(card.querySelector("[data-density-polar]").getAttribute("d"), midwayPath,
    "A retargeted animation must continue from the currently displayed curve.");
  animation.step(90);
  const returning = animation.samples.at(-1);
  assert.ok(returning.kappa > 20 && returning.kappa < midway.kappa);
  if (kind === "vm") {
    const delta = Math.atan2(Math.sin(Number(location.value) - midway.location),
      Math.cos(Number(location.value) - midway.location));
    const expected = midway.location + 0.875 * delta;
    close(returning.location, Math.atan2(Math.sin(expected), Math.cos(expected)), 2e-14,
      "VM animation follows the shortest circular path");
  } else {
    assert.ok(returning.location > Number(location.value) && returning.location < midway.location);
  }
  animation.flush();
  assert.equal(animation.samples.at(-1).kappa, 20);
  assert.equal(animation.samples.at(-1).location, Number(location.value));
}

// Continuous dragging often delivers a fresh input before every frame. The
// transition clock must start at input time: resetting it on the first frame
// would leave the plot stuck at t=0 until the user stops dragging.
for (const kind of ["vm", "lavm"]) {
  for (const frameMilliseconds of [8, 16]) {
    const dragging = harness();
    dragging.run();
    const card = dragging.cards.find(item => item.dataset.densityCard === kind);
    const kappa = card.querySelector("[data-density-kappa]");
    const location = card.querySelector("[data-density-location]");
    let previousKappa = 2;
    let previousLocation = kind === "vm" ? 0 : 1;
    let previousPolar = card.querySelector("[data-density-polar]").getAttribute("d");
    let previousLinear = card.querySelector("[data-density-line]").getAttribute("d");
    for (let index = 1; index <= 30; index++) {
      const targetKappa = 2 + index;
      const targetLocation = (kind === "vm" ? 0 : 1) + index * 0.04;
      kappa.value = String(targetKappa);
      location.value = String(targetLocation);
      kappa.dispatch("input");
      location.dispatch("input");
      assert.equal(dragging.frames.size, 1, "Dragging keeps one pending frame per card.");
      dragging.step(frameMilliseconds);
      const displayed = dragging.samples.at(-1);
      assert.ok(displayed.kappa > previousKappa && displayed.kappa < targetKappa,
        `${kind} kappa must progress on every first frame during ${frameMilliseconds}ms dragging.`);
      assert.ok(displayed.location > previousLocation && displayed.location < targetLocation,
        `${kind} location must progress while dragging.`);
      const polar = card.querySelector("[data-density-polar]").getAttribute("d");
      const linear = card.querySelector("[data-density-line]").getAttribute("d");
      assert.notEqual(polar, previousPolar, "Circular curve must move continuously during dragging.");
      assert.notEqual(linear, previousLinear, "Unwrapped curve must move continuously during dragging.");
      previousKappa = displayed.kappa;
      previousLocation = displayed.location;
      previousPolar = polar;
      previousLinear = linear;
    }
    dragging.flush();
    assert.equal(dragging.samples.at(-1).kappa, Number(kappa.value));
    assert.equal(dragging.samples.at(-1).location, Number(location.value));
  }
}

for (const kind of ["vm", "lavm"]) {
  const reduced = harness({reducedMotion: true});
  reduced.run();
  const card = reduced.cards.find(item => item.dataset.densityCard === kind);
  const kappa = card.querySelector("[data-density-kappa]");
  kappa.value = "45.1";
  kappa.dispatch("input");
  assert.equal(reduced.frames.size, 0, "Reduced motion updates without animation.");
  assert.equal(reduced.samples.at(-1).kappa, 45.1);
  card.querySelector("[data-density-reset]").dispatch("click");
  assert.equal(reduced.frames.size, 0);
  assert.equal(reduced.samples.at(-1).kappa, 2);
}

const seamAnimation = harness({reducedMotion: true});
seamAnimation.run();
const seamCard = seamAnimation.cards[0];
const seamLocation = seamCard.querySelector("[data-density-location]");
seamLocation.value = String(Math.PI - 0.05);
seamLocation.dispatch("input");
seamAnimation.motion.matches = false;
seamLocation.value = String(-Math.PI + 0.05);
seamLocation.dispatch("input");
seamAnimation.step();
for (let index = 0; index < 10; index++) {
  seamAnimation.step(20);
  assert.ok(Math.abs(seamAnimation.samples.at(-1).location) >= Math.PI - 0.05000001,
    "A small step across +/-pi must stay by the seam, not rotate through zero.");
}
seamAnimation.flush();
close(seamAnimation.samples.at(-1).location, -Math.PI + 0.05, 0);

console.log(`Density JavaScript passed: ${reference.cases.length} Python density references, ${reference.intermediate.length} intermediate Bessel references, normalization, annular/radian geometry, SSR parity, continuous scales, animation retargeting, continuous dragging, reduced motion, controls, reset, live labels, and no-JS defaults.`);
