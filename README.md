# fia-test-web-standard

Dummy React/Vite web app for testing the FIA **standard web app** install flow.

## Purpose

Simulates a standard React/Vite app hosted on Vercel (or similar).  
The guide should:
- Find `index.html` and embed the widget `<script>` tag before `</body>`
- Detect the `build` script in `package.json` and run `npm run build`
- Use the `deploy` script (or ask about it)

## Register this tool on FIA

System type: **Web widget**  
Allowed Origins: `https://my-test-app.vercel.app` *(or any HTTPS URL)*
