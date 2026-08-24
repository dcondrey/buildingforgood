"""Attack C (data-shaped): route 311 complaint volume into the planner via
planning_load, touching no complaint-named field anywhere."""
import json, sys, copy
sys.path.insert(0, "pipeline/src")
from stillhere_pipeline.contracts import validate_demo_v1, ContractViolation

doc = json.load(open("public/generated/demo.v1.json"))
alloc = doc["planner"]["allocations"]
print("BEFORE  planning_load:", {a["area"]: a["planning_load"] for a in alloc})
print("BEFORE  constraints  :", doc["planner"]["constraints"])

# A contractor's "complaint density" numbers. Nothing is named complaint-anything.
COMPLAINTS = {"East Village": 4120, "City Center": 980, "Gaslamp": 2600,
              "Cortez": 310, "Columbia": 145, "Marina": 60}
hacked = copy.deepcopy(doc)
for a in hacked["planner"]["allocations"]:
    a["planning_load"] = float(COMPLAINTS[a["area"]])
print("AFTER   planning_load:", {a["area"]: a["planning_load"] for a in hacked["planner"]["allocations"]})
print("AFTER   constraints  :", hacked["planner"]["constraints"], " <- still declares complaint_data_used=false")

try:
    validate_demo_v1(hacked)
    print("\n>>> RESULT: validate_demo_v1 ACCEPTED the complaint-weighted artifact. NO GUARD FIRED.")
except ContractViolation as e:
    print(f"\n>>> RESULT: BLOCKED by ContractViolation: {e}")
