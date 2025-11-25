# DOCX to Markdown Converter (Client Side)

**What this is**  
A static, client‑side web tool that converts `.docx` files to Markdown with embedded images as data URIs. No server required. Ideal for hosting on GitHub Pages.

## Files included
- `index.html` — main page
- `styles.css` — styling
- `app.js` — conversion logic using Mammoth and Turndown (CDN)

## Local testing
1. Clone or copy the files into a folder on your machine.
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox). No server required for basic testing.
   - Note: some browsers restrict `file://` fetches for large libraries; if you see errors, run a simple local server:
     - Python 3: `python -m http.server 8000` then open `http://localhost:8000`
     - Node (http-server): `npx http-server . -p 8000`

## Publish to GitHub Pages
1. Create a new GitHub repository (public or private).
2. Add the three files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
3. Commit and push to the `main` branch.
4. In the repository on GitHub, go to **Settings** → **Pages**.
5. Under **Build and deployment** choose **Deploy from a branch**.
6. Select branch `main` and folder `/ (root)`, then click **Save**.
7. After a moment GitHub will publish the site. The published URL will be shown in the Pages settings (format `https://<username>.github.io/<repo>` or `https://<username>.github.io` for user pages).
8. Open the published URL in your browser and test: upload a `.docx`, convert, copy, and download the `.md`.

## Notes and tips
- **No OAuth or Drive API required** for the basic flow. Users must download their Google Doc as `.docx` and upload it to the page if they want to convert a private Google Doc.
- **Data URIs**: images are embedded as base64 data URIs inside the Markdown. This keeps the `.md` self‑contained but can make files large for many or large images.
- **Large files**: very large `.docx` files or many large images may be slow or memory heavy in the browser.
- **Browser support**: modern browsers with `FileReader`, `Blob`, and `fetch` support are required.
- **Security**: do not add any API keys or secrets to the static repo. If you later add server features (image hosting, Drive API), implement a backend to keep secrets private.

## Optional enhancements
- Add a small server to host images instead of embedding data URIs.
- Add Google Drive export via Drive API with OAuth if you want direct private Docs import (requires backend or PKCE flow and additional configuration).
- Improve table conversion rules or keep complex tables as inline HTML.

## Troubleshooting
- If conversion fails with a library error, ensure the CDN links in `index.html` are reachable and not blocked by a network policy.
- If `index.html` opened via `file://` shows CORS or module errors, run a local HTTP server as described above.

