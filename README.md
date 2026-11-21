# Sentire Framework

The framework Sentire products are built on: Sentire Ledger, Sentire Payroll, Sentire Projects,
Sentire Helpdesk and Sentire LMS.

- **Python engine** (`frappe/` package): Sentire's own copy of Frappe Framework, kept with its
  full history so upstream fixes merge cleanly. Frappe apps (ERPNext included) install unchanged.
- **TypeScript kit** (`sentire-kit/`): connects Next.js apps (Prisma or Drizzle on Postgres) to the
  same events, API and sign-in.

| Doc | What |
|---|---|
| [docs-sentire/README.md](docs-sentire/README.md) | how to build from it and the release list |
| [docs-sentire/ECOSYSTEM.md](docs-sentire/ECOSYSTEM.md) | how Sentire apps talk to each other |
| [docs-sentire/UPSTREAM-SYNC.md](docs-sentire/UPSTREAM-SYNC.md) | taking a new Frappe release |
| [CHANGES-SENTIRE.md](CHANGES-SENTIRE.md) | every change from Frappe |
| [docs-sentire/LEGAL.md](docs-sentire/LEGAL.md) | licence and naming |

Sentire Framework is based on Frappe Framework by Frappe Technologies (MIT licence, see LICENSE).
Frappe is a registered trademark of Frappe Technologies Pvt. Ltd. Sentire is not affiliated with
or endorsed by Frappe Technologies.
