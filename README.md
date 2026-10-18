# Toolbox

A static site for hosting small personal tools, built for GitHub Pages. No build step, no dependencies.

## Publish it

1. Create a repo named `<your-username>.github.io` (or any name, for a project site at `<user>.github.io/<repo>`).
2. Push these files to the `main` branch.
3. In the repo, go to **Settings → Pages**, set the source to **Deploy from a branch**, choose `main` and `/ (root)`, then save.
4. Visit `https://<your-username>.github.io` after a minute or so.

## Add a tool

1. Copy `tools/_template/` to `tools/<tool-name>/` and build it in `index.html`.
2. Add an entry to `tools.json`:

```json
[
  {
    "name": "Twitch Chat Generator",
    "description": "Generate fake chat messages for mockups and videos.",
    "icon": "💬",
    "tags": ["twitch", "generator"],
    "path": "tools/twitch-chat/"
  }
]
```

The homepage reads `tools.json`, so the card, search, and tag filters update automatically.

## Run locally

`tools.json` is loaded with `fetch`, so open the site through a local server rather than double-clicking the file:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Customize

- Colors and fonts: the variables at the top of `assets/style.css`.
- Site name: `index.html` (the `<title>`, brand link, and headline).
