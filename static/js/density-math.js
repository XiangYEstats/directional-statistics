/* Stable density evaluation using log(exp(-kappa) I0(kappa)) from Python.
   This module has no DOM dependency; the same formulas are in density_math.py. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DirectionalDensities = api;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  const TAU = 2 * Math.PI;
  const LOG_TAU = Math.log(TAU);

  function check(x, location, kappa, logScaled) {
    if (![x, location, kappa, logScaled].every(Number.isFinite) || kappa < 0) {
      throw new RangeError("Density parameters must be finite and kappa non-negative.");
    }
  }

  function logVM(x, mu, kappa, logScaled) {
    check(x, mu, kappa, logScaled);
    const sine = Math.sin(((x % TAU) - (mu % TAU)) / 2);
    return -kappa * (2 * sine * sine) - LOG_TAU - logScaled;
  }

  function logLAvM(x, eta, kappa, logScaled) {
    check(x, eta, kappa, logScaled);
    x %= TAU;
    if (Math.abs(x) === Math.PI) return -kappa * 2 - LOG_TAU - logScaled;
    const c = Math.cos(x / 2);
    const a = Math.sin(x / 2) - eta * c;
    const h = Math.hypot(c, a);
    // Algebraically the R transform + log-Jacobian, without tan at +/-pi.
    const sine = a / h;
    return -kappa * (2 * sine * sine) - LOG_TAU - logScaled - 2 * Math.log(h);
  }

  function logScaledAt(kappa, settings) {
    const index = Math.round(kappa / settings.kappa_step);
    if (!Number.isFinite(kappa) || kappa < 0 || kappa > settings.kappa_max) {
      throw new RangeError("Kappa must be within the explorer range.");
    }
    if (Math.abs(index * settings.kappa_step - kappa) < 1e-12) {
      return settings.log_bessel_scaled[index];
    }
    // Intermediate animation values use the same stable calculation as Python,
    // not rounded lookup values or interpolation of the density normalization.
    if (kappa <= 50) {
      const q = (kappa / 2) ** 2;
      let term = 1, sum = 0, correction = 0;
      for (let j = 1; j < 1000; j++) {
        term *= q / (j * j);
        const increment = term - correction;
        const next = sum + increment;
        correction = (next - sum) - increment;
        sum = next;
        if (term <= 1e-17 * (1 + sum)) break;
      }
      return Math.log1p(sum) - kappa;
    }
    let term = 1, sum = 0;
    for (let j = 1; j < 1000; j++) {
      const next = term * (((2 * j - 1) ** 2 / (8 * j)) / kappa);
      if (next >= term) break;
      sum += next;
      term = next;
      if (term < 1e-17) break;
    }
    return -0.5 * (LOG_TAU + Math.log(kappa)) + Math.log1p(sum);
  }

  function wrap(x) { return ((x + Math.PI) % TAU + TAU) % TAU - Math.PI; }

  function samplingAngles(kind, location, kappa) {
    // Uniform coverage plus extra resolution around the transformed narrow peak.
    const values = Array.from({length: 1441}, (_, i) => -Math.PI + TAU * i / 1440);
    // A large link shift can create a narrow peak even at zero concentration.
    if (kind === "lavm" || kappa >= 1) {
      const width = Math.min(Math.PI - 1e-9, 8 / Math.sqrt(Math.max(1, kappa)));
      for (let j = 0; j <= 384; j++) {
        const z = -width + 2 * width * j / 384;
        values.push(kind === "vm" ? wrap(z + location) : 2 * Math.atan(Math.tan(z / 2) + location));
      }
    }
    return [...new Set(values)].sort((a, b) => a - b);
  }

  function displayScale(peak) {
    // Continuous headroom, never rounded to discrete 1/2/2.5/5 axis limits.
    return 0.25 + 1.1 * peak;
  }

  function sample(kind, location, kappa, settings) {
    if (kind !== "vm" && kind !== "lavm") throw new RangeError("Unknown distribution.");
    const scaled = logScaledAt(kappa, settings);
    const density = kind === "vm" ? logVM : logLAvM;
    const points = samplingAngles(kind, location, kappa).map(x => [x, Math.exp(density(x, location, kappa, scaled))]);
    const peak = Math.max(...points.map(p => p[1]));
    return {points, peak, scale: displayScale(peak)};
  }

  function paths(points, scale) {
    const polar = points.map(([x, f], i) => {
      const r = 95 + 125 * f / scale;
      return `${i ? "L" : "M"}${(280 + r * Math.cos(x)).toFixed(3)},${(280 - r * Math.sin(x)).toFixed(3)}`;
    }).join(" ") + " Z";
    // Even-odd fill removes the zero-density model circle from the shaded area.
    const polarArea = polar + " M185,280 A95,95 0 1,0 375,280 A95,95 0 1,0 185,280 Z";
    const linear = points.map(([x, f], i) => `${i ? "L" : "M"}${(50 + 480 * (x + Math.PI) / TAU).toFixed(3)},${(135 - 110 * f / scale).toFixed(3)}`).join(" ");
    return {polar, polarArea, linear, area: linear + " L530,135 L50,135 Z"};
  }

  return {logVM, logLAvM, logScaledAt, samplingAngles, displayScale, sample, paths};
});
