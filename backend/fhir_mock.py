"""
Mock FHIR R4 patient data for AuthPass demo.
Five patients covering each payer+medication scenario.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

# Each patient keyed by normalized lowercase name
MOCK_PATIENTS: dict[str, dict] = {
    "john doe": {
        "id": "patient-001",
        "resourceType": "Patient",
        "name": [{"use": "official", "family": "Doe", "given": ["John"]}],
        "display_name": "John Doe",
        "birthDate": "1975-03-15",
        "gender": "male",
        "age": 50,
        "insurance": "Aetna",
        "member_id": "AET-847291035",
        "primary_physician": "Dr. Amanda Chen, MD (Rheumatology)",
        "physician_npi": "1234567890",
        "conditions": [
            {
                "resourceType": "Condition",
                "code": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/sid/icd-10",
                            "code": "M06.9",
                            "display": "Rheumatoid arthritis, unspecified",
                        }
                    ]
                },
                "clinicalStatus": "active",
                "onsetDate": "2022-08-01",
            }
        ],
        "medications": [
            {
                "resourceType": "MedicationRequest",
                "medication": "Methotrexate 15mg weekly",
                "status": "completed",
                "reason_stopped": "Inadequate response after 4 months",
                "start_date": "2023-06-01",
                "end_date": "2023-10-15",
            },
            {
                "resourceType": "MedicationRequest",
                "medication": "Sulfasalazine 1000mg twice daily",
                "status": "completed",
                "reason_stopped": "GI intolerance after 3 months",
                "start_date": "2023-11-01",
                "end_date": "2024-02-28",
            },
            {
                "resourceType": "MedicationRequest",
                "medication": "Prednisone 10mg daily",
                "status": "active",
                "start_date": "2024-03-01",
            },
        ],
        "observations": [
            {
                "resourceType": "Observation",
                "code": {
                    "coding": [{"code": "tb_test", "display": "QuantiFERON-TB Gold In-Tube"}]
                },
                "value": "Negative",
                "date": "2024-11-15",
            },
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "das28", "display": "DAS28 disease activity score"}]},
                "value": 4.2,
                "unit": "score",
                "date": "2025-05-20",
            },
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "rf", "display": "Rheumatoid Factor"}]},
                "value": "Positive (78 IU/mL)",
                "date": "2023-05-01",
            },
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "anti_ccp", "display": "Anti-CCP antibody"}]},
                "value": "Positive (>250 U/mL)",
                "date": "2023-05-01",
            },
        ],
    },

    "maria rodriguez": {
        "id": "patient-002",
        "resourceType": "Patient",
        "name": [{"use": "official", "family": "Rodriguez", "given": ["Maria"]}],
        "display_name": "Maria Rodriguez",
        "birthDate": "1968-07-22",
        "gender": "female",
        "age": 57,
        "insurance": "UnitedHealthcare",
        "member_id": "UHC-556789012",
        "primary_physician": "Dr. James Patel, MD (Endocrinology)",
        "physician_npi": "9876543210",
        "conditions": [
            {
                "resourceType": "Condition",
                "code": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/sid/icd-10",
                            "code": "E11.9",
                            "display": "Type 2 diabetes mellitus without complications",
                        }
                    ]
                },
                "clinicalStatus": "active",
                "onsetDate": "2019-03-15",
            },
            {
                "resourceType": "Condition",
                "code": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/sid/icd-10",
                            "code": "E66.9",
                            "display": "Obesity, unspecified",
                        }
                    ]
                },
                "clinicalStatus": "active",
                "onsetDate": "2019-03-15",
            },
        ],
        "medications": [
            {
                "resourceType": "MedicationRequest",
                "medication": "Metformin 1000mg twice daily",
                "status": "completed",
                "reason_stopped": "GI intolerance and inadequate A1C control after 4 months",
                "start_date": "2024-01-10",
                "end_date": "2024-05-20",
            },
            {
                "resourceType": "MedicationRequest",
                "medication": "Glipizide 5mg daily",
                "status": "active",
                "start_date": "2024-06-01",
            },
        ],
        "observations": [
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "a1c", "display": "Hemoglobin A1c (HbA1c)"}]},
                "value": 8.2,
                "unit": "%",
                "date": "2025-11-01",
            },
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "bmi", "display": "Body Mass Index (BMI)"}]},
                "value": 33.5,
                "unit": "kg/m²",
                "date": "2025-10-15",
            },
            {
                "resourceType": "Observation",
                "code": {
                    "coding": [{"code": "fasting_glucose", "display": "Fasting Blood Glucose"}]
                },
                "value": 187,
                "unit": "mg/dL",
                "date": "2025-11-01",
            },
        ],
    },

    "robert kim": {
        "id": "patient-003",
        "resourceType": "Patient",
        "name": [{"use": "official", "family": "Kim", "given": ["Robert"]}],
        "display_name": "Robert Kim",
        "birthDate": "1982-11-03",
        "gender": "male",
        "age": 43,
        "insurance": "Blue Cross Blue Shield",
        "member_id": "BCBS-334512890",
        "primary_physician": "Dr. Lisa Wang, MD (Dermatology)",
        "physician_npi": "4455667788",
        "conditions": [
            {
                "resourceType": "Condition",
                "code": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/sid/icd-10",
                            "code": "L20.9",
                            "display": "Atopic dermatitis, unspecified (Eczema)",
                        }
                    ]
                },
                "clinicalStatus": "active",
                "onsetDate": "2021-04-10",
            }
        ],
        "medications": [
            {
                "resourceType": "MedicationRequest",
                "medication": "Triamcinolone acetonide 0.1% ointment twice daily",
                "status": "completed",
                "reason_stopped": "Inadequate response after 6 weeks — EASI improved only 20%",
                "start_date": "2024-08-01",
                "end_date": "2024-09-15",
            },
            {
                "resourceType": "MedicationRequest",
                "medication": "Clobetasol propionate 0.05% cream twice daily",
                "status": "completed",
                "reason_stopped": "Inadequate response after 4 weeks; skin thinning noted",
                "start_date": "2024-10-01",
                "end_date": "2024-11-15",
            },
            {
                "resourceType": "MedicationRequest",
                "medication": "Cetirizine 10mg daily (antihistamine)",
                "status": "active",
                "start_date": "2024-08-01",
            },
        ],
        "observations": [
            {
                "resourceType": "Observation",
                "code": {
                    "coding": [
                        {
                            "code": "easi",
                            "display": "Eczema Area and Severity Index (EASI) score",
                        }
                    ]
                },
                "value": 18.0,
                "unit": "score",
                "date": "2025-12-01",
            },
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "ige", "display": "Total IgE (immunoglobulin E)"}]},
                "value": 420,
                "unit": "IU/mL",
                "date": "2025-11-10",
            },
        ],
    },

    "susan chen": {
        "id": "patient-004",
        "resourceType": "Patient",
        "name": [{"use": "official", "family": "Chen", "given": ["Susan"]}],
        "display_name": "Susan Chen",
        "birthDate": "1965-05-20",
        "gender": "female",
        "age": 60,
        "insurance": "Aetna",
        "member_id": "AET-998877221",
        "primary_physician": "Dr. Robert Hayes, MD (Oncology)",
        "physician_npi": "1122334455",
        "conditions": [
            {
                "resourceType": "Condition",
                "code": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/sid/icd-10",
                            "code": "C34.90",
                            "display": "Malignant neoplasm of unspecified part of bronchus or lung",
                        }
                    ]
                },
                "clinicalStatus": "active",
                "onsetDate": "2024-07-15",
                "note": "Non-small cell lung cancer, stage IIIB, adenocarcinoma",
            }
        ],
        "medications": [
            {
                "resourceType": "MedicationRequest",
                "medication": "Carboplatin AUC5 + Paclitaxel 175mg/m² (4 cycles)",
                "status": "completed",
                "reason_stopped": "Completed planned 4 cycles; disease progression on follow-up CT",
                "start_date": "2024-08-01",
                "end_date": "2024-12-15",
            }
        ],
        "observations": [
            {
                "resourceType": "Observation",
                "code": {
                    "coding": [
                        {
                            "code": "pdl1",
                            "display": "PD-L1 expression (22C3 pharmDx assay)",
                        }
                    ]
                },
                "value": 65,
                "unit": "%",
                "date": "2024-07-28",
            },
            {
                "resourceType": "Observation",
                "code": {
                    "coding": [{"code": "egfr_mutation", "display": "EGFR mutation status"}]
                },
                "value": "Wild-type (no sensitizing mutation detected)",
                "date": "2024-07-28",
            },
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "alk_rearrangement", "display": "ALK rearrangement"}]},
                "value": "Negative",
                "date": "2024-07-28",
            },
            {
                "resourceType": "Observation",
                "code": {"coding": [{"code": "ecog", "display": "ECOG Performance Status"}]},
                "value": 1,
                "unit": "score",
                "date": "2025-12-01",
            },
        ],
    },

    "david park": {
        "id": "patient-005",
        "resourceType": "Patient",
        "name": [{"use": "official", "family": "Park", "given": ["David"]}],
        "display_name": "David Park",
        "birthDate": "1978-09-14",
        "gender": "male",
        "age": 47,
        "insurance": "UnitedHealthcare",
        "member_id": "UHC-223344556",
        "primary_physician": "Dr. Sarah Nguyen, MD (Rheumatology)",
        "physician_npi": "5566778899",
        "conditions": [
            {
                "resourceType": "Condition",
                "code": {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/sid/icd-10",
                            "code": "L40.50",
                            "display": "Arthropathic psoriasis, unspecified (Psoriatic Arthritis)",
                        }
                    ]
                },
                "clinicalStatus": "active",
                "onsetDate": "2023-01-20",
            }
        ],
        "medications": [
            {
                "resourceType": "MedicationRequest",
                "medication": "Methotrexate 20mg weekly",
                "status": "completed",
                "reason_stopped": "Inadequate joint response after 14 weeks; persistent morning stiffness",
                "start_date": "2024-03-01",
                "end_date": "2024-06-25",
            },
            {
                "resourceType": "MedicationRequest",
                "medication": "Naproxen 500mg twice daily",
                "status": "active",
                "start_date": "2024-07-01",
            },
        ],
        "observations": [
            {
                "resourceType": "Observation",
                "code": {
                    "coding": [
                        {
                            "code": "pasi",
                            "display": "Psoriasis Area and Severity Index (PASI) score",
                        }
                    ]
                },
                "value": 8.0,
                "unit": "score",
                "date": "2025-12-01",
                "note": "Borderline — UHC requires PASI > 10 for Enbrel approval",
            },
            {
                "resourceType": "Observation",
                "code": {
                    "coding": [{"code": "joint_count", "display": "Swollen/Tender Joint Count"}]
                },
                "value": "6 swollen, 8 tender joints",
                "date": "2025-12-01",
            },
        ],
    },
}


def normalize_name(name: str) -> str:
    return name.lower().strip()


def find_patient(name: str) -> dict | None:
    key = normalize_name(name)
    if key in MOCK_PATIENTS:
        return MOCK_PATIENTS[key]
    # Fuzzy match: check if any part of the name matches
    for patient_key, patient in MOCK_PATIENTS.items():
        parts = patient_key.split()
        name_parts = key.split()
        if any(p in name_parts for p in parts):
            return patient
    return None


def get_fhir_patient(name: str) -> dict | None:
    patient = find_patient(name)
    if not patient:
        return None
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": 1,
        "entry": [{"resource": {k: v for k, v in patient.items() if k not in ("conditions", "medications", "observations")}}],
    }


def get_fhir_conditions(patient_id: str) -> dict:
    for patient in MOCK_PATIENTS.values():
        if patient["id"] == patient_id:
            return {
                "resourceType": "Bundle",
                "type": "searchset",
                "total": len(patient["conditions"]),
                "entry": [{"resource": c} for c in patient["conditions"]],
            }
    return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}


def get_fhir_medications(patient_id: str) -> dict:
    for patient in MOCK_PATIENTS.values():
        if patient["id"] == patient_id:
            return {
                "resourceType": "Bundle",
                "type": "searchset",
                "total": len(patient["medications"]),
                "entry": [{"resource": m} for m in patient["medications"]],
            }
    return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}


def get_fhir_observations(patient_id: str) -> dict:
    for patient in MOCK_PATIENTS.values():
        if patient["id"] == patient_id:
            return {
                "resourceType": "Bundle",
                "type": "searchset",
                "total": len(patient["observations"]),
                "entry": [{"resource": o} for o in patient["observations"]],
            }
    return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}
