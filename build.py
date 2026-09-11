"""Generate portable static HTML in docs/. Run with Python 3.10+ and Jinja2."""

from __future__ import annotations

import argparse
from hashlib import sha256
from pathlib import Path
import shutil
import tempfile
from urllib.parse import urlparse

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from markupsafe import Markup

from diagrams import (DEFAULT_CENTER, DEFAULT_RESULTANT, DEFAULT_SIZE, SAMPLES,
                      geometry_svg, histogram, rose_svg, sample_at_resultant,
                      summary, wrap_comparison_svg)
from site_data import PAPERS, RESEARCH, SITE, TUTORIALS
from density_math import density_settings
from density_diagrams import density_panels

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "docs"


def build():
    env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=select_autoescape(["html", "xml"]), undefined=StrictUndefined)
    env.globals.update(site=SITE, tutorials=TUTORIALS, research=RESEARCH, papers=PAPERS,
                       rose_svg=Markup(rose_svg()), geometry=lambda kind: Markup(geometry_svg(kind)),
                       rose_stats=summary(sample_at_resultant(DEFAULT_RESULTANT)),
                       rose_counts=histogram(sample_at_resultant(DEFAULT_RESULTANT)),
                       rose_settings={"samples": SAMPLES, "center": DEFAULT_CENTER,
                                      "size": DEFAULT_SIZE, "resultant": DEFAULT_RESULTANT},
                       wrap_comparison_svg=Markup(wrap_comparison_svg()))
    env.globals.update(density_settings=density_settings(), density_panels=density_panels())
    # Styles and scripts must update alongside interactive content after a build.
    env.globals["asset_versions"] = {
        str(path.relative_to(ROOT / "static")): sha256(path.read_bytes()).hexdigest()[:16]
        for path in (ROOT / "static").rglob("*") if path.is_file() and path.suffix in {".css", ".js"}
    }
    pages = [
        ("", "home.html", "home", "Directional Statistics", SITE["description"], {}),
        ("foundations/", "foundations.html", "foundations", "An introduction to directional statistics", "Circles, spheres, circular means, and how to read a rose diagram.", {}),
        ("research/", "research_index.html", "research", "Research", "Bayesian research on priors, regression with a circular response, and regression with a circular covariate; papers and Stan implementations.", {}),
        ("tutorials/", "tutorials.html", "tutorials", "Tutorials", "Tutorials on directional statistics, with a section of Stan implementations for priors and circular regression.", {}),
        ("software/", "software.html", "software", "INLAcircular", "R package for Bayesian circular regression and joint circular models using INLA. Installation, basic documentation, and GitHub repository.", {}),
        ("contact/", "contact.html", "contact", "Contact", "Contact Xiang Ye about directional statistics.", {}),
    ]
    for topic in RESEARCH:
        tutorial = next(t for t in TUTORIALS if t["slug"] == topic["tutorial"])
        pages.append((topic["key"] + "/", "research.html", topic["key"], topic["title"], topic["summary"], {"topic": topic, "tutorial": tutorial}))
    for tutorial in TUTORIALS:
        pages.append((f'tutorials/{tutorial["slug"]}/', "tutorial.html", "tutorials", tutorial["title"], tutorial["summary"], {"tutorial": tutorial}))

    if len({t["slug"] for t in TUTORIALS}) != len(TUTORIALS):
        raise ValueError("Tutorial slugs must be unique.")
    for tutorial in TUTORIALS:
        folder = ROOT / "content" / "tutorials" / tutorial["slug"]
        for name in [tutorial["filename"], *tutorial["data_files"]]:
            if not (folder / name).is_file():
                raise FileNotFoundError(f"Missing tutorial asset: {folder / name}")

    # The iframe is a separately cached document. Its URL must change whenever
    # the supplied HTML changes, even if a copy preserves an old modification time.
    env.globals["tutorial_versions"] = {
        tutorial["slug"]: sha256(
            (ROOT / "content" / "tutorials" / tutorial["slug"] / tutorial["filename"]).read_bytes()
        ).hexdigest()[:16]
        for tutorial in TUTORIALS
    }

    origin = SITE["url"].rstrip("/")
    if origin and (urlparse(origin).scheme not in {"http", "https"} or not urlparse(origin).netloc):
        raise ValueError("SITE['url'] must be empty or an absolute http(s) URL.")

    # Render and validate before replacing the previous successful build.
    with tempfile.TemporaryDirectory(prefix=".build-", dir=ROOT) as staging:
        stage = Path(staging)
        stage.chmod(0o755)
        shutil.copytree(ROOT / "static", stage / "assets")
        for tutorial in TUTORIALS:
            source = ROOT / "content" / "tutorials" / tutorial["slug"]
            # Keep the export's directory names so its own tutorial switcher
            # and cross-document links work in full-document view as well.
            target = stage / "assets" / "tutorials" / tutorial["asset_dir"]
            target.mkdir(parents=True)
            for name in [tutorial["filename"], *tutorial["data_files"]]:
                shutil.copy2(source / name, target / name)
        for route, template, active, title, description, context in pages:
            prefix = "../" * len(Path(route).parts) if route else "./"
            url = lambda path, prefix=prefix: prefix + path.lstrip("/")
            html = env.get_template(template).render(active=active, title=title, description=description,
                                                     route=route, url=url, canonical=f"{origin}/{route}" if origin else "", **context)
            target = stage / route / "index.html"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(html, encoding="utf-8")
        (stage / ".nojekyll").touch()
        if (OUTPUT / "CNAME").is_file():
            shutil.copy2(OUTPUT / "CNAME", stage / "CNAME")

        from validate import validate
        validate(stage)
        previous = ROOT / ".docs-previous"
        if previous.exists():
            raise RuntimeError(".docs-previous exists; inspect this previous build before rebuilding.")
        if OUTPUT.exists():
            OUTPUT.rename(previous)
        try:
            stage.rename(OUTPUT)
        except OSError:
            if previous.exists():
                previous.rename(OUTPUT)
            raise
        if previous.exists():
            shutil.rmtree(previous)  # Only the successfully replaced generated build.
    print(f"Built {len(pages)} pages → {OUTPUT}")
    print("Preview: python3 -m http.server 8001 --bind 127.0.0.1 --directory docs")
    print("Open: http://localhost:8001/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    build()
