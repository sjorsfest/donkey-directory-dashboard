# Connect Extension Backend Requirements

This frontend now expects a one-time code exchange flow for Chrome extension login.

## Endpoints

### 1) Mint one-time code

- Method: `POST`
- Path: `/api/v1/auth/extension/connect-codes`
- Auth: required bearer token (web user session token)
- Request body:

```json
{
  "client": "chrome_extension"
}
```

- Success (`201`):

```json
{
  "code": "ABCD-EFGH",
  "expires_at": "2026-03-10T15:30:45Z",
  "expires_in_seconds": 60
}
```

### 2) Exchange one-time code

- Method: `POST`
- Path: `/api/v1/auth/extension/connect-codes/exchange`
- Auth: none
- Request body:

```json
{
  "client": "chrome_extension",
  "code": "ABCD-EFGH"
}
```

- Success (`200`):

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "email": "user@example.com"
  }
}
```

- Invalid code (`400`):

```json
{
  "error": "invalid_or_expired_code"
}
```

## Data Model

Add table `extension_connect_codes`:

- `id` UUID PK
- `user_id` UUID FK (indexed)
- `client` text (only `chrome_extension`)
- `code_hash` text unique (HMAC hash, never store raw code)
- `expires_at` timestamptz
- `consumed_at` timestamptz nullable
- `created_at` timestamptz default now()
- `created_ip` inet nullable
- `consumed_ip` inet nullable

Suggested migration:

```sql
create table extension_connect_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  client text not null,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  created_ip inet null,
  consumed_ip inet null
);

create index extension_connect_codes_user_id_idx
  on extension_connect_codes (user_id);

create index extension_connect_codes_lookup_idx
  on extension_connect_codes (client, code_hash, expires_at, consumed_at);
```

## Security Rules

- TTL = 60 seconds
- Single-use exchange (atomic consume):

```sql
update extension_connect_codes
set consumed_at = now(), consumed_ip = :ip
where client = :client
  and code_hash = :code_hash
  and consumed_at is null
  and expires_at > now()
returning user_id;
```

- Hash formula:
  - `code_hash = HMAC_SHA256(raw_code, EXT_CONNECT_CODE_SECRET)`
- Invalidate previously unconsumed codes for same `(user_id, client)` at mint time.
- Rate limits:
  - mint: max 5/min per user
  - exchange: max 10/min per IP
- Do not distinguish invalid vs expired vs already used; always return `invalid_or_expired_code`.
- Audit log both mint and exchange attempts.

## Token Issuance

Issue extension-scoped tokens at exchange:

- `aud = donkey-directory-extension`
- include claim: `client = chrome_extension`
- include extension-appropriate scopes

Refresh endpoint (`/api/v1/auth/refresh`) must preserve extension token audience/client/scopes when refresh token belongs to extension flow.

## OpenAPI

Expose both new endpoints and schemas in OpenAPI:

- `CreateExtensionConnectCodeRequest`
- `CreateExtensionConnectCodeResponse`
- `ExchangeExtensionConnectCodeRequest`
- `ExchangeExtensionConnectCodeResponse`

After backend ships these, regenerate frontend types with:

```bash
npm run gen:api
```
