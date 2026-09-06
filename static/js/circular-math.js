/* Shared, dependency-free mathematics for the illustrative circular samples. */
(function (root) {
  "use strict";

  const TAU = 2 * Math.PI;
  const DEGREES_PER_RADIAN = 180 / Math.PI;
  const MEAN_TOLERANCE = 1e-10;

  function finiteNumber(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number.`);
    }
  }

  function normalize(angle) {
    // Normalize negative bearings as well as bearings beyond one full turn.
    return ((angle % 360) + 360) % 360;
  }

  function validateAngles(angles) {
    if (!Array.isArray(angles)) throw new TypeError("angles must be an array.");
    for (const angle of angles) finiteNumber(angle, "Each angle");
  }

  function sampleFromCounts(counts) {
    if (!Array.isArray(counts)) throw new TypeError("counts must be an array.");
    if (!counts.length) throw new RangeError("counts must contain at least one bin.");
    let total = 0;
    for (const count of counts) {
      if (typeof count !== "number") throw new TypeError("Each count must be a number.");
      if (!Number.isSafeInteger(count) || count < 0) {
        throw new RangeError("Each count must be a nonnegative safe integer.");
      }
      total += count;
    }
    if (!Number.isSafeInteger(total) || total < 1) {
      throw new RangeError("The total count must be a positive safe integer.");
    }
    const binWidth = 360 / counts.length;
    return counts.flatMap((count, index) => Array.from(
      { length: count },
      (_, j) => (index + (j + 0.5) / count) * binWidth
    ));
  }

  function summarize(angles) {
    validateAngles(angles);
    if (!angles.length) throw new RangeError("Cannot summarize an empty sample.");
    let east = 0;
    let north = 0;
    for (const angle of angles) {
      const radians = normalize(angle) / DEGREES_PER_RADIAN;
      east += Math.sin(radians);
      north += Math.cos(radians);
    }
    const resultant = Math.min(1, Math.hypot(east, north) / angles.length);
    return {
      n: angles.length,
      mean: resultant <= MEAN_TOLERANCE
        ? null
        : normalize(Math.atan2(east, north) * DEGREES_PER_RADIAN),
      resultant,
    };
  }

  function sampleAtResultant(target, center = 67.5, size = 120) {
    finiteNumber(target, "target");
    if (target < 0 || target > 1) throw new RangeError("target must lie in [0, 1].");
    finiteNumber(center, "center");
    if (typeof size !== "number") throw new TypeError("size must be a number.");
    if (!Number.isSafeInteger(size) || size < 2 || size % 2 !== 0) {
      throw new RangeError("size must be an even safe integer of at least 2.");
    }
    const bearing = normalize(center);
    if (target === 1) return Array(size).fill(bearing);

    // Midpoint quantiles avoid ±π, and symmetric pairs cancel their sine sums.
    const quantiles = Array.from({ length: size }, (_, j) =>
      TAU * (j + 0.5) / size - Math.PI);
    if (target === 0) {
      return quantiles.map(angle => normalize(bearing + angle * DEGREES_PER_RADIAN));
    }
    const tangents = quantiles.map(angle => Math.tan(angle / 2));
    const resultantAtScale = scale => tangents.reduce((sum, tangent) =>
      sum + Math.cos(2 * Math.atan(scale * tangent)), 0) / size;

    // R decreases continuously from 1 to 0 as scale increases from 0 to 1.
    // Solve for the empirical R, not the population wrapped-Cauchy parameter.
    let lower = 0;
    let upper = 1;
    for (let iteration = 0; iteration < 55; iteration += 1) {
      const middle = (lower + upper) / 2;
      if (resultantAtScale(middle) > target) lower = middle;
      else upper = middle;
    }
    const scale = (lower + upper) / 2;
    return tangents.map(tangent => normalize(
      bearing + 2 * Math.atan(scale * tangent) * DEGREES_PER_RADIAN
    ));
  }

  function histogram(angles, bins = 16) {
    validateAngles(angles);
    if (typeof bins !== "number") throw new TypeError("bins must be a number.");
    if (!Number.isSafeInteger(bins) || bins < 1) {
      throw new RangeError("bins must be a positive safe integer.");
    }
    const counts = Array(bins).fill(0);
    for (const angle of angles) {
      const bin = Math.min(bins - 1, Math.floor(normalize(angle) / 360 * bins));
      counts[bin] += 1;
    }
    return counts;
  }

  const api = Object.freeze({ sampleFromCounts, summarize, sampleAtResultant, histogram });
  root.DirectionalMath = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(globalThis);
