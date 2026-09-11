# Development

[Back to the repository overview](README.md).

Xiang Ye’s research website, built with Python and Jinja into `docs/`.

## Public website

**Website: [https://xiangyestats.github.io/directional-statistics/](https://xiangyestats.github.io/directional-statistics/)**

[Source repository](https://github.com/XiangYEstats/directional-statistics).

Public links: [Research](https://xiangyestats.github.io/directional-statistics/research/),
[Tutorials](https://xiangyestats.github.io/directional-statistics/tutorials/),
[Density explorer](https://xiangyestats.github.io/directional-statistics/circular-outcomes/#lavm-distribution).

## Local preview

```bash
cd /home/xiang/websites/directional-statistics
python3 -m http.server 8001 --bind 127.0.0.1 --directory docs
```

Open [the website](http://localhost:8001/),
[the density explorer](http://localhost:8001/circular-outcomes/#lavm-distribution),
or [Tutorials](http://localhost:8001/tutorials/).

Leave the terminal running; press `Ctrl+C` to stop it. Reuse port 8001 if it
already serves this site. If another application uses it, choose another port,
such as 8002, and open
[http://localhost:8002/](http://localhost:8002/).
For Remote SSH, forward the chosen port in VS Code’s Ports panel.

## One-time setup

Python 3.10 or newer is required.

```bash
cd /home/xiang/websites/directional-statistics
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

## Update and rebuild

1. Edit the source files below. Do not edit `docs/`: it is generated.
2. Build and validate:

   ```bash
   cd /home/xiang/websites/directional-statistics
   .venv/bin/python build.py
   .venv/bin/python validate.py
   ```

3. Refresh [the local preview](http://localhost:8001/). Use `Ctrl+Shift+R` if needed.

Rebuild manually after each edit. The build validates the output before replacing
`docs/` and adds content hashes to asset URLs to refresh cached CSS, JavaScript
and tutorials.

### Publish an update

After building, validating and previewing, run the update helper:

```bash
/home/xiang/git_repos/update-directional-statistics.sh "Describe your changes"
```

Use a short commit message in place of `"Describe your changes"`. The helper must
exist at this path and have permission to update the Git repository. Publishing
is separate from building.

For initial GitHub Pages setup:

1. Set `SITE["url"]` in `site_data.py` to
   `https://xiangyestats.github.io/directional-statistics`, then rebuild.
2. Push the source and generated `docs/` to `main`; do not commit `.venv/`.
3. In [repository Settings → Pages](https://github.com/XiangYEstats/directional-statistics/settings/pages),
   select **Deploy from a branch → main → /docs**, then save.
4. Wait for the Pages deployment to succeed, then open the public website above.

If the public link returns **404**, check the publishing source and the
[Pages deployment in Actions](https://github.com/XiangYEstats/directional-statistics/actions).
See [GitHub’s publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
for the branch/folder settings. Use public tutorial URLs, not localhost links,
when linking from your personal site.

## Where to edit

| Content or feature | Source |
| --- | --- |
| Site details, research descriptions, papers and tutorial metadata | `site_data.py` |
| Page text and layouts | `templates/` |
| Header, navigation and footer | `templates/base.html` |
| Main theme, colours, typography and responsive layout | `static/css/site.css` |
| Package introduction and installation instructions | `templates/software.html` |
| Menus, rose-diagram controls and tutorial frames | `static/js/site.js` |
| Rose-diagram mathematics and initial figures | `static/js/circular-math.js`, `diagrams.py` |
| Density calculations and initial plots | `density_math.py`, `density_diagrams.py` |
| Interactive density calculations and rendering | `static/js/density-math.js`, `static/js/density-plots.js` |
| Density explorer layout and styling | `templates/_density_lab.html`, `static/css/density.css` |
| Tutorial HTML source copies | `content/tutorials/` |
| Build and validation | `build.py`, `validate.py` |

Set theme colours in `:root` in `static/css/site.css`. Embedded tutorials use
their own stylesheets.

The density explorer uses radians: 0 at the right, π/2 at the top, ±π at the left
and −π/2 at the bottom. Density rises outward from the reference circle;
the unwrapped view runs from −π to π. Both views label their density scales and
rescale continuously. Keep the Python and JavaScript implementations consistent.
Slider changes animate in 80 ms; reduced motion disables animation without
changing the density values. The LAvM η slider ranges from −10 to 10 in steps of
0.05. Transformed sampling resolves its narrow peaks even when κ is below 1.

## Replace tutorial documents

Tutorial files are copied and built in this order:

```text
Tutorial project: rendered .html exports
  → content/tutorials/: website source copies
  → build.py → docs/assets/tutorials/: served documents
             + docs/tutorials/<slug>/index.html: reading pages
```

1. Render the updated tutorials in `/home/xiang/Tutorials/Stan_circular_tutorials/`.
2. Copy the three exported HTML files into this website:

   ```bash
   cd /home/xiang/websites/directional-statistics
   cp /home/xiang/Tutorials/Stan_circular_tutorials/pc_prior/pc_prior.html content/tutorials/pc-prior/pc_prior.html
   cp /home/xiang/Tutorials/Stan_circular_tutorials/lavm/lavm.html content/tutorials/lavm/lavm.html
   cp /home/xiang/Tutorials/Stan_circular_tutorials/circular_joint_regression/circular_joint_regression.html content/tutorials/circular-joint-regression/circular_joint_regression.html
   ```

3. If the data changed, also copy each tutorial's `wind_data.rds` into its
   corresponding `content/tutorials/` folder. The LAvM and joint tutorials each
   have their own copy.
4. Update `TUTORIALS` in `site_data.py` to match each exported document. Use the
   document's date in both date fields:

   ```python
   "date": "2026-09-11",
   "display_date": "11 September 2026",
   ```

   Update `title`, `menu_title` and `summary` if the document's title or scope
   changed. Keep `slug` and `filename` unchanged when replacing these documents.
5. Rebuild and check the output:

   ```bash
   .venv/bin/python build.py
   .venv/bin/python validate.py
   .venv/bin/python scripts/test-tutorial-versions.py
   ```

   Validation checks local links and compares the generated tutorial files with
   the source copies. The version tests check that changed HTML gets a new URL,
   including when the file timestamp is preserved.
6. Start the server described in **Local preview**, open all three reading pages,
   and check the embedded document, its table of contents, equations,
   **Open full document**, **Download HTML** and any wind-data download.
   Check both desktop and narrow/mobile widths.
7. After previewing, use the **Publish an update** instructions above to update
   GitHub Pages. Copying and rebuilding only update the local website.

The build copies HTML unchanged into `docs/assets/tutorials/<asset_dir>/`.
`asset_dir` preserves the export folder names (`pc_prior`, `lavm`, and
`circular_joint_regression`) so the supplied switcher and relative cross-links
also work in full-document view. The public reading-page slugs are unchanged.
It does not modify
the tutorial project; changes there must be copied into this website before
rebuilding. To change a tutorial's appearance, edit its stylesheet, render it,
copy the HTML and rebuild. Keep exports self-contained, or update the build to
copy any companion assets. MathJax equation rendering requires internet access.

The build adds a SHA-256 `?v=<hash>` suffix to each tutorial's iframe, full-document
and HTML-download URLs. This refreshes cached documents without renaming files
or changing the reading-page routes.

Each embedded document has its own scrolling viewport so its supplied sticky
contents menu and active-section tracking work. The supplied Stan program
disclosures and copy buttons run unchanged. `site.js` connects the exported
tutorial links to the corresponding reading pages using `target="_top"`, so
switching tutorials also updates the page title and downloads. It connects
before iframe load because MathJax can delay that event.

Stable reading-page links:

- [PC priors](http://localhost:8001/tutorials/pc-prior/)
- [LAvM regression](http://localhost:8001/tutorials/lavm/)
- [Joint circular models](http://localhost:8001/tutorials/circular-joint-regression/)

Keep these route names unchanged when replacing documents so existing links
continue to work.

## Additional checks

Run these after changes to tutorial versioning or density calculations:

```bash
.venv/bin/python scripts/test-tutorial-versions.py
.venv/bin/python scripts/test-density-math.py
```

With Node available, also check the browser-side mathematics and controls:

```bash
node scripts/test-circular-math.cjs
node scripts/test-density-browser.cjs
node scripts/test-tutorial-navigation.cjs
```

Before publishing, check changed pages in a browser at desktop and mobile widths.
