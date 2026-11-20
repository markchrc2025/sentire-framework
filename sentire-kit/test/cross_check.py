"""The Python engine and the TypeScript kit must sign and verify each other's events."""
import importlib.util, json, pathlib, subprocess, sys

root = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("sentire", root / "frappe" / "sentire.py")
s = importlib.util.module_from_spec(spec); spec.loader.exec_module(s)

ev = s.build_event("payroll.run.approved", "payroll", {"run_id": "R1", "note": "Peña ₱"}, "ACME")
body = s.encode_event(ev).decode()
header = s.sign(body.encode(), "k")
js = f"""
import {{ verify, sign }} from "{(root / 'sentire-kit' / 'dist' / 'index.js').as_posix()}";
const body = {json.dumps(body)};
console.log(JSON.stringify({{ ok: verify(body, {json.dumps(header)}, "k"), h: sign(body, "k", 1700000000) }}));
"""
out = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], text=True))
assert out["ok"], "TypeScript could not verify a Python-signed event"
assert s.verify(body.encode(), out["h"], "k", tolerance=0), "Python could not verify a TypeScript-signed event"
assert out["h"] == s.sign(body.encode(), "k", 1700000000), "signatures differ"
print("cross-check ok")
