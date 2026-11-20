import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Patient } from './recovery'
import { createRehabSession, type RehabSession } from './rehab'

export type RehabEventLevel = 'routine' | 'review' | 'urgent'

interface RehabCoachProps {
  patient: Patient
  sessions: RehabSession[]
  onObservation: (message: string, session: RehabSession, level: RehabEventLevel) => void
}

function RehabCoach({ patient, sessions, onObservation }: RehabCoachProps) {
  const [exerciseVideoUrl, setExerciseVideoUrl] = useState('')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [planConfirmed, setPlanConfirmed] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [lastEvent, setLastEvent] = useState('')
  const cameraRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const sessionStartedAt = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (exerciseVideoUrl) URL.revokeObjectURL(exerciseVideoUrl)
    }
  }, [exerciseVideoUrl])

  useEffect(() => {
    if (cameraRef.current && cameraStream) {
      cameraRef.current.srcObject = cameraStream
    }
    return () => cameraStream?.getTracks().forEach((track) => track.stop())
  }, [cameraStream])

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraStream(null)
    setSessionActive(false)
  }

  async function startSession() {
    setCameraError('')
    if (!planConfirmed) {
      setCameraError('Confirm this is a care-team-approved exercise plan before starting.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable in this browser or connection.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      cameraStreamRef.current = stream
      sessionStartedAt.current = Date.now()
      setCameraStream(stream)
      setSessionActive(true)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setCameraError('Camera permission was declined. Allow camera access in your browser to preview the session.')
        return
      }
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        setCameraError('No camera was found. You can still review the care-team exercise video.')
        return
      }
      setCameraError('The camera could not be started. Check browser permissions and try again.')
    }
  }

  function handleVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (file) setExerciseVideoUrl(URL.createObjectURL(file))
    event.currentTarget.value = ''
  }

  function finishSession() {
    stopCamera()
    const durationMinutes = sessionStartedAt.current === null
      ? null
      : Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 60_000))
    sessionStartedAt.current = null
    const message = 'Session completed; pose and repetition measurements unavailable in this demo.'
    const session = createRehabSession({
      status: 'completed',
      durationMinutes,
      patientReport: message,
      poseState: 'unavailable',
      reps: null,
      poseNote: 'Pose tracking is not connected; no rep count was generated.',
      source: 'patient-reported',
    })
    setLastEvent(message)
    onObservation(message, session, 'routine')
  }

  function reportSymptom(symptom: 'increased breathlessness' | 'chest pain' | 'dizziness') {
    const durationMinutes = sessionStartedAt.current === null
      ? null
      : Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 60_000))
    stopCamera()
    sessionStartedAt.current = null
    const level = symptom === 'increased breathlessness' ? 'review' : 'urgent'
    const event = `${symptom[0].toUpperCase()}${symptom.slice(1)} reported during home cardiac rehab.`
    const session = createRehabSession({
      status: 'stopped',
      durationMinutes,
      patientReport: `${event} Session stopped by patient.`,
      poseState: 'unavailable',
      reps: null,
      poseNote: 'Pose tracking is not connected; no rep count was generated.',
      source: 'patient-reported',
    })
    setLastEvent(event)
    onObservation(`${event} Session stopped; human review requested.`, session, level)
  }

  return (
    <section aria-labelledby="rehab-title" className="panel rehab-panel" id="rehab">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Home cardiac rehabilitation</div>
          <h2 id="rehab-title">Supervised exercise check-in</h2>
          <p className="panel-description">
            {patient.name} · Select a care-team exercise and record how the session felt.
          </p>
        </div>
        <span className={`rehab-session-status ${sessionActive ? 'active' : ''}`}>
          <span /> {sessionActive ? 'Session active' : 'Not started'}
        </span>
      </div>

      <div className="rehab-grid">
        <div className="rehab-media-column">
          <div className="rehab-video-card">
            <div className="rehab-video-heading">
              <span>Care-team exercise video</span>
              <span className="rehab-local-tag">Local preview</span>
            </div>
            {exerciseVideoUrl ? (
              <video className="rehab-exercise-video" controls playsInline src={exerciseVideoUrl}>
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="rehab-video-empty">
                <span className="rehab-play-mark">▶</span>
                <strong>No exercise video selected</strong>
                <span>Upload a clinician-assigned exercise video to view it here.</span>
              </div>
            )}
            <label className="secondary-button rehab-upload">
              Choose exercise video
              <input accept="video/*" aria-label="Choose a care-team exercise video" onChange={handleVideoChange} type="file" />
            </label>
          </div>

          <div className="rehab-camera-card">
            <div className="rehab-video-heading">
              <span>Camera preview</span>
              <span className="rehab-local-tag">Not recorded</span>
            </div>
            {cameraStream ? (
              <video autoPlay className="rehab-camera-video" muted playsInline ref={cameraRef} />
            ) : (
              <div className="rehab-camera-empty">
                <span>Camera is off</span>
                <small>It starts only after you confirm the care-team plan and press “Start session”.</small>
              </div>
            )}
            <p className="rehab-privacy-note">Video stays in this browser. This prototype does not upload or record camera footage.</p>
          </div>
        </div>

        <div className="rehab-session-column">
          <div className="rehab-check-card">
            <div className="rehab-card-title">Session readiness</div>
            <label className="rehab-confirm">
              <input
                checked={planConfirmed}
                onChange={(event) => setPlanConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>I have a care-team-approved exercise plan for today.</span>
            </label>
            <div className="rehab-control-row">
              {!sessionActive ? (
                <button className="primary-button" onClick={startSession} type="button">
                  Start session
                </button>
              ) : (
                <>
                  <button className="secondary-button" onClick={stopCamera} type="button">Stop camera</button>
                  <button className="primary-button" onClick={finishSession} type="button">End &amp; log session</button>
                </>
              )}
            </div>
            {cameraError && <p className="rehab-error" role="alert">{cameraError}</p>}
          </div>

          <div className="rehab-capabilities" aria-label="Prototype integration status">
            <div className="rehab-card-title">Session signals</div>
            <div className="rehab-signal-row">
              <span>Pose tracking &amp; rep count</span>
              <span className="integration-status">Not connected</span>
            </div>
            <div className="rehab-signal-row">
              <span>Realtime voice coach</span>
              <span className="integration-status">Not connected</span>
            </div>
            <p className="rehab-integration-note">
              Camera preview alone does not analyze pose, count repetitions, hear speech, or provide form cues.
            </p>
          </div>

          <div className="rehab-symptom-card">
            <div className="rehab-card-title">How are you feeling during exercise?</div>
            <p className="rehab-copy">Choose a symptom to stop the session and add it to {patient.name}’s Recovery Twin.</p>
            <div className="rehab-symptom-actions">
              <button className="symptom-button review" onClick={() => reportSymptom('increased breathlessness')} type="button">
                More breathless than usual
              </button>
              <button className="symptom-button urgent" onClick={() => reportSymptom('chest pain')} type="button">
                Chest pain
              </button>
              <button className="symptom-button urgent" onClick={() => reportSymptom('dizziness')} type="button">
                Dizziness
              </button>
            </div>
            {lastEvent && <div aria-live="polite" className="rehab-last-event">{lastEvent}</div>}
            <p className="rehab-urgent-note">
              Symptom reports are queued only in this demo; no nurse is contacted. For severe or worsening symptoms, follow your care team’s urgent-symptom plan or contact local emergency services.
            </p>
          </div>

          <div className="rehab-safety-note">
            This prototype is not real-time clinical monitoring. Do not rely on it to assess exercise safety or replace instructions from the care team.
          </div>
        </div>
      </div>

      <div className="rehab-history">
        <div className="rehab-history-heading">
          <div>
            <div className="rehab-card-title">Session history</div>
            <p className="panel-description">Patient-specific records with source and measurement quality.</p>
          </div>
          <span className="decision-badge">{sessions.length} sessions</span>
        </div>
        {sessions.length === 0 ? (
          <p className="rehab-empty-history">No rehab sessions recorded for this patient.</p>
        ) : (
          <div className="rehab-history-list">
            {sessions.slice().reverse().map((session) => (
              <article className="rehab-history-item" key={session.id}>
                <span className={`rehab-history-marker ${session.status}`} />
                <div className="rehab-history-main">
                  <div className="rehab-history-topline">
                    <strong>{session.status === 'stopped' ? 'Stopped session' : 'Session recorded'}</strong>
                    <span>{session.recordedAt.startsWith('Day') ? session.recordedAt : new Date(session.recordedAt).toLocaleString()}</span>
                  </div>
                  <p>{session.patientReport}</p>
                  <div className="rehab-provenance">
                    <span>Source: {session.source === 'synthetic-demo' ? 'Synthetic demo fixture' : 'Patient report / session log'}</span>
                    <span>
                      Pose: {session.poseState === 'simulated'
                        ? `Synthetic only · ${session.reps} illustrative reps`
                        : session.poseState === 'uncertain'
                          ? 'Uncertain · reps not counted'
                          : 'Unavailable · no reps counted'}
                    </span>
                    {session.durationMinutes !== null && <span>Duration: {session.durationMinutes} min</span>}
                  </div>
                  <div className="rehab-quality-note">{session.poseNote}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default RehabCoach
