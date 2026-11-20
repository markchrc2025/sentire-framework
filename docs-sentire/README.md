# Sentire Framework

The framework Sentire products are built on.

| Part | For | Products |
|---|---|---|
| Python engine (this repo's `frappe/` package) | Frappe apps | Sentire Ledger, Sentire Helpdesk, Sentire LMS |
| TypeScript kit (`sentire-kit/`) | Next.js apps on Postgres, with Prisma or Drizzle | Sentire Payroll, Sentire Projects |

Both parts share one event format, one company ID header and one sign-in, described in
ECOSYSTEM.md. The engine is based on Frappe Framework (MIT); see LEGAL.md.

## Using the Python engine
    bench init --frappe-path https://github.com/markchrc2025/sentire-framework \
               --frappe-branch v16.60.2-sentire.1 my-bench
Always pin a tag, never the branch. Tags are never moved: a fix gets the next -sentire.N.

## Using the TypeScript kit
    npm install "github:markchrc2025/sentire-framework#v16.60.2-sentire.1" (then build sentire-kit)
or copy `sentire-kit/` into the app as a workspace package. See sentire-kit/src for the API.

## Releases
| Tag | Based on | Notes |
|---|---|---|
| v16.60.2-sentire.1 | Frappe v16.60.2 | first Sentire release |
