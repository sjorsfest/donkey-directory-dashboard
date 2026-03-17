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
2. Open `http://localhost:5173/connect-extension`.
3. Generate a one-time code.
4. In the extension popup, choose **Connect with code** and paste the code.

## Migration note (billing update)

- `directory_id` is now required for fill-form.
- Billing UI and EUR pricing added.
- Lifetime plan updated to `€50`.
