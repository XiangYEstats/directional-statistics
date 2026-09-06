# Directional Statistics

Xiang Ye’s research website, built with Python and Jinja into `docs/`.

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

For initial GitHub Pages setup, set `SITE["url"]` in `site_data.py` to the public
site address, rebuild, and publish the generated `docs/` folder from your chosen
branch. Keep both source and `docs/` in the repository; do not commit `.venv/`.
Use public tutorial URLs, not localhost links, when linking from your personal site.

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

Render the updated tutorials in your tutorial project, then copy the exported
HTML into this website:

```bash
cd /home/xiang/websites/directional-statistics
cp /home/xiang/Tutorials/Stan_circular_tutorials/pc_prior/pc_prior.html content/tutorials/pc-prior/pc_prior.html
cp /home/xiang/Tutorials/Stan_circular_tutorials/lavm/lavm.html content/tutorials/lavm/lavm.html
cp /home/xiang/Tutorials/Stan_circular_tutorials/circular_joint_regression/circular_joint_regression.html content/tutorials/circular-joint-regression/circular_joint_regression.html
.venv/bin/python build.py
```

Also replace the matching `wind_data.rds` beside the LAvM or joint tutorial if
its data changes. Update titles, summaries or document dates in
`site_data.py` → `TUTORIALS` as needed.

The build copies these HTML files unchanged into `docs/assets/tutorials/`;
it never modifies the originals in your tutorial project. Updating the external
originals alone does not update the website. For theme changes, edit the tutorial’s
own stylesheet, render it again, copy the HTML and rebuild. Keep exports
self-contained; if you add companion assets, update the build to copy them too.
The current tutorials require internet access for MathJax equation rendering.

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
