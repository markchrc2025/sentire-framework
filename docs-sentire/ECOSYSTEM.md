# The Sentire ecosystem

Every Sentire app keeps its own database. Apps never read or write each other's tables;
they talk through the API and through signed events. This keeps Ledger's BIR controls
(locked documents, audit trail, BIR series) intact whatever another app does.

## Shared pieces
| Piece | Python engine | TypeScript kit |
|---|---|---|
| Release identity | frappe.sentire.info | FrappeClient.frameworkInfo() |
| Events | frappe.sentire.emit_event / verify | sendEvent / receiveEvent |
| API calls into a Frappe app | REST /api/resource, /api/method | FrappeClient |
| Sign-in (one Sentire Account) | Frappe's OAuth 2 and OpenID Connect provider | authorizeUrl / exchangeCode / userInfo |
| Company (tenant) | header X-Sentire-Company | COMPANY_HEADER |
| Look | Sentire logos in this repo | tokens.css |

## Event format: sentire.event.v1
Body (compact JSON):
    {"specversion":"sentire.event.v1","id":"<uuid>","type":"payroll.run.approved",
     "source":"payroll","company":"<company id>","time":"2026-11-21T01:00:00Z","data":{...}}
Header: `X-Sentire-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`.
Receivers reject a wrong signature or one older than 300 seconds. Each pair of apps has its
own secret, kept in the app's environment (Dokploy) or site config, never in code or chat.

## Event types
| Type | From | To | Effect |
|---|---|---|---|
| payroll.run.approved | Payroll | Ledger | Ledger makes a DRAFT journal entry; the accountant reviews and posts it |
| payroll.run.paid | Ledger | Payroll | Payroll marks the run paid |
| ledger.journal.posted | Ledger | Payroll | confirms the payroll entry was posted |
| ledger.task.created | Ledger | Projects | Projects creates the task with its link back to Ledger |
| projects.task.updated | Projects | Ledger | status and assignee kept in step |
| account.company.updated | Sentire Account | all | company name, plan and users kept in step |

Amounts in events are strings with centavos ("125000.00"), never floating point numbers.

## Rules
1. No shared databases. 2. Payroll never posts to Ledger's books; it proposes a draft.
3. A new event type is added to sentire-kit/src/ecosystem.ts and this table together.
