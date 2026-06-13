'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mode, ProcessResponse } from '@/lib/api'

const WS_URL = 'wss://api.x.ai/v1/realtime?model=grok-voice-latest'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const BUFFER_SAFETY_CAP = 240_000 // ~10 s at 24 kHz
const CONNECT_TIMEOUT_MS = 10_000

export type AgentStatus = 'idle' | 'connecting' | 'active' | 'error'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  interrupted?: boolean
}

// ── Audio helpers ─────────────────────────────────────────────────────────────

function audioToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength)
  const CHUNK = 0x2000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK))))
  }
  return btoa(parts.join(''))
}

function decodePcmChunk(base64: string): Float32Array {
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  const int16 = new Int16Array(bytes.buffer)
  const float32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768
  return float32
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoiceAgent(
  mode: Mode,
  onAuthResult: (result: ProcessResponse) => void
) {
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  // Stable refs — no re-render on change
  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const micBufferRef = useRef<Int16Array[]>([])
  const micSampleCountRef = useRef(0)
  const isSessionReadyRef = useRef(false)
  const nextPlayTimeRef = useRef(0)
  const queuedSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const currentResponseIdRef = useRef<string | null>(null)
  const isIntentionalDisconnectRef = useRef(false)
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tokenRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onAuthResultRef = useRef(onAuthResult)
  const modeRef = useRef(mode)

  // Keep refs current without resubscribing effects
  useEffect(() => { onAuthResultRef.current = onAuthResult }, [onAuthResult])
  useEffect(() => { modeRef.current = mode }, [mode])

  // ── Message helpers ─────────────────────────────────────────────────────────

  const addMessage = useCallback((msg: AgentMessage) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const appendToMessage = useCallback((id: string, delta: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, text: m.text + delta } : m)
    )
  }, [])

  const markInterrupted = useCallback((id: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, interrupted: true } : m)
    )
  }, [])

  // ── Playback ────────────────────────────────────────────────────────────────

  const playChunk = useCallback((base64: string) => {
    const audioCtx = audioCtxRef.current
    if (!audioCtx) return
    const float32 = decodePcmChunk(base64)
    const buf = audioCtx.createBuffer(1, float32.length, 24000)
    buf.getChannelData(0).set(float32)
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    src.connect(audioCtx.destination)
    const now = audioCtx.currentTime
    const startAt = Math.max(now, nextPlayTimeRef.current)
    src.start(startAt)
    nextPlayTimeRef.current = startAt + buf.duration
    queuedSourcesRef.current.push(src)
    src.onended = () => {
      const idx = queuedSourcesRef.current.indexOf(src)
      if (idx !== -1) queuedSourcesRef.current.splice(idx, 1)
    }
  }, [])

  const interruptPlayback = useCallback(() => {
    for (const src of queuedSourcesRef.current) {
      try { src.stop() } catch { /* already stopped */ }
    }
    queuedSourcesRef.current = []
    nextPlayTimeRef.current = 0
  }, [])

  // ── Token ───────────────────────────────────────────────────────────────────

  const fetchToken = useCallback(async () => {
    const res = await fetch('/api/voice-token', { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Unknown' }))
      throw new Error(body.error || `Token mint failed: ${res.status}`)
    }
    return res.json() as Promise<{ value: string; expires_at: number }>
  }, [])

  const scheduleTokenRefresh = useCallback(
    (expiresAt: number) => {
      if (tokenRefreshRef.current) clearTimeout(tokenRefreshRef.current)
      const delay = expiresAt * 1000 - Date.now() - 5000
      if (delay <= 0) return
      tokenRefreshRef.current = setTimeout(async () => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return
        try {
          const token = await fetchToken()
          scheduleTokenRefresh(token.expires_at)
        } catch { /* session will expire gracefully */ }
      }, delay)
    },
    [fetchToken]
  )

  // ── Disconnect ──────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current)
    if (tokenRefreshRef.current) clearTimeout(tokenRefreshRef.current)

    workletNodeRef.current?.disconnect()
    workletNodeRef.current = null

    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current = null

    audioCtxRef.current?.close()
    audioCtxRef.current = null

    wsRef.current?.close()
    wsRef.current = null

    interruptPlayback()
    isSessionReadyRef.current = false
    micBufferRef.current = []
    micSampleCountRef.current = 0
    nextPlayTimeRef.current = 0
    currentResponseIdRef.current = null

    setStatus('idle')
    setError(null)
  }, [interruptPlayback])

  // ── Function tool execution ─────────────────────────────────────────────────

  const executeCheckPriorAuth = useCallback(
    async (callId: string, args: { medication: string; patient_name: string; insurance: string }) => {
      const ws = wsRef.current
      let output: string

      try {
        const res = await fetch(`${API_URL}/api/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: modeRef.current,
            text: `${args.medication}, ${args.patient_name}, ${args.insurance}`,
          }),
        })
        if (res.ok) {
          const result: ProcessResponse = await res.json()
          onAuthResultRef.current(result)
          output = JSON.stringify({
            auth_required: result.auth_required,
            confidence_pct: result.confidence,
            wait_time: result.wait_time,
            criteria_met: result.met_requirements,
            missing_docs: result.missing_docs,
            failed_criteria: result.failed_criteria,
            alternatives_no_auth: result.alternatives.map(a => a.name),
            hitl_flag: result.hitl_flag,
            policy_summary: result.policy_summary,
          })
        } else {
          const err = await res.json().catch(() => ({ detail: 'Not found' }))
          output = JSON.stringify({ error: err.detail || `HTTP ${res.status}` })
        }
      } catch (err) {
        output = JSON.stringify({ error: String(err) })
      }

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'function_call_output', call_id: callId, output },
        }))
        ws.send(JSON.stringify({ type: 'response.create' }))
      }
    },
    []
  )

  // ── Connect ─────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'active') return
    isIntentionalDisconnectRef.current = false
    setStatus('connecting')
    setError(null)
    setMessages([])

    try {
      // 1. AudioContext warmup — MUST happen here in the user-gesture handler
      const audioCtx = new AudioContext({ sampleRate: 24000 })
      audioCtxRef.current = audioCtx
      if (audioCtx.state === 'suspended') await audioCtx.resume()

      // 2. Mic capture — starts immediately, parallel with WS connection
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 24000 },
      })
      micStreamRef.current = stream

      stream.getTracks()[0].addEventListener('ended', () => {
        if (!isIntentionalDisconnectRef.current) {
          setError('Microphone disconnected')
          setStatus('error')
          disconnect()
        }
      })

      await audioCtx.audioWorklet.addModule('/pcm-processor-worklet.js')
      const source = audioCtx.createMediaStreamSource(stream)
      const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor')
      workletNodeRef.current = workletNode
      source.connect(workletNode)

      // Buffer mic audio — flush to WS once session is ready
      workletNode.port.onmessage = (evt) => {
        const chunk: Int16Array = evt.data
        const ws = wsRef.current
        if (isSessionReadyRef.current && ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: audioToBase64(chunk) }))
        } else if (micSampleCountRef.current < BUFFER_SAFETY_CAP) {
          micBufferRef.current.push(chunk)
          micSampleCountRef.current += chunk.length
        }
      }

      // 3. Mint ephemeral session token (server-side — key stays private)
      const tokenData = await fetchToken()
      scheduleTokenRefresh(tokenData.expires_at)

      // 4. Open WebSocket
      const ws = new WebSocket(WS_URL, [`xai-client-secret.${tokenData.value}`])
      wsRef.current = ws

      connectTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          setError('Connection timed out — verify your xAI API key has Voice enabled')
          setStatus('error')
          disconnect()
        }
      }, CONNECT_TIMEOUT_MS)

      ws.onopen = () => {
        if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current)

        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            voice: 'Eve',
            instructions: `You are an AI prior authorization assistant at Legion Health.
You help ${modeRef.current === 'clinician'
  ? 'clinicians check prior auth BEFORE prescribing so patients get medication the SAME DAY'
  : 'administrative staff process prior auth requests and generate authorization letters'}.
When the user says a medication name, patient name, and insurance — call check_prior_auth immediately without asking for confirmation.
After getting the result, speak a 2-3 sentence summary: whether auth is required, confidence percentage, wait time${modeRef.current === 'clinician' ? ', and the best no-auth alternative if one exists' : ', and whether the case needs human review'}.
Be direct and clinical. No filler phrases.`,
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: { model: 'grok-2-audio' },
            tools: [
              {
                type: 'function',
                name: 'check_prior_auth',
                description:
                  'Check prior authorization requirements for a specific medication for a patient with a given insurance. Call immediately when you have all three: medication, patient name, insurance.',
                parameters: {
                  type: 'object',
                  properties: {
                    medication: { type: 'string', description: 'Drug name (brand or generic), e.g. Humira, Ozempic, Keytruda' },
                    patient_name: { type: 'string', description: 'Full patient name, e.g. John Doe' },
                    insurance: { type: 'string', description: 'Insurance payer, e.g. Aetna, UHC, BCBS' },
                  },
                  required: ['medication', 'patient_name', 'insurance'],
                },
              },
            ],
            audio: {
              input: { format: { type: 'audio/pcm', rate: 24000 } },
              output: { format: { type: 'audio/pcm', rate: 24000 } },
            },
          },
        }))
      }

      ws.onmessage = async ({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event: Record<string, any> = JSON.parse(data)

        switch (event.type) {
          // ── Session ready → flush buffered mic audio ──────────────────────
          case 'session.updated':
            if (!isSessionReadyRef.current) {
              isSessionReadyRef.current = true
              setStatus('active')
              for (const chunk of micBufferRef.current) {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: audioToBase64(chunk) }))
                }
              }
              micBufferRef.current = []
              micSampleCountRef.current = 0
            }
            break

          // ── User started speaking → interrupt ─────────────────────────────
          case 'input_audio_buffer.speech_started':
            interruptPlayback()
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'response.cancel' }))
            }
            if (currentResponseIdRef.current) {
              markInterrupted(currentResponseIdRef.current)
              currentResponseIdRef.current = null
            }
            break

          // ── User transcript ───────────────────────────────────────────────
          case 'conversation.item.input_audio_transcription.completed':
            if (event.transcript?.trim()) {
              addMessage({ id: `user-${Date.now()}`, role: 'user', text: event.transcript.trim() })
            }
            break

          // ── New assistant response ────────────────────────────────────────
          case 'response.created': {
            const respId = event.response?.id ?? `resp-${Date.now()}`
            currentResponseIdRef.current = respId
            addMessage({ id: respId, role: 'assistant', text: '' })
            break
          }

          // ── Streaming assistant transcript ────────────────────────────────
          case 'response.output_audio_transcript.delta':
            if (currentResponseIdRef.current && event.delta) {
              appendToMessage(currentResponseIdRef.current, event.delta)
            }
            break

          // ── Streaming audio ───────────────────────────────────────────────
          case 'response.output_audio.delta':
            if (event.delta) playChunk(event.delta)
            break

          // ── Function tool call ────────────────────────────────────────────
          case 'response.function_call_arguments.done':
            if (event.name === 'check_prior_auth') {
              try {
                const args = JSON.parse(event.arguments)
                await executeCheckPriorAuth(event.call_id, args)
              } catch {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: JSON.stringify({ error: 'Failed to parse arguments' }),
                    },
                  }))
                  ws.send(JSON.stringify({ type: 'response.create' }))
                }
              }
            }
            break

          case 'response.done':
            currentResponseIdRef.current = null
            break

          case 'error':
            console.error('[xAI Voice]', event)
            if (!isIntentionalDisconnectRef.current) {
              setError(`${event.code ?? 'Error'}: ${event.message ?? 'Unknown voice API error'}`)
            }
            break
        }
      }

      ws.onerror = () => {
        if (!isIntentionalDisconnectRef.current) {
          setStatus('error')
          setError('WebSocket error — check network and API key')
        }
      }

      ws.onclose = () => {
        if (!isIntentionalDisconnectRef.current) {
          setStatus('idle')
          isSessionReadyRef.current = false
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('NotAllowedError') || msg.toLowerCase().includes('permission')) {
        setError('Microphone access denied — check browser permissions')
      } else if (msg.includes('NotFoundError')) {
        setError('No microphone detected')
      } else {
        setError(msg)
      }
      setStatus('error')
      disconnect()
    }
  }, [status, fetchToken, scheduleTokenRefresh, disconnect, interruptPlayback, addMessage, appendToMessage, markInterrupted, playChunk, executeCheckPriorAuth])

  // ── Send text while voice session active ────────────────────────────────────

  const sendText = useCallback((text: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    }))
    ws.send(JSON.stringify({ type: 'response.create' }))
    addMessage({ id: `user-text-${Date.now()}`, role: 'user', text })
  }, [addMessage])

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      isIntentionalDisconnectRef.current = true
      workletNodeRef.current?.disconnect()
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close()
      wsRef.current?.close()
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current)
      if (tokenRefreshRef.current) clearTimeout(tokenRefreshRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { status, messages, error, connect, disconnect, sendText }
}
