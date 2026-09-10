# fia-test-web-standard

Dummy React/Vite web app for testing the FIA **standard web app** install flow.

## Purpose

Simulates a standard React/Vite SPA hosted on GitHub Pages — a real, live,
publicly-reachable HTTPS URL (no localhost, no CDN in front of it).
The guide should:
- Find `index.html` and embed the widget `<script>` tag before `</body>`
- Detect the `build` script in `package.json` and run `npm run build`
- Use the `deploy` script (`npm run deploy`, publishes `dist/` to the `gh-pages` branch)

## Live URL

https://saginizar.github.io/fia-test-web-standard/

## Register this tool on FIA

System type: **Web widget**  
Allowed Origins: `https://saginizar.github.io`
