# AuthPass — AI Prior Authorization for Legion Health

## The Problem

Prior authorization is one of the most frustrating bottlenecks in healthcare. When a clinician prescribes a medication that requires insurance approval, the process takes **14–21 days** on average. By the time the denial or approval arrives, the patient has already left the clinic — often without their medication.

The core failure: **clinicians don't know authorization is required until after they've written the prescription.** Staff then spend hours manually gathering lab results, medication histories, and clinical notes to submit a request — work that is largely repetitive and could be automated.

For patients, this means delayed treatment. For staff, it means burnout. For health systems, it means wasted time and revenue leakage.

---

## The Solution

**AuthPass** gives clinicians and staff an instant prior authorization decision at the point of care — before the prescription is written, not after.

A clinician can say *"Humira, John Doe, Aetna"* and get back in seconds:
- Is prior auth required?
- What criteria are met vs. missing?
- What is the approval confidence?
- What alternative medications require **no auth at all** — so the patient can get their medication today?

For staff handling cases after the prescription is written, AuthPass automatically pulls the patient's full EHR data, checks it against the payer's policy, and **generates a ready-to-submit prior authorization letter** — in seconds, not hours.

Cases below 70% confidence are automatically flagged for senior review with a **Human-in-the-Loop panel** where staff can update clinical values, add medication history, attach a physician attestation, and recalculate — turning a potential denial into an approval.

---

## How I Built It

| Layer | Technology |
|---|---|
| AI / Voice | xAI Grok (`grok-2-latest`, `grok-voice-latest`) |
| Agent Orchestration | LangChain |
| Policy Retrieval | TF-IDF RAG over 5 real payer policy documents |
| Backend | FastAPI + Python |
| Patient Data | Mock FHIR R4 endpoints |
| Frontend | Next.js 14 + Tailwind CSS |
| Deployment | Vercel (frontend + backend) |

The architecture has three core layers:

**1. Voice-first interface** — xAI Grok Voice handles real-time speech via WebSocket. The clinician speaks, Grok transcribes and calls a `check_prior_auth` function tool, and speaks the result back. No clicking through menus.

**2. AI pipeline** — Grok extracts entities from the spoken or typed request. A TF-IDF RAG engine retrieves the matching payer policy. The confidence scorer checks each policy criterion against the patient's FHIR data (labs, medication history, diagnoses). Grok then generates a formatted authorization letter.

**3. HITL safety layer** — Any case below 70% confidence is flagged and surfaced to a senior staff member. The adjustment panel lets staff override clinical values, inject missing medication history, and add a physician attestation — then recalculates confidence and regenerates the letter with corrections documented.

---

## The Impact

- **Clinicians** know at the point of prescribing whether auth is needed — and see no-auth alternatives so patients can leave with their medication the same day.
- **Staff** go from spending hours per case to reviewing an AI-generated letter in minutes.
- **Patients** get their medication faster — days or weeks sooner than the current process allows.
- **Health systems** reduce administrative burden, decrease denials, and improve patient satisfaction.

Prior auth delays affect **1 in 4 prescriptions** in the US. AuthPass turns a 14–21 day process into a same-visit decision.

---

*Built for Legion Health · AI-assisted, not AI-decided · All clinical decisions require physician judgment*
