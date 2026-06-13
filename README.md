# AuthPass

**AI-powered prior authorization decision support for clinicians and staff at Legion Health.**

Prior auth checks happen *before* the prescription is written — not after. AuthPass gives clinicians an instant answer at the point of prescribing so patients get their medication the same day, not weeks later.

---

## The Problem

Prior authorization delays average 14–21 days. Clinicians often don't know auth is required until after they've already written the prescription. Staff spend hours manually gathering documentation and submitting requests. Patients wait.

## The Solution

AuthPass uses xAI Grok Voice to let clinicians and staff speak a request in plain language — *"Humira, John Doe, Aetna"* — and get an instant prior auth decision backed by real payer policies, live patient EHR data, and AI-generated documentation.

---

## Two Modes

### Clinician Mode — check before prescribing
> *"Humira, John Doe, Aetna"*

- Auth required? YES / NO
- Estimated wait time and approval confidence
- Which criteria are met vs. missing
- **Alternative medications with no auth required** — patient gets meds today

### Staff Mode — after prescription is written
> *"John Doe, Humira, Aetna"*

- Pulls full patient data from FHIR EHR automatically
- Checks payer policy requirements
- **Auto-generates prior authorization letter** ready to submit
- Cases below 70% confidence flagged for senior review (HITL)
- Staff adjustment panel: update clinical values, add documentation, add physician attestation, recalculate

---

## Demo Patients

| Patient | Insurance | Condition | Medication | Auth | Confidence |
|---|---|---|---|---|---|
| John Doe | Aetna | Rheumatoid Arthritis | Humira | Required | 99% |
| Maria Rodriguez | UnitedHealthcare | Type 2 Diabetes | Ozempic | Required | 92% |
| Robert Kim | BCBS | Severe Eczema | Dupixent | Required | 83% |
| Susan Chen | Aetna | Lung Cancer | Keytruda | Required | 88% |
| **David Park** | **UnitedHealthcare** | **Psoriatic Arthritis** | **Enbrel** | **Required** | **38% → HITL** |

David Park demonstrates the full HITL flow — PASI score of 8 is below the 10 threshold, triggering the staff adjustment panel.

---

## Payer Policies (RAG-indexed)

| Payer | Medication | Requirements | Wait |
|---|---|---|---|
| Aetna | Humira | Negative TB test, 2 failed DMARDs, DAS28 > 3.2 | 14–21 days |
| UHC | Ozempic | A1C > 7.5%, BMI > 30, failed Metformin 3 months | 7–14 days |
| BCBS | Dupixent | Failed 2 topical steroids, EASI > 16 | 14 days |
| Aetna | Keytruda | PD-L1 > 50%, prior platinum chemo | 21 days |
| UHC | Enbrel | Failed Methotrexate, PASI > 10 | 14 days |

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI / Voice | xAI Grok (`grok-2-latest`, `grok-voice-latest`) |
| Agent Orchestration | LangChain |
| RAG Engine | TF-IDF vector search over payer policy documents |
| Backend | FastAPI + Python |
| EHR | Mock FHIR R4 endpoints |
| Frontend | Next.js 14 + Tailwind CSS |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Architecture

```
Browser
  │
  ├── WebSocket ──► xAI Grok Voice (grok-voice-latest)
  │                    │
  │                    └── function tool: check_prior_auth
  │                              │
  └── REST ──────────────────────┤
                                 ▼
                          FastAPI Backend
                          │
                          ├── Grok API (entity extraction, auth letter)
                          ├── TF-IDF RAG (payer policy lookup)
                          ├── Mock FHIR R4 (patient data)
                          └── Confidence scorer (criteria vs. EHR data)
```

---

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- xAI API key with Voice endpoint enabled — [console.x.ai](https://console.x.ai)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your key: XAI_API_KEY=xai-...
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# Create .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000
# XAI_API_KEY=xai-...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to Use

**Voice (requires xAI Voice key):**
1. Tap the microphone button
2. Say: *"Humira, John Doe, Aetna"* (Clinician) or *"John Doe, Humira, Aetna"* (Staff)
3. Grok transcribes, calls the auth check, speaks the result back

**Text:**
1. Type in the input box: `Humira, John Doe, Aetna`
2. Press Enter or click Check

**Demo pills:**
Click any of the pre-filled examples below the input box — no API key required for the text path.

---

## HITL Flow (Staff Mode)

When confidence is below 70%:

1. Red banner flags the case for senior review
2. **Staff Adjustment Panel** appears with editable fields for each failed criterion
3. Staff updates clinical values (e.g. new PASI score after a patient flare)
4. Staff adds missing medication history
5. Physician adds attestation note
6. Click **Recalculate** — confidence updates, new auth letter regenerates with corrections documented

---

## Project Structure

```
AuthPass/
├── backend/
│   ├── main.py              # FastAPI app + all endpoints
│   ├── payer_policies.py    # 5 payer+medication policies + RAG documents
│   ├── fhir_mock.py         # Mock FHIR R4 patient data
│   ├── rag_engine.py        # TF-IDF RAG engine
│   ├── confidence.py        # Criteria scoring against FHIR observations
│   ├── grok_client.py       # xAI Grok API (entity extraction + letter gen)
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx                    # Main UI
    │   └── api/voice-token/route.ts   # Server-side token minting
    ├── components/
    │   ├── VoiceAgentUI.tsx            # Mic button + transcript
    │   ├── PatientCard.tsx             # FHIR patient data display
    │   ├── AuthDecisionCard.tsx        # Confidence bar + criteria
    │   ├── AlternativesCard.tsx        # No-auth alternatives
    │   ├── AuthLetterCard.tsx          # Letter preview + submit
    │   ├── HITLBanner.tsx              # Low-confidence warning
    │   └── HITLReviewPanel.tsx         # Staff adjustment panel
    ├── hooks/
    │   └── useVoiceAgent.ts            # WebSocket + AudioWorklet hook
    └── lib/
        └── api.ts                      # Backend API client
```

---

## Deployment

### Frontend → Vercel
1. Import repo at [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add env vars: `XAI_API_KEY`, `NEXT_PUBLIC_API_URL`

### Backend → Railway
1. New project at [railway.app](https://railway.app)
2. Deploy from GitHub, root directory `backend`
3. Add env var: `XAI_API_KEY`
4. Paste the Railway URL into Vercel's `NEXT_PUBLIC_API_URL`

---

## Roadmap

- [ ] Connect to real FHIR EHR (Epic, Cerner)
- [ ] Direct payer portal submission (Availity, CoverMyMeds)
- [ ] Auth status tracking dashboard
- [ ] More payer policies and medications
- [ ] Multi-site support for health systems

---

Built for Legion Health · AI-assisted, not AI-decided · All clinical decisions require physician judgment
