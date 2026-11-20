# Sentire Framework: changes from Frappe Framework

Sentire Framework is Sentire's own copy of Frappe Framework, kept with Frappe's full git
history so upstream releases merge in cleanly. This file lists every change from upstream.
Keep the list short: each line here is a line that can conflict in an upstream merge.

- Based on: Frappe Framework v16.60.2 (commit 2df0425571ebbaed878eabc3edc5b7e7c3327ae0)
- This release: v16.60.2-sentire.1
- Branch: sentire-16

## Never changed (compatibility)
- The Python package stays `frappe`, with its module paths and the `frappe.` API, so
  ERPNext and every Frappe app install unchanged.
- `__version__` in frappe/__init__.py stays the upstream number. The `-sentire.N` suffix
  lives only in git tags and frappe/sentire.py. (A suffix in `__version__` is not a valid
  Python version and breaks `bench init`.)
- Translation files (frappe/locale) are not edited; upstream regenerates them.
- Names of real Frappe products (Frappe Cloud, Frappe Mail, Frappe CRM, OAuth app names in
  setup guides) are left as they are, because renaming them would be untrue.

## Name and look (where the framework names itself)
| File | Change |
|---|---|
| frappe/hooks.py | app_title "Sentire Framework"; app_publisher credits Frappe Technologies |
| frappe/www/login.py | fallback product name "Sentire Framework" (used only when no app name is set) |
| frappe/templates/base.html | build comment and `<meta name="generator" content="sentire-framework">` |
| frappe/templates/includes/footer/footer_powered.html | "Built on Sentire Framework" |
| frappe/public/js/frappe/ui/toolbar/about.js | About: Sentire logo, tagline "based on Frappe Framework (MIT)", "Sentire Framework Version", links to sentire.solutions and this repo; forum link removed |
| frappe/templates/emails/standard.html, auth_email.html | fallback links to sentire.solutions; logo alt text |
| frappe/public/images/frappe-*.svg/png, framework.png | Frappe's logo files replaced with the Sentire Framework mark (file names kept so no code changes) |

## No calls home, no ads
| File | Change |
|---|---|
| frappe/utils/change_log.py | the update check and its popup do nothing unless the site config sets `sentire_enable_update_check: 1` |
| frappe/core/doctype/system_settings/system_settings.json | defaults: Disable System Update Notification = 1, Disable Product Suggestion = 1 |
| frappe/public/js/frappe/ui/sidebar/sidebar.js | the Frappe CRM and Helpdesk sidebar ads show only if boot sets `sentire_product_suggestions` |
| pyproject.toml | Homepage, Repository and Bug Reports point at this repo |

## Added (new files, never conflict)
| Path | What |
|---|---|
| frappe/sentire.py | release identity, `frappe.sentire.info` API, and the Sentire event format (sign, verify, emit) |
| sentire-kit/ | the TypeScript kit for Next.js apps: events, Frappe API client, sign-in helpers, app list, design tokens |
| docs-sentire/ | ecosystem, upstream sync, legal and naming |
| .sentire/upstream.json | the upstream tags this release is based on |
| .github/workflows/sentire-kit.yml | kit tests and the Python and TypeScript cross-check |
| .github/workflows/upstream-watch.yml | daily issue when Frappe or ERPNext publishes a newer v16 tag or a security advisory |

## Removed
- All of Frappe's own GitHub workflows (.github/workflows/*). They run Frappe's release,
  translation and test jobs and need Frappe's credentials. Products test the framework in
  their own CI (for example ph-cas runs its full suite on it).

## Licence
LICENSE keeps Frappe's MIT text and copyright line, with Sentire's line added below it.
