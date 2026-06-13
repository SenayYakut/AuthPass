"""
Confidence scoring: checks patient FHIR data against payer policy criteria.
Returns a 0–100 score plus lists of met/missing/failed criteria.
"""

from payer_policies import MEDICATION_PAYER_POLICIES


def calculate_confidence(patient_data: dict, policy_key: str) -> dict:
    policy = MEDICATION_PAYER_POLICIES.get(policy_key)
    if not policy:
        return {"score": 0.0, "met": [], "missing": [], "failed": []}

    # Index observations by code
    obs_by_code: dict[str, dict] = {}
    for obs in patient_data.get("observations", []):
        code = obs["code"]["coding"][0]["code"]
        obs_by_code[code] = obs

    # Completed/stopped medication names (lowercase)
    completed_meds = [
        m["medication"].lower()
        for m in patient_data.get("medications", [])
        if m.get("status") in ("completed", "stopped", "inactive", "cancelled")
    ]

    met: list[str] = []
    missing: list[str] = []
    failed: list[str] = []

    for criterion in policy["criteria"]:
        check = criterion["fhir_check"]

        # ── TB test ──────────────────────────────────────────────────────────
        if check == "observation_tb_test":
            obs = obs_by_code.get("tb_test")
            if obs:
                if "negative" in str(obs["value"]).lower():
                    met.append(f"TB test: {obs['value']} — dated {obs.get('date', 'N/A')}")
                else:
                    failed.append(f"TB test result: {obs['value']} (must be Negative)")
            else:
                missing.append("TB test (PPD or QuantiFERON) result not found in record")

        # ── 2 failed DMARDs ─────────────────────────────────────────────────
        elif check == "medication_history_dmards":
            dmard_keywords = [
                "methotrexate", "sulfasalazine", "hydroxychloroquine",
                "leflunomide", "plaquenil",
            ]
            found = [m for m in completed_meds if any(d in m for d in dmard_keywords)]
            if len(found) >= 2:
                met.append(f"Failed ≥2 DMARDs: {found[0].split()[0].capitalize()}, {found[1].split()[0].capitalize()}")
            elif len(found) == 1:
                missing.append(f"Only 1 DMARD failure found ({found[0].split()[0].capitalize()}); need ≥2")
            else:
                missing.append("No DMARD failure history in record")

        # ── DAS28 ────────────────────────────────────────────────────────────
        elif check == "observation_das28":
            obs = obs_by_code.get("das28")
            if obs:
                val = float(obs["value"])
                if val > 3.2:
                    met.append(f"DAS28 = {val} (>3.2 required) — dated {obs.get('date', 'N/A')}")
                else:
                    failed.append(f"DAS28 = {val} (must be >3.2; indicates low disease activity)")
            else:
                missing.append("DAS28 score not documented in record")

        # ── A1C ─────────────────────────────────────────────────────────────
        elif check == "observation_a1c":
            obs = obs_by_code.get("a1c")
            if obs:
                val = float(obs["value"])
                if val > 7.5:
                    met.append(f"A1C = {val}% (>7.5% required) — dated {obs.get('date', 'N/A')}")
                else:
                    failed.append(f"A1C = {val}% (must be >7.5%)")
            else:
                missing.append("A1C result not found (need result within last 3 months)")

        # ── BMI ─────────────────────────────────────────────────────────────
        elif check == "observation_bmi":
            obs = obs_by_code.get("bmi")
            if obs:
                val = float(obs["value"])
                if val > 30:
                    met.append(f"BMI = {val} kg/m² (>30 required)")
                else:
                    failed.append(f"BMI = {val} kg/m² (must be >30)")
            else:
                missing.append("BMI not documented in record")

        # ── Metformin failure ────────────────────────────────────────────────
        elif check == "medication_history_metformin":
            found = [m for m in completed_meds if "metformin" in m]
            if found:
                met.append(f"Failed/stopped Metformin: {found[0].split()[0].capitalize()}")
            else:
                missing.append("Metformin trial not found — need ≥3-month trial documented")

        # ── 2 topical steroids ───────────────────────────────────────────────
        elif check == "medication_history_topical_steroids":
            steroid_keywords = [
                "triamcinolone", "clobetasol", "betamethasone",
                "hydrocortisone", "fluticasone", "fluocinonide",
            ]
            found = [m for m in completed_meds if any(s in m for s in steroid_keywords)]
            if len(found) >= 2:
                met.append(
                    f"Failed ≥2 topical steroids: {found[0].split()[0].capitalize()}, {found[1].split()[0].capitalize()}"
                )
            elif len(found) == 1:
                missing.append(f"Only 1 topical steroid trial found; need ≥2")
            else:
                missing.append("No topical corticosteroid trial history found")

        # ── EASI score ───────────────────────────────────────────────────────
        elif check == "observation_easi":
            obs = obs_by_code.get("easi")
            if obs:
                val = float(obs["value"])
                if val > 16:
                    met.append(f"EASI = {val} (>16 required) — dated {obs.get('date', 'N/A')}")
                else:
                    failed.append(f"EASI = {val} (must be >16 for moderate-severe eczema)")
            else:
                missing.append("EASI score not documented by dermatologist")

        # ── PD-L1 ────────────────────────────────────────────────────────────
        elif check == "observation_pdl1":
            obs = obs_by_code.get("pdl1")
            if obs:
                val = float(obs["value"])
                if val > 50:
                    met.append(f"PD-L1 = {val}% (>50% required) — dated {obs.get('date', 'N/A')}")
                else:
                    failed.append(f"PD-L1 = {val}% (must be >50%)")
            else:
                missing.append("PD-L1 expression test result not found")

        # ── Prior platinum chemotherapy ──────────────────────────────────────
        elif check == "medication_history_platinum_chemo":
            platinum_keywords = ["carboplatin", "cisplatin", "oxaliplatin"]
            found = [m for m in completed_meds if any(p in m for p in platinum_keywords)]
            if found:
                met.append(f"Prior platinum chemo: {found[0].split()[0].capitalize()}")
            else:
                missing.append("Prior platinum-based chemotherapy not documented")

        # ── Failed Methotrexate (psoriatic arthritis) ────────────────────────
        elif check == "medication_history_methotrexate":
            found = [m for m in completed_meds if "methotrexate" in m]
            if found:
                met.append(f"Failed Methotrexate: {found[0].split()[0].capitalize()}")
            else:
                missing.append("Methotrexate trial (≥12 weeks) not documented")

        # ── PASI score ───────────────────────────────────────────────────────
        elif check == "observation_pasi":
            obs = obs_by_code.get("pasi")
            if obs:
                val = float(obs["value"])
                if val > 10:
                    met.append(f"PASI = {val} (>10 required) — dated {obs.get('date', 'N/A')}")
                else:
                    failed.append(
                        f"PASI = {val} (must be >10; current score borderline — "
                        "recommend re-assessment or Apremilast instead)"
                    )
            else:
                missing.append("PASI score not documented")

    total = len(policy["criteria"])
    n_met = len(met)
    n_failed = len(failed)

    base = (n_met / total) * 100 if total else 0
    penalty = (n_failed * 12) + (len(missing) * 5)
    score = round(max(0.0, min(99.0, base - penalty)), 1)

    return {
        "score": score,
        "met": met,
        "missing": missing,
        "failed": failed,
        "hitl_flag": score < 70,
    }
