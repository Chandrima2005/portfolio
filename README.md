# Chandrima Das · Portfolio

## Folder structure

```
index.html              ← the built site (this is what gets deployed)
build.py                ← merges the files in src/ into index.html
src/
  layout.html           ← page skeleton: <head>, fonts, and the include order
  sections/
    home.html           ← intro, "Noise is loud", the four boxes, footer screen
    projects.html
    experience.html
    skills.html
    contact.html
  partials/
    loader.html         ← falling-letters loading screen
    header.html         ← top bar with the Menu button
    menu.html           ← full-screen menu
    effects.html        ← custom cursor, page-transition curtain, 3D background canvas
css/styles.css          ← all styling
js/main.js              ← all behaviour (routing, 3D background, animations)
assets/images/          ← project screenshots
```

## Making a change

1. Edit the file you need, for example `src/sections/projects.html`.
2. Run `python build.py` from this folder. It rebuilds `index.html`.
3. Commit and push. Vercel redeploys automatically.

Changes to `css/styles.css`, `js/main.js` or `assets/` don't need a rebuild,
because `index.html` links to them directly.

## Previewing locally

Run `python -m http.server` in this folder and open http://localhost:8000.
