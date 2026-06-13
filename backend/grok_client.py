"""
xAI Grok API client for AuthPass.
Uses OpenAI-compatible endpoint with langchain-openai.
Handles: entity extraction from speech, auth letter generation.
"""

import json
import os
import re
from datetime import date

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


def _get_llm(temperature: float = 0.1) -> ChatOpenAI:
    api_key = os.environ.get("XAI_API_KEY", "")
    return ChatOpenAI(
        base_url="https://api.x.ai/v1",
        api_key=api_key if api_key else "xai-placeholder",
        model="grok-2-latest",
        temperature=temperature,
    )


# ── Entity extraction ─────────────────────────────────────────────────────────

ENTITY_SYSTEM = """You are AuthPass, an AI prior authorization assistant.
Extract ONLY these three fields from the clinician's spoken input:
- medication: brand or generic drug name
- patient_name: full patient name
- insurance: insurance payer name

Return ONLY valid JSON with keys: medication, patient_name, insurance.
No markdown, no explanation. Example: {"medication":"Humira","patient_name":"John Doe","insurance":"Aetna"}
"""


async def extract_entities(text: str) -> dict:
    """Use Grok to extract medication, patient_name, insurance from free text."""
    # Fast deterministic fallback for known demo phrases
    lower = text.lower()
    known_meds = ["humira", "ozempic", "dupixent", "keytruda", "enbrel"]
    known_payers = ["aetna", "uhc", "united", "bcbs", "blue cross"]

    try:
        llm = _get_llm(temperature=0.0)
        response = await llm.ainvoke(
            [
                SystemMessage(content=ENTITY_SYSTEM),
                HumanMessage(content=text),
            ]
        )
        raw = response.content.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except Exception:
        # Fallback: simple keyword extraction for demo robustness
        result = {"medication": "", "patient_name": "", "insurance": ""}
        for med in known_meds:
            if med in lower:
                result["medication"] = med.capitalize()
                break
        for payer in known_payers:
            if payer in lower:
                result["insurance"] = payer.upper() if payer in ("uhc", "bcbs") else payer.capitalize()
                break
        # Extract name: words not matching med/payer/stop words
        stop = set(known_meds + known_payers + ["prior", "auth", "for", "and", "the", "please", "request"])
        words = text.split()
        name_parts = [w for w in words if w.lower() not in stop and w[0].isupper()]
        if name_parts:
            result["patient_name"] = " ".join(name_parts[:3])
        return result


# ── Auth letter generation ────────────────────────────────────────────────────

LETTER_SYSTEM = """You are a clinical prior authorization specialist at Legion Health.
Generate a professional prior authorization request letter for the payer's medical director.
Use formal medical letter format. Include:
1. Date and reference number
2. Patient demographics and member ID
3. Requested medication with indication
4. Clinical justification based on the criteria provided
5. List of met criteria with evidence
6. Any missing documentation with plan to obtain
7. Urgency if applicable
8. Physician signature block

Be concise but clinically thorough. Use formal medical language. Do not invent lab values."""


async def generate_auth_letter(
    patient: dict,
    medication: str,
    insurance: str,
    policy: dict,
    confidence_result: dict,
) -> str:
    """Use Grok to generate a prior authorization letter."""

    today = date.today().strftime("%B %d, %Y")
    conditions = [
        c["code"]["coding"][0]["display"]
        for c in patient.get("conditions", [])
    ]
    condition_str = ", ".join(conditions) or "See clinical notes"

    met_str = "\n".join(f"  ✓ {m}" for m in confidence_result.get("met", [])) or "  (To be documented)"
    missing_str = "\n".join(f"  ⚠ {m}" for m in confidence_result.get("missing", [])) or "  None"
    failed_str = "\n".join(f"  ✗ {m}" for m in confidence_result.get("failed", [])) or "  None"

    prompt = f"""Generate a prior authorization letter with the following details:

Date: {today}
Patient: {patient.get('display_name')} | DOB: {patient.get('birthDate')} | Member ID: {patient.get('member_id')}
Insurance: {insurance}
Requesting Physician: {patient.get('primary_physician')}
Requested Medication: {medication} ({policy.get('generic_name', '')})
Indication: {condition_str}
Confidence Score: {confidence_result['score']}%

POLICY REQUIREMENTS:
{policy.get('policy_summary', '')}

CRITERIA MET (include these as supporting evidence):
{met_str}

DOCUMENTATION GAPS (address these in the letter):
{missing_str}

CRITERIA NOT MET (note these transparently):
{failed_str}

Write the complete letter now:"""

    try:
        llm = _get_llm(temperature=0.3)
        response = await llm.ainvoke(
            [
                SystemMessage(content=LETTER_SYSTEM),
                HumanMessage(content=prompt),
            ]
        )
        return response.content.strip()
    except Exception as e:
        return _fallback_letter(patient, medication, insurance, policy, confidence_result, today)


def _fallback_letter(
    patient: dict,
    medication: str,
    insurance: str,
    policy: dict,
    confidence_result: dict,
    today: str,
) -> str:
    conditions = [
        c["code"]["coding"][0]["display"]
        for c in patient.get("conditions", [])
    ]
    met = "\n".join(f"  ✓ {m}" for m in confidence_result.get("met", [])) or "  Pending documentation"
    missing = "\n".join(f"  ⚠ {m}" for m in confidence_result.get("missing", [])) or "  None"

    return f"""PRIOR AUTHORIZATION REQUEST
Legion Health | {today}
Reference #: PA-{patient.get('id', 'UNK').upper()}-{date.today().strftime('%Y%m%d')}

TO:     {insurance} Prior Authorization Department
FROM:   {patient.get('primary_physician', 'Treating Physician')}
RE:     {patient.get('display_name')} | DOB: {patient.get('birthDate')} | Member ID: {patient.get('member_id')}

Dear Prior Authorization Reviewer,

We are requesting prior authorization for {medication} ({policy.get('generic_name', '')}) for the
above-named patient, diagnosed with {", ".join(conditions) or "the indicated condition"}.

CLINICAL JUSTIFICATION:
{policy.get('policy_summary', '')}

CRITERIA MET:
{met}

DOCUMENTATION GAPS (being obtained):
{missing}

We believe this medication is medically necessary and meets your coverage criteria.
Please contact our office with any questions or to schedule a peer-to-peer review.

Sincerely,
{patient.get('primary_physician', 'Treating Physician')}
Legion Health
"""
