# Chrome Extension

Build before loading in Chrome:

```bash
npm run ext:build
```

Then load unpacked from:

- `chrome-extension/` (uses `manifest.json` and `dist/popup.html`)
- or `chrome-extension/dist/` (uses generated `manifest.json`)

## Connect with web login

1. Log into the dashboard web app.
2. Open your dashboard origin + `/connect-extension` (defaults to `http://localhost:5173/connect-extension` in dev).
3. Generate a one-time code.
4. In the extension popup, choose **Connect with code** and paste the code.

## Env vars

Extension builds read env vars from the repo root (`../.env`):

- `VITE_MAIN_DOMAIN` (default `donkey.directory`)
- `VITE_WEB_APP_ORIGIN` (optional explicit override for dashboard origin)
- `VITE_EXTENSION_API_BASE_URL` (optional explicit override for extension API base URL; defaults to `http://127.0.0.1:8000` in dev and `https://$VITE_MAIN_DOMAIN` in production)

## Migration note (billing update)

- `directory_id` is now required for fill-form.
- Billing UI and EUR pricing added.
- Lifetime plan updated to `€69`.
