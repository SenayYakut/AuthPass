"""
AuthPass FastAPI backend.
Endpoints:
  POST /api/process          — main pipeline (both modes)
  GET  /fhir/Patient         — mock FHIR R4
  GET  /fhir/Condition
  GET  /fhir/MedicationRequest
  GET  /fhir/Observation
  GET  /api/health
"""

from __future__ import annotations

import os
from typing import Dict, List, Literal, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from confidence import calculate_confidence
from fhir_mock import (
    find_patient,
    get_fhir_conditions,
    get_fhir_medications,
    get_fhir_observations,
    get_fhir_patient,
)
from grok_client import extract_entities, generate_auth_letter
from rag_engine import rag_engine

load_dotenv()

app = FastAPI(title="AuthPass API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG on startup
rag_engine.initialize()


# ── Request / Response models ─────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    mode: Literal["clinician", "staff"]
    text: str


class ObservationOverride(BaseModel):
    value: Union[float, str]
    date: str
    note: str = ""


class RecalculateRequest(BaseModel):
    patient_name: str
    medication: str
    insurance: str
    observation_overrides: Dict[str, ObservationOverride] = {}
    extra_medications: List[str] = []      # additional completed meds to inject
    physician_attestation: str = ""


class AlternativeMed(BaseModel):
    name: str
    auth_required: bool = False
    efficacy_note: str


class ProcessResponse(BaseModel):
    mode: str
    # Extracted entities
    medication: str
    insurance: str
    # Patient
    patient: Optional[Dict]
    # Auth decision
    auth_required: bool
    confidence: float
    wait_time: str
    policy_summary: str
    met_requirements: List[str]
    missing_docs: List[str]
    failed_criteria: List[str]
    # Mode-specific
    alternatives: List[Dict]     # clinician mode
    auth_letter: Optional[str]   # staff mode
    # HITL
    hitl_flag: bool
    hitl_reason: str


# ── Main pipeline ─────────────────────────────────────────────────────────────

@app.post("/api/process", response_model=ProcessResponse)
async def process_request(req: ProcessRequest) -> ProcessResponse:
    # ── Step 1: Entity extraction via Grok ────────────────────────────────────
    entities = await extract_entities(req.text)

    medication = entities.get("medication", "").strip()
    patient_name = entities.get("patient_name", "").strip()
    insurance = entities.get("insurance", "").strip()

    if not medication or not patient_name or not insurance:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract all fields from input. Got: {entities}. "
                   "Please say: '[Medication], [Patient Name], [Insurance]'",
        )

    # ── Step 2: FHIR lookup ───────────────────────────────────────────────────
    patient = find_patient(patient_name)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient '{patient_name}' not found in EHR. "
                   "Demo patients: John Doe, Maria Rodriguez, Robert Kim, Susan Chen, David Park.",
        )

    # ── Step 3: RAG policy lookup ─────────────────────────────────────────────
    policy_key, policy = rag_engine.find_policy(medication, insurance)

    if not policy:
        # No matching policy — medication does not require auth for this payer
        return ProcessResponse(
            mode=req.mode,
            medication=medication,
            insurance=insurance,
            patient=_format_patient(patient),
            auth_required=False,
            confidence=98.0,
            wait_time="N/A",
            policy_summary=f"No prior authorization required for {medication} with {insurance}.",
            met_requirements=[],
            missing_docs=[],
            failed_criteria=[],
            alternatives=[],
            auth_letter=None,
            hitl_flag=False,
            hitl_reason="",
        )

    # ── Step 4: Confidence scoring ────────────────────────────────────────────
    confidence_result = calculate_confidence(patient, policy_key)

    # ── Step 5: Mode-specific output ──────────────────────────────────────────
    alternatives = []
    auth_letter = None

    if req.mode == "clinician":
        alternatives = [
            {
                "name": alt["name"],
                "auth_required": False,
                "efficacy_note": alt["efficacy_note"],
            }
            for alt in policy.get("alternatives_no_auth", [])
        ]

    elif req.mode == "staff":
        auth_letter = await generate_auth_letter(
            patient=patient,
            medication=medication,
            insurance=insurance,
            policy=policy,
            confidence_result=confidence_result,
        )

    hitl_flag = confidence_result["hitl_flag"]
    hitl_reason = ""
    if hitl_flag:
        hitl_reason = (
            f"Confidence {confidence_result['score']}% is below 70% threshold. "
            "Flagged for senior staff review before submission."
        )

    return ProcessResponse(
        mode=req.mode,
        medication=medication,
        insurance=insurance,
        patient=_format_patient(patient),
        auth_required=True,
        confidence=confidence_result["score"],
        wait_time=policy["wait_time"],
        policy_summary=policy["policy_summary"],
        met_requirements=confidence_result["met"],
        missing_docs=confidence_result["missing"],
        failed_criteria=confidence_result["failed"],
        alternatives=alternatives,
        auth_letter=auth_letter,
        hitl_flag=hitl_flag,
        hitl_reason=hitl_reason,
    )


@app.post("/api/recalculate", response_model=ProcessResponse)
async def recalculate(req: RecalculateRequest) -> ProcessResponse:
    """Re-score confidence with staff-provided overrides (updated labs, extra meds, attestation)."""
    patient = find_patient(req.patient_name)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{req.patient_name}' not found")

    policy_key, policy = rag_engine.find_policy(req.medication, req.insurance)
    if not policy:
        raise HTTPException(status_code=404, detail=f"No policy found for {req.medication} / {req.insurance}")

    # Deep-copy patient and apply overrides
    import copy  # noqa: PLC0415
    patched = copy.deepcopy(patient)

    # Patch observations
    obs_by_code = {
        obs["code"]["coding"][0]["code"]: obs
        for obs in patched.get("observations", [])
    }
    for code, override in req.observation_overrides.items():
        if code in obs_by_code:
            obs_by_code[code]["value"] = override.value
            obs_by_code[code]["date"] = override.date
            if override.note:
                obs_by_code[code]["staff_note"] = override.note
        else:
            # Add new observation
            patched["observations"].append({
                "resourceType": "Observation",
                "code": {"coding": [{"code": code, "display": code.replace("_", " ").title()}]},
                "value": override.value,
                "date": override.date,
                "staff_note": override.note,
            })

    # Inject extra completed medications
    for med_name in req.extra_medications:
        patched["medications"].append({
            "resourceType": "MedicationRequest",
            "medication": med_name,
            "status": "completed",
            "reason_stopped": "Staff-documented — see attestation",
            "start_date": "",
            "end_date": "",
        })

    confidence_result = calculate_confidence(patched, policy_key)

    # Append attestation to met list if provided
    if req.physician_attestation:
        confidence_result["met"].append(
            f"Physician attestation: {req.physician_attestation}"
        )
        # Boost confidence for attestation (capped at 85 if still has failures)
        if confidence_result["failed"]:
            confidence_result["score"] = min(85.0, confidence_result["score"] + 15)
        else:
            confidence_result["score"] = min(95.0, confidence_result["score"] + 10)
        confidence_result["hitl_flag"] = confidence_result["score"] < 70

    auth_letter = await generate_auth_letter(
        patient=patched,
        medication=req.medication,
        insurance=req.insurance,
        policy=policy,
        confidence_result=confidence_result,
    )

    hitl_flag = confidence_result["hitl_flag"]
    hitl_reason = (
        f"Confidence {confidence_result['score']}% still below 70% after adjustments. "
        "Senior physician sign-off required before submission."
    ) if hitl_flag else ""

    return ProcessResponse(
        mode="staff",
        medication=req.medication,
        insurance=req.insurance,
        patient=_format_patient(patched),
        auth_required=True,
        confidence=confidence_result["score"],
        wait_time=policy["wait_time"],
        policy_summary=policy["policy_summary"],
        met_requirements=confidence_result["met"],
        missing_docs=confidence_result["missing"],
        failed_criteria=confidence_result["failed"],
        alternatives=[],
        auth_letter=auth_letter,
        hitl_flag=hitl_flag,
        hitl_reason=hitl_reason,
    )


def _format_patient(p: dict) -> dict:
    return {
        "id": p["id"],
        "name": p["display_name"],
        "dob": p["birthDate"],
        "age": p["age"],
        "gender": p["gender"],
        "insurance": p["insurance"],
        "member_id": p["member_id"],
        "physician": p["primary_physician"],
        "conditions": [
            c["code"]["coding"][0]["display"] for c in p.get("conditions", [])
        ],
        "active_medications": [
            m["medication"]
            for m in p.get("medications", [])
            if m.get("status") == "active"
        ],
        "key_labs": {
            obs["code"]["coding"][0]["code"]: {
                "display": obs["code"]["coding"][0]["display"],
                "value": obs["value"],
                "unit": obs.get("unit", ""),
                "date": obs.get("date", ""),
            }
            for obs in p.get("observations", [])
        },
    }


# ── Mock FHIR R4 endpoints ────────────────────────────────────────────────────

@app.get("/fhir/Patient")
async def fhir_patient(name: str = Query(..., description="Patient name search")):
    result = get_fhir_patient(name)
    if not result or result["total"] == 0:
        raise HTTPException(status_code=404, detail=f"Patient '{name}' not found")
    return result


@app.get("/fhir/Condition")
async def fhir_condition(patient: str = Query(..., description="Patient resource ID")):
    return get_fhir_conditions(patient)


@app.get("/fhir/MedicationRequest")
async def fhir_medication_request(patient: str = Query(..., description="Patient resource ID")):
    return get_fhir_medications(patient)


@app.get("/fhir/Observation")
async def fhir_observation(patient: str = Query(..., description="Patient resource ID")):
    return get_fhir_observations(patient)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "rag_initialized": rag_engine._initialized,
        "policy_count": len(rag_engine.documents),
        "patient_count": 5,
    }
