# Authentication

Self-hosted. No third-party auth service.

## Model

JWT access token + refresh token stored in PostgreSQL.

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access JWT | 15 minutes | Memory or sessionStorage |
| Refresh token | 14 days | httpOnly cookie when online; secure local storage for offline (phase 2) |

## Login flow

```
POST /auth/login
  { email, password }
  → validates Argon2id hash
  → returns { accessToken, user }
  → sets httpOnly refresh cookie
```

## Refresh flow

```
POST /auth/refresh
  (refresh cookie)
  → validates token hash in DB
  → rotates refresh token (old one invalidated)
  → returns new accessToken
```

## Logout

```
POST /auth/logout
  → invalidates refresh token in DB
  → clears cookie
```

## Roles

| Role | Permissions |
|------|-------------|
| `agent` | CRUD own farmers, view own dashboard |
| `team_lead` | View office farmers, resolve conflicts, reports |
| `admin` | Full access, manage users, all reports |

Enforced in API middleware on every protected route.

## Offline behaviour (phase 2)

1. Agent logs in while online — tokens cached locally.
2. Field work proceeds offline using cached access token and agent ID on queued records.
3. On reconnect, client refreshes token if expired, then syncs queue.
4. Force re-login after 14 days offline.

## Security requirements

- Argon2id password hashing
- HTTPS in production (TLS on VPS — provider TBD)
- Rate limiting on `/auth/login` (5 attempts / 15 min per IP)
- Refresh token rotation with revocation
- MFA (TOTP) for `admin` and `team_lead` — add after core login works
- All auth events written to audit log

## User provisioning

- Admins create agent accounts via API or admin UI
- No self-registration
- Deactivated users cannot log in; historical records retain their `created_by` link
