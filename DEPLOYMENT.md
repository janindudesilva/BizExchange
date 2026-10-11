# BizExchange Staging & Production Deployment Guide

## 1. System Architecture & Prerequisites
- **Frontend**: Next.js 16 (App Router, Node.js 20+ runtime)
- **Backend**: Spring Boot 3.3.4 (Java 17 runtime)
- **Database**: PostgreSQL 16+
- **Persistent Storage**: Binary file storage directly in PostgreSQL (`business_files` table with `BYTEA` data), preserving uploaded business documents, financial reports, and images across container and app restarts without disk mount dependencies.

---

## 2. Configuration & Environment Variables

All sensitive values must be injected via environment variables. The backend's `ProductionConfigurationValidator` enforces strict fail-fast validation at startup, preventing startup if default, short, or placeholder values are detected.

### Backend (`spring.profiles.active=prod` or `staging`)

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `DB_URL` | **Yes** | PostgreSQL JDBC connection URL | `jdbc:postgresql://db.prod.internal:5432/BizExchange` |
| `DB_USERNAME` | **Yes** | Database username (least-privilege runtime user) | `bizexchange_app` |
| `DB_PASSWORD` | **Yes** | Database password (non-default, non-placeholder) | *`[secure-random-password]`* |
| `JWT_SECRET` | **Yes** | 256-bit secret key (min 32 characters, high entropy) | *`[32+-char-random-secret]`* |
| `FRONTEND_URL` | **Yes** | Canonical frontend URL for verification links | `https://bizexchange.lk` |
| `CORS_ALLOWED_ORIGINS`| **Yes** | Allowed origins (no wildcards `*`, non-localhost) | `https://bizexchange.lk` |
| `ADMIN_EMAIL` | **Yes** | Bootstrap administrator email | `admin@bizexchange.lk` |
| `ADMIN_PASSWORD` | **Yes** | Bootstrap administrator password | *`[strong-admin-password]`* |
| `SPRING_MAIL_HOST` | Conditional | SMTP Server Host | `smtp.sendgrid.net` |
| `SPRING_MAIL_PORT` | Conditional | SMTP Port | `587` |
| `MAIL_USERNAME` | Conditional | SMTP Username | `apikey` |
| `MAIL_PASSWORD` | Conditional | SMTP Password / API Key | *`[smtp-password]`* |
| `RESEND_API_KEY` | Conditional | Resend Transactional Email Key | `re_xxxxxxxxxxxx` |
| `RESEND_FROM_ADDRESS` | Conditional | Verified Sender Domain | `noreply@bizexchange.lk` |

> [!CAUTION]
> `app.test-mailbox.enabled` is strictly disabled by default. Enabling it under `prod` or `staging` profiles will trigger an immediate startup abort via `ProductionConfigurationValidator`.

### Frontend (Build-Time Variables)
Next.js inlines `NEXT_PUBLIC_*` variables during the `next build` command:

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | Public Backend API base URL | `https://api.bizexchange.lk/api` |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Canonical site URL for metadata | `https://bizexchange.lk` |

---

## 3. Reverse Proxy & HTTPS Configuration

The backend is configured to accept forwarded headers (`server.forward-headers-strategy=framework` and `app.security.trust-forwarded-headers=true`).

### NGINX Sample Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name bizexchange.lk;

    ssl_certificate /etc/letsencrypt/live/bizexchange.lk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bizexchange.lk/privkey.pem;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API & Actuator
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25M;
    }

    location /actuator/health {
        proxy_pass http://127.0.0.1:8080/actuator/health;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 4. Database Operations, Migrations & Least Privilege

### Least-Privilege Provisioning
1. **Migration User (`bizexchange_migrator`)**: Has DDL privileges (`CREATE`, `ALTER`, `DROP`) to execute Flyway migrations V1–V9.
2. **Application Runtime User (`bizexchange_app`)**: Has only DML privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on application tables.

```sql
-- DDL Migration User
CREATE USER bizexchange_migrator WITH PASSWORD 'strong_migrator_pass';
GRANT ALL PRIVILEGES ON DATABASE "BizExchange" TO bizexchange_migrator;

-- Runtime Application User
CREATE USER bizexchange_app WITH PASSWORD 'strong_runtime_pass';
GRANT CONNECT ON DATABASE "BizExchange" TO bizexchange_app;
\c BizExchange
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bizexchange_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bizexchange_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bizexchange_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO bizexchange_app;
```

### Flyway Migrations
Migrations are applied sequentially and validated on startup:
```bash
# Verify checksums and applied history without starting app
./mvnw flyway:info -Dflyway.configFiles=flyway.conf
```

### Pre-V5 Legacy Protection Procedure
If upgrading a pre-existing database that contains unmigrated duplicate inquiries:
```bash
psql -h $DB_HOST -U $DB_USER -d BizExchange -f scripts/pre_v5_inquiry_data_protection.sql
```
This closes duplicate active inquiries while preserving all inquiry records and messages before applying V5.

---

## 5. Persistent Storage & Backups

All business uploads (images, PDFs, documents) are stored in `business_files` (`data BYTEA`). Standard PostgreSQL backups safeguard both schema, relational records, and uploaded files in a single transactional snapshot.

### Backup Command
```bash
pg_dump -h $DB_HOST -p 5432 -U $DB_USER -F c -b -f /var/backups/bizexchange_$(date +%Y%m%d_%H%M%S).dump BizExchange
```

### Restore Command
```bash
pg_restore -h $DB_HOST -p 5432 -U $DB_USER -d BizExchange --clean --if-exists /var/backups/bizexchange_YYYYMMDD_HHMMSS.dump
```

---

## 6. Health Checks, Monitoring & Rollback

- **Health Check Endpoint**: `GET /actuator/health`
  - Returns `{"status":"UP"}` when database pool is active.
- **Rollback Procedure**:
  1. Roll back the frontend container/binary to the previous stable image tag.
  2. Roll back the backend container/binary to the previous stable image tag.
  3. Migrations V1–V9 maintain additive backwards compatibility; if schema rollback is needed, restore the pre-deployment `pg_dump` snapshot.
