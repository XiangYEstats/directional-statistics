(function () {
  "use strict";
  const lab = document.querySelector("[data-density-lab]");
  if (!lab || !window.DirectionalDensities) return;
  const math = window.DirectionalDensities;
  const settings = JSON.parse(lab.querySelector("[data-density-settings]").textContent);
  const format = value => Number(value.toPrecision(3)).toString();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function angleLabel(value) {
    for (const [angle, label] of [[-Math.PI, "−π"], [-Math.PI / 2, "−π/2"], [0, "0"], [Math.PI / 2, "π/2"], [Math.PI, "π"]]) {
      if (Math.abs(value - angle) < 1e-8) return `${label} rad`;
    }
    return `${value.toFixed(3)} rad`;
  }

  lab.querySelectorAll("[data-density-card]").forEach(card => {
    const kind = card.dataset.densityCard;
    const kappaInput = card.querySelector("[data-density-kappa]");
    const locationInput = card.querySelector("[data-density-location]");
    const plotElements = ["polar", "polar-area", "line", "area"].map(name =>
      card.querySelector(`[data-density-${name}]`));
    const scaleElements = card.querySelectorAll("[data-density-scale]");
    const kappaOutput = card.querySelector("[data-density-kappa-output]");
    const locationOutput = card.querySelector("[data-density-location-output]");
    const noteElement = card.querySelector("[data-density-note]");
    const descriptions = card.querySelectorAll("[data-density-description]");
    const statusElement = card.querySelector("[data-density-status]");
    let requestedFrame = 0;
    let displayed = {kappa: Number(kappaInput.value), location: Number(locationInput.value)};

    function update(state) {
      displayed = state;
      const {kappa, location} = state;
      const locationValue = location;
      const result = math.sample(kind, location, kappa, settings);
      const paths = math.paths(result.points, result.scale);
      [paths.polar, paths.polarArea, paths.linear, paths.area].forEach((path, index) =>
        plotElements[index].setAttribute("d", path));
      scaleElements.forEach(el => { el.textContent = format(result.scale); });
      kappaOutput.textContent = kappa.toFixed(1);
      locationOutput.textContent = kind === "vm" ? angleLabel(locationValue) : locationValue.toFixed(2);
      kappaInput.setAttribute("aria-valuetext", `Kappa ${kappa.toFixed(1)}`);
      locationInput.setAttribute("aria-valuetext", kind === "vm" ? angleLabel(locationValue) : `Eta ${locationValue.toFixed(2)}`);

      const note = kind === "vm"
        ? (kappa === 0 ? "Uniform around the circle: μ has no effect when κ = 0." : "Changing μ rotates the density; changing κ adjusts its concentration.")
        : (locationValue === 0
          ? "At η = 0 this is exactly a von Mises distribution with μ = 0, at the same κ."
          : (kappa === 0 ? "With η ≠ 0, the link adjustment is still non-uniform even when κ = 0." : "Changing η shifts and reshapes the density; η is not the mean direction."));
      if (noteElement.textContent !== note) noteElement.textContent = note;
      const summary = `${kind === "vm" ? "von Mises" : "Link-adjusted von Mises"} density; kappa ${kappa.toFixed(1)}, ${kind === "vm" ? "mu " + angleLabel(locationValue) : "eta " + locationValue.toFixed(2)}. Density scale zero to ${format(result.scale)} per radian. ${note}`;
      descriptions.forEach(el => {
        const axes = el.dataset.densityDescription === "polar"
          ? "Density is zero on the model circle and increases outward. Zero radians is right, pi/2 top, plus or minus pi left, and minus pi/2 bottom. "
          : "Horizontal axis: angle in radians from minus pi to pi. Vertical axis: density per radian. The endpoints are the same direction. ";
        el.textContent = axes + summary;
      });
      statusElement.textContent = summary;
    }

    function schedule() {
      cancelAnimationFrame(requestedFrame);
      const target = {kappa: Number(kappaInput.value), location: Number(locationInput.value)};
      if (reducedMotion.matches) { update(target); return; }
      const start = {...displayed};
      const locationDelta = kind === "vm"
        ? Math.atan2(Math.sin(target.location - start.location), Math.cos(target.location - start.location))
        : target.location - start.location;
      // Start at the input event, not the first paint: otherwise rapid dragging
      // can repeatedly restart a zero-progress first frame and stall the curve.
      const firstTime = performance.now();
      function animate(time) {
        const fraction = Math.min(1, Math.max(0, (time - firstTime) / 80));
        const eased = 1 - (1 - fraction) ** 3;
        let location = start.location + locationDelta * eased;
        if (kind === "vm") location = Math.atan2(Math.sin(location), Math.cos(location));
        update(fraction === 1 ? target : {
          kappa: start.kappa + (target.kappa - start.kappa) * eased,
          location,
        });
        requestedFrame = fraction < 1 ? requestAnimationFrame(animate) : 0;
      }
      requestedFrame = requestAnimationFrame(animate);
    }
    kappaInput.addEventListener("input", schedule);
    locationInput.addEventListener("input", schedule);
    card.querySelector("[data-density-reset]").addEventListener("click", () => {
      cancelAnimationFrame(requestedFrame);
      kappaInput.value = kappaInput.defaultValue;
      locationInput.value = locationInput.defaultValue;
      schedule();
    });
    update(displayed);
    card.querySelector("[data-density-controls]").disabled = false;
  });
})();
