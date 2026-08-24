"""Attack C2: satisfy the new derivation check by moving complaint volume
upstream into the forecast interval it must reconcile with."""
import json, sys, copy
sys.path.insert(0, "pipeline/src")
from stillhere_pipeline.contracts import validate_demo_v1, ContractViolation

doc = json.load(open("public/generated/demo.v1.json"))
COMPLAINTS = {"East Village": 4120, "City Center": 980, "Gaslamp": 2600,
              "Cortez": 310, "Columbia": 145, "Marina": 60}
h = copy.deepcopy(doc)
for a in h["planner"]["allocations"]:
    a["planning_load"] = float(COMPLAINTS[a["area"]])
for f in h["forecast"]["areas"]:
    name = f.get("area")
    if name in COMPLAINTS:
        v = float(COMPLAINTS[name])
        f["upper"] = v
        if "point" in f: f["point"] = v * 0.8
        if "lower" in f: f["lower"] = v * 0.6
try:
    validate_demo_v1(h)
    print(">>> C2 RESULT: ACCEPTED. Moving the payload upstream defeats the derivation check.")
except ContractViolation as e:
    print(f">>> C2 RESULT: BLOCKED: {e}")
