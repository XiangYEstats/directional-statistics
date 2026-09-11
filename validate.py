"""Check the generated site, local links, tutorial copies and circular geometry."""

from __future__ import annotations

import argparse
from collections import Counter
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

from diagrams import DEFAULT_RESULTANT, SAMPLES, histogram, sample_angles, sample_at_resultant, summary
from site_data import RESEARCH, TUTORIALS

ROOT = Path(__file__).resolve().parent


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.h1 = 0
        self.has_title = False
        self.has_lang = False
        self.has_description = False
        self.iframes = []
        self.inputs = []
        self.labels = []
        self.density_cards = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self.has_title = True
        if tag == "html":
            self.has_lang = bool(attrs.get("lang"))
        if tag == "meta" and attrs.get("name") == "description":
            self.has_description = bool(attrs.get("content"))
        if tag == "iframe":
            self.iframes.append(attrs)
        if tag == "input":
            self.inputs.append(attrs)
        if tag == "label" and attrs.get("for"):
            self.labels.append(attrs["for"])
        if "data-density-card" in attrs:
            self.density_cards.append(attrs["data-density-card"])
        for key in ("src", "href"):
            if attrs.get(key):
                self.links.append(attrs[key])


def validate(output):
    output = output.resolve()
    errors = []
    pages = sorted(p for p in output.rglob("*.html") if "assets" not in p.relative_to(output).parts)
    expected_pages = 6 + len(RESEARCH) + len(TUTORIALS)
    if len(pages) != expected_pages:
        errors.append(f"Expected {expected_pages} site pages, found {len(pages)}")
    expected_tutorials = {t["slug"] for t in TUTORIALS}
    actual_tutorials = {p.parent.name for p in (output / "tutorials").glob("*/index.html")}
    if actual_tutorials != expected_tutorials:
        errors.append(f"Unexpected tutorial pages: {actual_tutorials ^ expected_tutorials}")
    if not (output / "research" / "index.html").is_file():
        errors.append("Missing research overview")

    documents = {}
    for page in output.rglob("*.html"):
        documents[page.resolve()] = Document(page)
    link_count = 0
    for page, doc in documents.items():
        relative = page.relative_to(output)
        original = "assets" in relative.parts
        if not original:
            duplicates = [name for name, count in Counter(doc.ids).items() if count > 1]
            if duplicates:
                errors.append(f"{relative}: duplicate IDs {duplicates}")
            if doc.h1 != 1 or not doc.has_title or not doc.has_lang or not doc.has_description:
                errors.append(f"{relative}: missing unique h1, title, language or description")
            for frame in doc.iframes:
                if not frame.get("title"):
                    errors.append(f"{relative}: iframe needs an accessible title")
        for link in doc.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc:
                continue
            if parsed.path.startswith("/"):
                errors.append(f"{relative}: root-relative link breaks repository hosting: {link}")
                continue
            target = (page.parent / unquote(parsed.path)).resolve() if parsed.path else page
            if target.is_dir():
                target /= "index.html"
            if not target.is_relative_to(output) or not target.exists():
                errors.append(f"{relative}: broken local link {link}")
                continue
            link_count += 1
            fragment = unquote(parsed.fragment)
            if fragment and target in documents and fragment not in documents[target].ids:
                errors.append(f"{relative}: missing anchor {link}")

    density_doc = documents.get(output / "circular-outcomes" / "index.html")
    if density_doc is None or density_doc.density_cards != ["vm", "lavm"]:
        errors.append("Circular-response research page needs both density explorers")
    else:
        from math import pi
        from density_math import KAPPA_MAX, KAPPA_STEP
        expected_controls = {
            "vm-location": (-pi, pi, "any"), "lavm-location": (-5, 5, 0.05),
            "vm-kappa": (0, KAPPA_MAX, KAPPA_STEP), "lavm-kappa": (0, KAPPA_MAX, KAPPA_STEP),
        }
        actual_controls = {item.get("id"): item for item in density_doc.inputs if item.get("type") == "range"}
        if set(actual_controls) != set(expected_controls):
            errors.append("Density explorers need all four parameter sliders")
        for name, bounds in expected_controls.items():
            control = actual_controls.get(name, {})
            try:
                actual_bounds = (float(control["min"]), float(control["max"]),
                                 "any" if control["step"] == "any" else float(control["step"]))
            except (KeyError, ValueError):
                actual_bounds = None
            if actual_bounds != bounds or name not in density_doc.labels:
                errors.append(f"Density slider bounds or accessible label are invalid: {name}")

    for tutorial in TUTORIALS:
        for name in [tutorial["filename"], *tutorial["data_files"]]:
            source = ROOT / "content" / "tutorials" / tutorial["slug"] / name
            copied = output / "assets" / "tutorials" / tutorial["asset_dir"] / name
            if not copied.is_file() or sha256(source.read_bytes()).digest() != sha256(copied.read_bytes()).digest():
                errors.append(f"Tutorial copy does not match source: {tutorial['slug']}/{name}")

        source_html = ROOT / "content" / "tutorials" / tutorial["slug"] / tutorial["filename"]
        version = sha256(source_html.read_bytes()).hexdigest()[:16]
        document_url = f"../../assets/tutorials/{tutorial['asset_dir']}/{tutorial['filename']}?v={version}"
        reader = documents.get(output / "tutorials" / tutorial["slug"] / "index.html")
        if reader is None or len(reader.iframes) != 1 or reader.iframes[0].get("src") != document_url:
            errors.append(f"Tutorial iframe needs the current content version: {tutorial['slug']}")
        # The embedded document, full-document button and HTML download must all
        # request the same version, not an older separately cached document.
        if reader is None or reader.links.count(document_url) != 3:
            errors.append(f"Tutorial document links need the current content version: {tutorial['slug']}")

    wrap = summary([359, 1])
    if min(wrap["mean"], 360 - wrap["mean"]) > 1e-8:
        errors.append("Circular mean of 359° and 1° must be 0°")
    for key in ("opposed", "balanced"):
        if summary(sample_angles(SAMPLES[key]))["mean"] is not None:
            errors.append(f"{key}: zero-resultant sample must have an undefined mean")
    angles = sample_at_resultant(DEFAULT_RESULTANT)
    before, after = summary(angles), summary([(a + 95) % 360 for a in angles])
    if abs(before["resultant"] - after["resultant"]) > 1e-12:
        errors.append("Rotation must preserve mean resultant length")
    if abs((after["mean"] - before["mean"]) % 360 - 95) > 1e-8:
        errors.append("Rotating all data must rotate the mean by the same angle")
    for target in (0, .01, .2, DEFAULT_RESULTANT, .95, .99, 1):
        for center in (0, 67.5, 359):
            controlled = sample_at_resultant(target, center)
            result = summary(controlled)
            if abs(result["resultant"] - target) > 1e-10:
                errors.append(f"Concentration control misses target R={target}")
            if sum(histogram(controlled)) != len(controlled):
                errors.append("Rose diagram loses observations")
            if target == 0 and result["mean"] is not None:
                errors.append("R=0 must not display a mean direction")
    for tutorial in TUTORIALS:
        if tutorial.get("implementation") != "Stan":
            errors.append(f"Tutorial implementation must be Stan: {tutorial['slug']}")
    if errors:
        raise ValueError("Site validation failed:\n" + "\n".join(errors))
    print(f"Validated {len(pages)} pages, {len(TUTORIALS)} tutorial documents, {link_count} local links; tutorial copies and circular summaries OK.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT / "docs")
    args = parser.parse_args()
    validate(args.directory)
