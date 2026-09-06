/* Small enhancements; the pages and default plot are rendered as static HTML. */
(() => {
  "use strict";
  document.documentElement.classList.add("js");

  const nav = document.querySelector(".main-nav");
  const mobileButton = document.querySelector(".mobile-toggle");
  const groups = [...document.querySelectorAll(".nav-group")];
  function setGroup(group, open) {
    group.classList.toggle("is-open", open);
    group.querySelector(".nav-disclosure").setAttribute("aria-expanded", String(open));
  }
  function closeGroups(except) {
    groups.forEach(group => { if (group !== except) setGroup(group, false); });
  }
  groups.forEach(group => {
    const trigger = group.querySelector(".nav-disclosure");
    trigger.addEventListener("click", () => {
      const next = !group.classList.contains("is-open");
      closeGroups(group);
      setGroup(group, next);
    });
    group.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse") { closeGroups(group); setGroup(group, true); }
    });
    group.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse" && !group.contains(document.activeElement)) setGroup(group, false);
    });
    group.addEventListener("focusout", () => {
      requestAnimationFrame(() => { if (!group.contains(document.activeElement)) setGroup(group, false); });
    });
    trigger.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") {
        event.preventDefault(); closeGroups(group); setGroup(group, true);
        group.querySelector(".nav-panel a").focus();
      }
    });
    group.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); setGroup(group, false); trigger.focus();
      }
    });
  });
  mobileButton?.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    mobileButton.setAttribute("aria-expanded", String(open));
    if (!open) closeGroups();
  });
  document.addEventListener("click", event => { if (!event.target.closest(".nav-group")) closeGroups(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open"); mobileButton.setAttribute("aria-expanded", "false"); mobileButton.focus();
    }
  });

  const polarPoint = (angle, radius) => {
    const radians = angle * Math.PI / 180;
    return `${(280 + radius * Math.sin(radians)).toFixed(3)},${(280 - radius * Math.cos(radians)).toFixed(3)}`;
  };
  const svgElement = (tag, attributes) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  document.querySelectorAll("[data-rose-lab]").forEach(lab => {
    const math = globalThis.DirectionalMath;
    if (!math) return; // The complete static plot remains usable without JS.
    const settings = JSON.parse(lab.dataset.roseSettings);
    const sampleSelect = lab.querySelector("[data-sample]");
    const rotation = lab.querySelector("[data-rotation]");
    const concentration = lab.querySelector("[data-concentration]");
    const concentrationValue = lab.querySelector("[data-concentration-value]");
    const concentrationNote = lab.querySelector("[data-concentration-note]");
    let singleResultant = settings.resultant;
    const update = () => {
      const offset = Number(rotation.value);
      const isSingle = sampleSelect.value === "cluster";
      const baseAngles = isSingle
        ? math.sampleAtResultant(singleResultant, settings.center, settings.size)
        : math.sampleFromCounts(settings.samples[sampleSelect.value]);
      const angles = baseAngles.map(angle => (angle + offset) % 360);
      const counts = math.histogram(angles);
      const { resultant, mean } = math.summarize(angles);
      const defined = mean !== null;
      concentration.disabled = !isSingle;
      concentration.value = isSingle ? singleResultant : 0;
      concentrationValue.textContent = (isSingle ? singleResultant : 0).toFixed(2);
      concentration.setAttribute("aria-valuetext", `Mean resultant length ${concentrationValue.textContent}`);
      concentrationNote.textContent = isSingle
        ? "Set the sample’s mean resultant length; the number of observations stays fixed."
        : sampleSelect.value === "opposed"
          ? "Opposing clusters cancel: R̄ = 0. Choose “One main direction” to adjust R̄."
          : "Evenly spaced directions have R̄ = 0. Choose “One main direction” to adjust R̄.";
      const maximum = Math.max(...counts);
      const sectors = lab.querySelector("[data-sectors]");
      sectors.replaceChildren();
      counts.forEach((count, i) => {
        if (!count) return;
        const radius = 190 * Math.sqrt(count / maximum);
        const wedge = svgElement("path", { d: `M280,280 L${polarPoint(i * 22.5, radius)} A${radius.toFixed(3)},${radius.toFixed(3)} 0 0 1 ${polarPoint((i + 1) * 22.5, radius)} Z` });
        const title = svgElement("title", {});
        title.textContent = `${i * 22.5}–${(i + 1) * 22.5}°: ${count} observations`;
        wedge.append(title); sectors.append(wedge);
      });
      const observations = lab.querySelector("[data-observations]");
      observations.replaceChildren(...angles.map(angle => {
        const [cx, cy] = polarPoint(angle, 210).split(",");
        return svgElement("circle", { cx, cy, r: 1.7 });
      }));
      const arrow = lab.querySelector("[data-mean-arrow]");
      arrow.style.display = defined ? "" : "none";
      arrow.setAttribute("transform", `rotate(${mean ?? 0} 280 280)`);
      const meanText = defined ? `${(Math.round(mean * 10) / 10 % 360).toFixed(1)}°` : "Undefined";
      lab.querySelector("[data-stat-n]").textContent = angles.length;
      lab.querySelector("[data-stat-mean]").textContent = meanText;
      lab.querySelector("[data-stat-r]").textContent = resultant.toFixed(2);
      lab.querySelector("[data-rotation-value]").textContent = `${offset}°`;
      rotation.setAttribute("aria-valuetext", `${offset} degrees`);
      lab.querySelector("[data-max-count]").textContent = maximum;
      lab.querySelector("#rose-desc").textContent = `${angles.length} illustrative directions in 16 equal bins. Sector area represents count. North is zero; angles increase clockwise. Mean direction: ${meanText}. Mean resultant length: ${resultant.toFixed(2)}. Outer grid ring: ${maximum} observations.`;
      const table = lab.querySelector("[data-count-table]");
      table.replaceChildren(...counts.map((count, i) => {
        const row = document.createElement("tr"), bin = document.createElement("th"), cell = document.createElement("td");
        bin.scope = "row"; bin.textContent = `${i * 22.5}–${(i + 1) * 22.5}°`; cell.textContent = count;
        row.append(bin, cell); return row;
      }));
    };
    lab.querySelector(".plot-controls").hidden = false;
    sampleSelect.addEventListener("change", update);
    rotation.addEventListener("input", update);
    concentration.addEventListener("input", () => {
      singleResultant = Number(concentration.value);
      update();
    });
  });

  // Keep the original HTML independent while letting the outer page scroll.
  document.querySelectorAll("[data-tutorial-frame]").forEach(frame => {
    const fit = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        const resize = () => {
          const height = Math.ceil(doc.body.getBoundingClientRect().height + 50);
          if (Math.abs(frame.height - height) > 4) frame.height = String(Math.max(1000, height));
        };
        resize();
        new ResizeObserver(resize).observe(doc.body);
        doc.fonts?.ready.then(resize);
      } catch { /* The full-document link remains available if embedding fails. */ }
    };
    frame.addEventListener("load", fit);
    if (frame.contentDocument?.readyState === "complete") fit();
  });
})();
