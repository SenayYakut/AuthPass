"""
Medication-specific payer policies for AuthPass.
Five payer+medication combinations indexed for RAG retrieval.
"""

MEDICATION_PAYER_POLICIES = {
    "aetna_humira": {
        "payer": "Aetna",
        "medication": "Humira",
        "generic_name": "adalimumab",
        "requires_auth": True,
        "criteria": [
            {
                "id": "tb_test",
                "description": "Negative TB test (PPD or QuantiFERON) within past 12 months",
                "fhir_check": "observation_tb_test",
                "weight": 0.33,
            },
            {
                "id": "failed_dmards",
                "description": "Failed ≥2 conventional DMARDs (Methotrexate required as first-line)",
                "fhir_check": "medication_history_dmards",
                "weight": 0.33,
            },
            {
                "id": "das28",
                "description": "DAS28 score > 3.2 (moderate-to-severe disease activity)",
                "fhir_check": "observation_das28",
                "weight": 0.34,
            },
        ],
        "wait_time": "14–21 days",
        "appeal_window": "365 days",
        "alternatives_no_auth": [
            {"name": "Methotrexate", "efficacy_note": "First-line DMARD for RA — highly effective, well-studied"},
            {"name": "Sulfasalazine", "efficacy_note": "Second-line DMARD, well-tolerated, no auth required"},
        ],
        "policy_summary": (
            "Aetna requires a negative TB test, failure of ≥2 conventional DMARDs "
            "(Methotrexate as first-line), and DAS28 > 3.2 before approving Humira for RA."
        ),
    },
    "uhc_ozempic": {
        "payer": "UnitedHealthcare",
        "medication": "Ozempic",
        "generic_name": "semaglutide",
        "requires_auth": True,
        "criteria": [
            {
                "id": "a1c",
                "description": "A1C > 7.5% documented within last 3 months",
                "fhir_check": "observation_a1c",
                "weight": 0.35,
            },
            {
                "id": "bmi",
                "description": "BMI > 30 documented",
                "fhir_check": "observation_bmi",
                "weight": 0.30,
            },
            {
                "id": "failed_metformin",
                "description": "Failed or intolerant to Metformin for minimum 3 months",
                "fhir_check": "medication_history_metformin",
                "weight": 0.35,
            },
        ],
        "wait_time": "7–14 days",
        "appeal_window": "180 days",
        "alternatives_no_auth": [
            {"name": "Trulicity", "efficacy_note": "GLP-1 agonist — comparable efficacy to Ozempic, weekly injection"},
            {"name": "Januvia", "efficacy_note": "Oral DPP-4 inhibitor, no auth required, once daily"},
        ],
        "policy_summary": (
            "UHC requires A1C > 7.5%, BMI > 30, and documented Metformin failure (≥3 months) "
            "before approving Ozempic for Type 2 Diabetes."
        ),
    },
    "bcbs_dupixent": {
        "payer": "Blue Cross Blue Shield",
        "medication": "Dupixent",
        "generic_name": "dupilumab",
        "requires_auth": True,
        "criteria": [
            {
                "id": "failed_topical_steroids",
                "description": "Failed ≥2 topical corticosteroids of moderate-to-high potency (≥4 weeks each)",
                "fhir_check": "medication_history_topical_steroids",
                "weight": 0.50,
            },
            {
                "id": "easi_score",
                "description": "EASI score > 16 (moderate-to-severe atopic dermatitis)",
                "fhir_check": "observation_easi",
                "weight": 0.50,
            },
        ],
        "wait_time": "14 days",
        "appeal_window": "180 days",
        "alternatives_no_auth": [
            {"name": "Triamcinolone", "efficacy_note": "Topical corticosteroid, first-line for eczema"},
            {"name": "Tacrolimus", "efficacy_note": "Topical calcineurin inhibitor, good for face/sensitive areas"},
        ],
        "policy_summary": (
            "BCBS requires failure of ≥2 topical corticosteroids and EASI score > 16 "
            "before approving Dupixent for moderate-to-severe atopic dermatitis."
        ),
    },
    "aetna_keytruda": {
        "payer": "Aetna",
        "medication": "Keytruda",
        "generic_name": "pembrolizumab",
        "requires_auth": True,
        "criteria": [
            {
                "id": "pdl1",
                "description": "Tumor PD-L1 expression > 50% by FDA-approved companion diagnostic",
                "fhir_check": "observation_pdl1",
                "weight": 0.50,
            },
            {
                "id": "prior_chemo",
                "description": "Prior platinum-based chemotherapy or documented contraindication",
                "fhir_check": "medication_history_platinum_chemo",
                "weight": 0.50,
            },
        ],
        "wait_time": "21 days",
        "appeal_window": "365 days",
        "alternatives_no_auth": [],
        "policy_summary": (
            "Aetna requires PD-L1 > 50% and prior platinum-based chemotherapy before approving "
            "Keytruda for NSCLC. No therapeutically equivalent alternatives available. "
            "Expedited review available for rapidly progressing disease."
        ),
    },
    "uhc_enbrel": {
        "payer": "UnitedHealthcare",
        "medication": "Enbrel",
        "generic_name": "etanercept",
        "requires_auth": True,
        "criteria": [
            {
                "id": "failed_methotrexate",
                "description": "Failed Methotrexate therapy (≥12 weeks at therapeutic dose)",
                "fhir_check": "medication_history_methotrexate",
                "weight": 0.50,
            },
            {
                "id": "pasi_score",
                "description": "PASI score > 10 (moderate-to-severe psoriatic involvement)",
                "fhir_check": "observation_pasi",
                "weight": 0.50,
            },
        ],
        "wait_time": "14 days",
        "appeal_window": "180 days",
        "alternatives_no_auth": [
            {"name": "Methotrexate", "efficacy_note": "First-line DMARD for psoriatic arthritis"},
            {"name": "Apremilast", "efficacy_note": "Oral PDE4 inhibitor (Otezla), no auth required"},
        ],
        "policy_summary": (
            "UHC requires documented Methotrexate failure (≥12 weeks) and PASI score > 10 "
            "before approving Enbrel for psoriatic arthritis."
        ),
    },
}

# Lookup: (normalized_payer, normalized_med) → policy key
POLICY_KEY_MAP: dict[tuple[str, str], str] = {
    ("aetna", "humira"): "aetna_humira",
    ("aetna", "adalimumab"): "aetna_humira",
    ("uhc", "ozempic"): "uhc_ozempic",
    ("united", "ozempic"): "uhc_ozempic",
    ("unitedhealthcare", "ozempic"): "uhc_ozempic",
    ("uhc", "semaglutide"): "uhc_ozempic",
    ("bcbs", "dupixent"): "bcbs_dupixent",
    ("bluecross", "dupixent"): "bcbs_dupixent",
    ("bluecrossblueshield", "dupixent"): "bcbs_dupixent",
    ("bcbs", "dupilumab"): "bcbs_dupixent",
    ("aetna", "keytruda"): "aetna_keytruda",
    ("aetna", "pembrolizumab"): "aetna_keytruda",
    ("uhc", "enbrel"): "uhc_enbrel",
    ("united", "enbrel"): "uhc_enbrel",
    ("unitedhealthcare", "enbrel"): "uhc_enbrel",
    ("uhc", "etanercept"): "uhc_enbrel",
}

# Full-text policy documents for TF-IDF RAG indexing
POLICY_DOCUMENTS = [
    {
        "id": "AETNA-HUMIRA-001",
        "payer": "Aetna",
        "medication": "Humira",
        "policy_key": "aetna_humira",
        "title": "Aetna Prior Authorization: Humira (adalimumab) for Rheumatoid Arthritis",
        "content": """
AETNA CLINICAL POLICY BULLETIN — HUMIRA (ADALIMUMAB) RHEUMATOID ARTHRITIS

PRIOR AUTHORIZATION REQUIRED: YES

MEDICAL NECESSITY CRITERIA — ALL of the following must be met:

1. TUBERCULOSIS SCREENING: Negative TB test (PPD skin test or QuantiFERON-TB Gold In-Tube)
   within past 12 months. Active or latent TB must be treated before initiating adalimumab.

2. CONVENTIONAL DMARD FAILURE: Documented failure, intolerance, or contraindication to at least
   TWO conventional DMARDs. Methotrexate is required as the first DMARD trial (minimum 3 months
   at adequate doses, typically 15–25 mg/week). Second DMARD may be Sulfasalazine,
   Hydroxychloroquine, or Leflunomide.

3. DISEASE ACTIVITY SCORE: DAS28 (Disease Activity Score 28) greater than 3.2, indicating
   moderate-to-severe rheumatoid arthritis activity. Score must be documented by a
   board-certified rheumatologist within 30 days of the authorization request.

REQUIRED DOCUMENTATION:
- TB screening results with date
- DMARD trial dates, doses, durations, and reasons for failure/discontinuation
- Current DAS28 score from rheumatologist visit
- Diagnosis confirmation: RF-positive, Anti-CCP antibody, or radiographic RA evidence
- Prescribing rheumatologist NPI and credentials

ESTIMATED WAIT TIME: 14-21 business days
APPEAL WINDOW: 365 days from denial date

ALTERNATIVES WITHOUT PRIOR AUTHORIZATION (same indication):
- Methotrexate monotherapy (if inadequate prior trial)
- Sulfasalazine 1000mg twice daily
- Hydroxychloroquine 200-400mg daily

NOTE: Biosimilars (Hadlima, Hyrimoz, Cyltezo) subject to same criteria with step therapy.
        """,
    },
    {
        "id": "UHC-OZEMPIC-001",
        "payer": "UnitedHealthcare",
        "medication": "Ozempic",
        "policy_key": "uhc_ozempic",
        "title": "UHC Prior Authorization: Ozempic (semaglutide) for Type 2 Diabetes",
        "content": """
UNITEDHEALTHCARE PRIOR AUTHORIZATION POLICY — OZEMPIC (SEMAGLUTIDE)

PRIOR AUTHORIZATION REQUIRED: YES

MEDICAL NECESSITY CRITERIA — ALL of the following must be met:

1. GLYCEMIC CONTROL: HbA1c (A1C) greater than 7.5% documented within the past 3 months,
   demonstrating inadequate glycemic control despite current diabetes regimen.

2. BODY MASS INDEX: BMI greater than 30 kg/m² documented at time of request or within
   past 6 months. Measurement from treating physician's office visit preferred.

3. METFORMIN TRIAL AND FAILURE: Patient has used Metformin at maximum tolerated dose
   for a minimum of 3 months AND has not achieved adequate glycemic control, OR has
   documented intolerance/contraindication to Metformin (e.g., CKD, lactic acidosis risk).
   If intolerant, documentation of specific adverse effects required.

REQUIRED DOCUMENTATION:
- Recent A1C lab result (within 3 months) with date
- BMI measurement with date
- Metformin prescription history: start date, dose, end date, reason for stopping
- Type 2 Diabetes diagnosis (ICD-10: E11.x)
- Prescribing physician note confirming clinical indication

ESTIMATED WAIT TIME: 7-14 business days

ALTERNATIVES WITHOUT PRIOR AUTHORIZATION:
- Metformin extended-release (if not tried)
- Januvia (sitagliptin) — oral DPP-4 inhibitor, once daily
- Trulicity (dulaglutide) — weekly GLP-1 receptor agonist injectable, comparable efficacy
- Jardiance (empagliflozin) — SGLT2 inhibitor, cardiovascular and renal benefits
        """,
    },
    {
        "id": "BCBS-DUPIXENT-001",
        "payer": "Blue Cross Blue Shield",
        "medication": "Dupixent",
        "policy_key": "bcbs_dupixent",
        "title": "BCBS Prior Authorization: Dupixent (dupilumab) for Atopic Dermatitis",
        "content": """
BLUE CROSS BLUE SHIELD MEDICAL POLICY — DUPIXENT (DUPILUMAB)

PRIOR AUTHORIZATION REQUIRED: YES

MEDICAL NECESSITY CRITERIA — ALL of the following must be met:

1. TOPICAL CORTICOSTEROID FAILURE: Patient must have failed or have documented contraindication
   to adequate trials of at least TWO topical corticosteroids of moderate-to-high potency.
   Examples of qualifying steroids:
   - Triamcinolone acetonide 0.1% cream or ointment
   - Clobetasol propionate 0.05% cream or ointment
   - Betamethasone dipropionate 0.05%
   - Fluocinonide 0.05%
   Each trial must have been used for a minimum of 4 weeks at adequate doses and application
   frequency (twice daily). Reason for discontinuation (inadequate response, adverse effect)
   must be documented.

2. DISEASE SEVERITY — EASI SCORE: Eczema Area and Severity Index (EASI) score greater than 16,
   indicating moderate-to-severe atopic dermatitis. Score must be documented by treating
   dermatologist within 30 days of authorization request.

REQUIRED DOCUMENTATION:
- Names, potencies, application schedules, and duration of each topical steroid trial
- Reason for failure/discontinuation of each trial
- Current EASI score from dermatologist with assessment date
- Atopic dermatitis diagnosis (ICD-10: L20.x)

ESTIMATED WAIT TIME: 14 business days
APPEAL WINDOW: 180 days

ALTERNATIVES WITHOUT PRIOR AUTHORIZATION:
- Triamcinolone 0.1% ointment
- Tacrolimus 0.1% ointment (calcineurin inhibitor, especially for face/skin folds)
- Clobetasol propionate 0.05% (high-potency steroid)
        """,
    },
    {
        "id": "AETNA-KEYTRUDA-001",
        "payer": "Aetna",
        "medication": "Keytruda",
        "policy_key": "aetna_keytruda",
        "title": "Aetna Prior Authorization: Keytruda (pembrolizumab) for Lung Cancer",
        "content": """
AETNA CLINICAL POLICY BULLETIN — KEYTRUDA (PEMBROLIZUMAB) NSCLC

PRIOR AUTHORIZATION REQUIRED: YES

MEDICAL NECESSITY CRITERIA — ALL of the following must be met:

1. PD-L1 EXPRESSION: Tumor PD-L1 expression greater than 50% as measured by FDA-approved
   companion diagnostic assay (PD-L1 IHC 22C3 pharmDx, Dako). Test must be performed by
   a CLIA-certified laboratory. Tumor mutational burden and MSI-H status should also
   be documented if available.

2. PRIOR PLATINUM CHEMOTHERAPY: Patient has received at least one cycle of platinum-based
   chemotherapy (e.g., carboplatin or cisplatin in combination with paclitaxel, pemetrexed,
   or other agents) OR has a documented contraindication to platinum-based chemotherapy
   with specific reason noted (renal insufficiency, hearing loss, neuropathy, etc.).

3. CONFIRMED NSCLC DIAGNOSIS: Non-small cell lung cancer histologically confirmed by
   pathology report. ICD-10: C34.x (Malignant neoplasm of bronchus and lung).
   EGFR and ALK mutation status must be documented (pembrolizumab not indicated if
   EGFR-sensitizing mutation or ALK translocation present).

REQUIRED DOCUMENTATION:
- Pathology report confirming NSCLC histology
- PD-L1 testing report with percentage and assay used
- Prior chemotherapy regimen, dates, and number of cycles OR contraindication letter
- EGFR/ALK mutation test results
- Oncologist treatment plan and performance status (ECOG 0-1)

ESTIMATED WAIT TIME: 21 business days
EXPEDITED REVIEW: Available within 72 hours for rapidly progressing disease
APPEAL WINDOW: 365 days

NOTE: No therapeutically equivalent alternatives available for this specific combination
of PD-L1 high expression and prior platinum chemotherapy failure indication.
        """,
    },
    {
        "id": "UHC-ENBREL-001",
        "payer": "UnitedHealthcare",
        "medication": "Enbrel",
        "policy_key": "uhc_enbrel",
        "title": "UHC Prior Authorization: Enbrel (etanercept) for Psoriatic Arthritis",
        "content": """
UNITEDHEALTHCARE PRIOR AUTHORIZATION POLICY — ENBREL (ETANERCEPT)

PRIOR AUTHORIZATION REQUIRED: YES

MEDICAL NECESSITY CRITERIA — ALL of the following must be met:

1. METHOTREXATE TRIAL AND FAILURE: Patient has documented failure or intolerance of Methotrexate
   therapy for psoriatic arthritis. Minimum adequate trial is 12 weeks at therapeutic doses
   (typically 15–25 mg/week orally or subcutaneously). Documentation must include:
   - Start date and dose of Methotrexate
   - Duration of treatment
   - Reason for failure (inadequate response, adverse effect, contraindication)
   If Methotrexate is contraindicated, specific contraindication must be documented
   (hepatic disease, pregnancy, severe pulmonary disease, etc.).

2. PSORIASIS DISEASE SEVERITY: PASI (Psoriasis Area and Severity Index) score greater than 10
   OR Physician Global Assessment (PGA) of moderate or severe. Score must be documented by
   treating rheumatologist or dermatologist within 30 days of request.

REQUIRED DOCUMENTATION:
- Methotrexate prescription history with start/end dates, dose, and failure reason
- Current PASI score or PGA assessment with date
- Psoriatic arthritis diagnosis (ICD-10: L40.50–L40.59)
- Documentation of joint involvement (number and severity of affected joints)
- Prescribing specialist credentials

ESTIMATED WAIT TIME: 14 business days
APPEAL WINDOW: 180 days

ALTERNATIVES WITHOUT PRIOR AUTHORIZATION:
- Methotrexate (if not yet tried)
- Apremilast (Otezla) — oral PDE4 inhibitor, 30mg twice daily
- NSAIDs (naproxen, diclofenac) — for mild joint symptoms
        """,
    },
]
