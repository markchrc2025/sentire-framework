# Upstream sync runbook

Run this when the daily Upstream watch workflow opens an issue (new Frappe v16 tag or a
security advisory), and always before bumping ERPNext in Ledger, since each ERPNext
release can raise the minimum Frappe version it needs.

## One-time setup in a clone
    git remote add frappe https://github.com/frappe/frappe   # named "frappe": inside a bench, "upstream" already means this repo
    git fetch frappe --tags

## Each sync (example: v16.61.0)
1. `git checkout sentire-16 && git fetch frappe --tags`
2. `git merge v16.61.0` and resolve conflicts. Only the files listed in CHANGES-SENTIRE.md
   can conflict; keep the Sentire side of each listed change and upstream for the rest.
3. Check: `grep -n app_title frappe/hooks.py` says Sentire Framework, and `__version__`
   in frappe/__init__.py is upstream's number with no suffix.
4. Update .sentire/upstream.json, SENTIRE_RELEASE in frappe/sentire.py, the version in
   sentire-kit/package.json and SENTIRE_FRAMEWORK_RELEASE in sentire-kit/src/index.ts.
5. Run the kit tests (`npm test` in sentire-kit, then `python3 sentire-kit/test/cross_check.py`).
6. Commit, then tag `v16.61.0-sentire.1` and record its commit in docs-sentire/README.md.
   Never move a tag; a fix gets `-sentire.2`.
7. In each product (Ledger first): bump FRAPPE_TAG, run its full CI and its image build,
   merge when green.

For Ledger, a v16 sync is recorded as a minor enhancement under its release rules
(docs/DECISIONS.md D1 in ph-cas), unless the accountant decides otherwise.
