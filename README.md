# Directional Statistics

Xiang Ye’s research website, built with Python and Jinja into `docs/`.

## Public website

**Website: [https://xiangyestats.github.io/directional-statistics/](https://xiangyestats.github.io/directional-statistics/)**

[GitHub repository](https://github.com/XiangYEstats/directional-statistics)
contains the source code; the GitHub Pages link above is the website for readers.

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

Keep the terminal running; press `Ctrl+C` to stop it. If port 8001 is already
serving this site, use the existing server. If another application occupies it,
choose another port, for example 8002, and open
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

The preview server does not rebuild automatically. The build validates the new
output before replacing `docs/`. Styles, scripts and embedded tutorials receive
content-based version URLs when their contents change.

### Publish an update

Once your update helper and Git permissions are ready, run:

```bash
/home/xiang/git_repos/update-directional-statistics.sh "Describe your changes"
```

Replace the quoted text with a short description of the update. Build, validate
and preview first. This command assumes your helper exists at that path and
Git permissions are configured. The website build does not run it automatically.

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

Start with the `:root` variables in `static/css/site.css` when changing the theme.
Embedded tutorials have their own styles: they do not inherit the website’s CSS.

The density explorer uses radians: 0 at the right, π/2 at the top, ±π at the left
and −π/2 at the bottom. Density rises outward from the reference circle;
the unwrapped view runs from −π to π. Both views use labelled, continuously
adaptive density scales. Keep the Python and JavaScript implementations
consistent when changing these plots. Slider changes animate smoothly; the
reduced-motion setting disables animation without changing the density values.

## Replace tutorial documents

The update flows through three locations:

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
   have their own copy. For the 7 September 2026 update, both data files already
   matched the tutorial project, so no data replacement was needed.
4. Edit `site_data.py` → `TUTORIALS` so the reading-page metadata agrees with
   each exported document. Match the document's date, not the date you copied it.
   Keep both date fields consistent; for example:

   ```python
   "date": "2026-09-07",
   "display_date": "7 September 2026",
   ```

   Update `title`, `menu_title` and `summary` if the document's title or scope
   changed. Keep `slug` and `filename` unchanged when replacing these documents.
5. Rebuild and check the output:

   ```bash
   .venv/bin/python build.py
   .venv/bin/python validate.py
   .venv/bin/python scripts/test-tutorial-versions.py
   ```

   Validation checks local links and confirms that generated tutorial files
   exactly match the website source copies. The version tests check that changed
   HTML receives a new URL even if its file timestamp is preserved.
6. Start the server described in **Local preview**, open all three reading pages,
   and check the embedded document, its table of contents, equations,
   **Open full document**, **Download HTML** and any wind-data download.
   Check both desktop and narrow/mobile widths.
7. After previewing, use the **Publish an update** instructions above to update
   GitHub Pages. Copying and rebuilding only update the local website.

The build copies these HTML files unchanged into `docs/assets/tutorials/`;
it never modifies the originals in your tutorial project. Updating the external
originals alone does not update the website. For theme changes, edit the tutorial’s
own stylesheet, render it again, copy the HTML and rebuild. Keep exports
self-contained; if you add companion assets, update the build to copy them too.
The current tutorials require internet access for MathJax equation rendering.

Each rebuild calculates a SHA-256 content hash for each tutorial and adds a
`?v=<hash>` suffix to its iframe, full-document and HTML-download URLs. This
refreshes cached documents automatically; you do not need to rename the HTML
files or edit generated links. The stable reading-page routes stay the same.

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
```

Inspect changed pages in the browser at desktop and narrow/mobile widths before
publishing. Numerical tests do not replace a visual check.
