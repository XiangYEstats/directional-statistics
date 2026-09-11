"use strict";

// Exercise the reader bridge without launching a browser. In particular, the
// series buttons must work before slow external MathJax finishes loading.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../static/js/site.js"), "utf8");
const tutorials = [
  ["pc-prior", "pc_prior"], ["lavm", "lavm"],
  ["circular-joint-regression", "circular_joint_regression"]
];

for (const prefix of ["/", "/directional-statistics/"]) {
  for (const [slug, directory] of tutorials) {
    const root = `https://example.test${prefix}`;
    const pageURL = `${root}tutorials/${slug}/`;
    const documentURL = `${root}assets/tutorials/${directory}/${directory}.html?v=fresh`;
    const menuLinks = tutorials.map(([reader, asset]) => ({
      href: `${root}tutorials/${reader}/`,
      dataset: { tutorialDocument: `../../assets/tutorials/${asset}/${asset}.html` }
    }));
    const links = [];
    const inner = {
      body: {}, location: new URL(documentURL), readyState: "loading",
      querySelectorAll: selector => { assert.equal(selector, "a[href]"); return links; }
    };
    const timers = new Map();
    let timerID = 0;
    let mutation;
    let disconnected = 0;
    let onLoad;
    const frame = {
      contentDocument: { body: {}, location: { href: "about:blank" } },
      addEventListener: (event, fn) => { assert.equal(event, "load"); onLoad = fn; }
    };
    vm.runInNewContext(source, {
      URL,
      document: {
        baseURI: pageURL,
        documentElement: { classList: { add() {} } },
        querySelector: () => null,
        querySelectorAll: selector => selector === "[data-tutorial-document]" ? menuLinks
          : selector === "[data-tutorial-frame]" ? [frame] : [],
        addEventListener() {}
      },
      setTimeout: callback => { timers.set(++timerID, callback); return timerID; },
      clearTimeout: id => timers.delete(id),
      MutationObserver: class {
        constructor(callback) { mutation = callback; }
        observe(body) { assert.equal(body, inner.body); }
        disconnect() { disconnected++; }
      }
    }, { filename: "site.js" });

    assert.equal(timers.size, 1, "Wait for the real document after about:blank.");
    frame.contentDocument = inner;
    const [id, connect] = timers.entries().next().value;
    timers.delete(id);
    connect();
    assert.equal(timers.size, 0, "Stop polling as soon as the document is observed.");
    assert.equal(typeof mutation, "function");

    // The document adds buttons after our connection but before iframe load.
    for (const [, asset] of tutorials) {
      links.push({ href: new URL(`../${asset}/${asset}.html`, documentURL).href });
    }
    const section = { href: new URL("#stan-program", documentURL).href };
    const external = { href: "https://example.org/paper" };
    const data = { href: new URL("wind_data.rds", documentURL).href };
    links.push(section, external, data);
    mutation();
    tutorials.forEach(([reader], index) => {
      assert.equal(links[index].href, `${root}tutorials/${reader}/`);
      assert.equal(links[index].target, "_top", "Switch the complete reader page.");
    });
    assert.equal(section.href, `${documentURL}#stan-program`);
    assert.equal(section.target, undefined, "Keep section navigation inside the document.");
    assert.equal(external.target, undefined);
    assert.equal(data.target, undefined);
    mutation();
    onLoad();
    assert.equal(disconnected, 0, "Do not reconnect or duplicate observers on load.");
  }
}
console.log("Tutorial navigation passed: all three readers at root/subpath, deferred buttons before load, top-level switching, and unchanged section/data/external links.");
