# Chandrima Das · Portfolio

## Folder structure

```
index.html              ← the built site (this is what gets deployed)
build.py                ← merges the files in src/ into index.html
src/
  layout.html           ← page skeleton: <head>, fonts, and the include order
  sections/
    home.html           ← full-screen pages, one per scroll: intro with a "Currently" panel, then the files below
    projects.html       ← all five projects on one page, 3 x 2 grid (/projects)
    project-details.html← one page per project (/projects/gradient-atlas, /projects/index, ...)
    experience.html     ← timelines for work + research and education (/experience, /education)
    skills.html         ← animated skills deck and tools marquee (/skills)
    contact.html        ← contact rows and footer (/contact)
  partials/
    loader.html         ← falling-letters loading screen
    header.html         ← top bar: section links and the Menu button
    menu.html           ← full-screen menu
    effects.html        ← custom cursor, page-transition curtain, 3D background canvas
css/styles.css          ← all styling
js/main.js              ← all behaviour (page scrolling, routing, 3D background, animations)
vercel.json             ← sends clean paths like /projects to index.html
serve.py                ← local preview server that does the same
assets/images/          ← project screenshots
```

## Making a change

1. Edit the file you need, for example `src/sections/projects.html`.
2. Run `python build.py` from this folder. It rebuilds `index.html`.
3. Commit and push. Vercel redeploys automatically.

Changes to `css/styles.css`, `js/main.js` or `assets/` don't need a rebuild,
because `index.html` links to them directly.

## Previewing locally

Run `python serve.py` in this folder and open http://localhost:8000.
(`python -m http.server` won't work for paths like /projects.)
