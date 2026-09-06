"use strict";

const assert = require("node:assert/strict");
const math = require("../static/js/circular-math.js");
const { sampleFromCounts, summarize, sampleAtResultant, histogram } = math;

function close(actual, expected, tolerance = 2e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}.`);
}

function sameBearing(actual, expected) {
  close(((actual - expected + 540) % 360 + 360) % 360 - 180, 0, 2e-9);
}

assert.equal(globalThis.DirectionalMath, math);
assert.ok(Object.isFrozen(math));

for (const size of [2, 16, 120, 128]) {
  for (const center of [-725, -1, 0, 1, 67.5, 180, 359, 360, 725]) {
    for (const target of [0, 0.01, 0.2, 0.65, 0.95, 0.99, 1]) {
      const angles = sampleAtResultant(target, center, size);
      assert.equal(angles.length, size);
      assert.ok(angles.every(angle => Number.isFinite(angle) && angle >= 0 && angle < 360));
      assert.deepEqual(angles, sampleAtResultant(target, center, size));
      const summary = summarize(angles);
      assert.equal(summary.n, size);
      close(summary.resultant, target);
      if (target === 0) assert.equal(summary.mean, null);
      else sameBearing(summary.mean, center);
      if (target === 1) assert.equal(new Set(angles).size, 1);

      // Cancellation transverse to the chosen centre holds across the seam.
      const sine = angles.reduce((sum, angle) =>
        sum + Math.sin((angle - center) * Math.PI / 180), 0) / size;
      close(sine, 0);
      for (const bins of [1, 7, 16, 36]) {
        const counts = histogram(angles, bins);
        assert.equal(counts.length, bins);
        assert.equal(counts.reduce((sum, count) => sum + count, 0), size);
        assert.ok(counts.every(count => Number.isInteger(count) && count >= 0));
      }
    }
  }
}

// Increasing the requested alignment changes the measured alignment in order.
let previous = -1;
for (let percent = 0; percent <= 100; percent += 1) {
  const resultant = summarize(sampleAtResultant(percent / 100)).resultant;
  assert.ok(resultant > previous);
  previous = resultant;
}

const cluster = [6, 11, 18, 26, 20, 11, 6, 3, 1, 1, 1, 2, 2, 3, 4, 5];
const opposed = [3, 8, 19, 26, 19, 8, 3, 2, 3, 8, 19, 26, 19, 8, 3, 2];
const balanced = Array(16).fill(8);
for (const counts of [cluster, opposed, balanced, [0, 2, 0, 3], [1]]) {
  const original = counts.slice();
  const angles = sampleFromCounts(counts);
  assert.equal(angles.length, counts.reduce((sum, count) => sum + count, 0));
  assert.deepEqual(histogram(angles, counts.length), counts);
  assert.deepEqual(counts, original);
}
for (const counts of [opposed, balanced]) {
  for (const rotation of [0, 1, 67.5, 359]) {
    const summary = summarize(sampleFromCounts(counts).map(angle => angle + rotation));
    close(summary.resultant, 0);
    assert.equal(summary.mean, null);
  }
}
assert.equal(summarize(sampleAtResultant(1e-12)).mean, null);
sameBearing(summarize([359, 1]).mean, 0);
close(summarize([359, 1]).resultant, Math.cos(Math.PI / 180));
assert.equal(summarize([0, 180]).mean, null);
assert.deepEqual(histogram([0, 360, -360, 90, 180, 270, -90], 4), [3, 1, 1, 2]);
assert.deepEqual(histogram([], 3), [0, 0, 0]);
assert.equal(sampleAtResultant(0.65).length, 120);
sameBearing(summarize(sampleAtResultant(0.65)).mean, 67.5);

for (const invalid of [NaN, Infinity, -Infinity, "0.5", null, undefined, {}, []]) {
  assert.throws(() => sampleAtResultant(invalid), TypeError);
}
for (const invalid of [-0.01, 1.01]) {
  assert.throws(() => sampleAtResultant(invalid), RangeError);
}
for (const invalid of [NaN, Infinity, -Infinity, "67.5", null, {}]) {
  assert.throws(() => sampleAtResultant(0.5, invalid), TypeError);
}
for (const invalid of [0, 1, 3, -2, 2.5, NaN, Infinity, 2 ** 53]) {
  assert.throws(() => sampleAtResultant(0.5, 0, invalid), RangeError);
}
for (const invalid of ["120", null, {}]) {
  assert.throws(() => sampleAtResultant(0.5, 0, invalid), TypeError);
}
for (const invalid of [0, -1, 1.5, NaN, Infinity, 2 ** 53]) {
  assert.throws(() => histogram([0], invalid), RangeError);
}
for (const invalid of ["16", null, {}]) {
  assert.throws(() => histogram([0], invalid), TypeError);
}
for (const invalid of [null, undefined, "angles", {}]) {
  assert.throws(() => summarize(invalid), TypeError);
  assert.throws(() => histogram(invalid), TypeError);
  assert.throws(() => sampleFromCounts(invalid), TypeError);
}
for (const invalid of [[NaN], [Infinity], ["0"], [null], Array(2)]) {
  assert.throws(() => summarize(invalid), TypeError);
  assert.throws(() => histogram(invalid), TypeError);
}
assert.throws(() => summarize([]), RangeError);
for (const invalid of [[], [0, 0], [-1, 2], [0.5, 2], [NaN], [Infinity], [2 ** 53]]) {
  assert.throws(() => sampleFromCounts(invalid), RangeError);
}
for (const invalid of [["2"], [null], Array(2)]) {
  assert.throws(() => sampleFromCounts(invalid), TypeError);
}

console.log("Circular mathematics passed: target alignment, rotations, endpoints, cancellation, counts, and parameter validation.");
