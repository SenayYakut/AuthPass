const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type Mode = 'clinician' | 'staff'

export interface AlternativeMed {
  name: string
  auth_required: boolean
  efficacy_note: string
}

export interface PatientData {
  id: string
  name: string
  dob: string
  age: number
  gender: string
  insurance: string
  member_id: string
  physician: string
  conditions: string[]
  active_medications: string[]
  key_labs: Record<string, { display: string; value: string | number; unit: string; date: string }>
}

export interface ProcessResponse {
  mode: string
  medication: string
  insurance: string
  patient: PatientData
  auth_required: boolean
  confidence: number
  wait_time: string
  policy_summary: string
  met_requirements: string[]
  missing_docs: string[]
  failed_criteria: string[]
  alternatives: AlternativeMed[]
  auth_letter: string | null
  hitl_flag: boolean
  hitl_reason: string
}

export interface RecalculateRequest {
  patient_name: string
  medication: string
  insurance: string
  observation_overrides: Record<string, { value: number | string; date: string; note: string }>
  extra_medications: string[]
  physician_attestation: string
}

export async function recalculate(req: RecalculateRequest): Promise<ProcessResponse> {
  const res = await fetch(`${API_URL}/api/recalculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function processRequest(mode: Mode, text: string): Promise<ProcessResponse> {
  const res = await fetch(`${API_URL}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}
