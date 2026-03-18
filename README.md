# Donkey Directories Dashboard (React Router)

Simple React Router app to interact with the Donkey Directories API.

## Included logic

- API base URL from server env `API_BASE_URL`
- Signup: `POST /api/v1/auth/register`
- Login page: `/login` using `POST /api/v1/auth/login`
- Social login buttons on `/login`:
  - Google -> OAuth start path `/auth/oauth/google/start`
  - X -> OAuth start path `/auth/oauth/twitter/start`
  - Callback route: `/auth/callback`
    - Accepts `access_token` + `refresh_token` in query params
    - Supports OAuth code exchange (`code` + `provider`) on the server
- Session auth: server-side cookie session (`accessToken` + `refreshToken`) with refresh on `401`
- Home route actions run protected API calls server-side:
  - Current user check: `GET /api/v1/auth/me`
  - Brand extraction form: `POST /api/v1/brand/extract`
  - Logout: session cookie destruction
- Request/response log panel

## Run locally

Set server env var:

```bash
API_BASE_URL=http://localhost:8000
VITE_MAIN_DOMAIN=donkey.directory
```

Or create `.env`:

```bash
API_BASE_URL=http://localhost:8000
VITE_MAIN_DOMAIN=donkey.directory
# Optional extension overrides:
# VITE_WEB_APP_ORIGIN=https://donkey.directory
# VITE_EXTENSION_API_BASE_URL=https://api.yourdomain.com
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build + typecheck

```bash
npm run typecheck
npm run build
```
