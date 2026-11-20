export type RehabSessionStatus = 'completed' | 'stopped'
export type PoseState = 'measured' | 'uncertain' | 'unavailable' | 'simulated'

export interface RehabSession {
  id: string
  recordedAt: string
  status: RehabSessionStatus
  durationMinutes: number | null
  patientReport: string
  poseState: PoseState
  reps: number | null
  poseNote: string
  source: 'patient-reported' | 'synthetic-demo'
}

export function createRehabSession(
  input: Omit<RehabSession, 'id' | 'recordedAt'>,
  now: Date = new Date(),
): RehabSession {
  return {
    ...input,
    id: `rehab-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: now.toISOString(),
  }
}

export const demoRehabSessions: RehabSession[] = [
  {
    id: 'demo-rehab-1',
    recordedAt: 'Day −2',
    status: 'completed',
    durationMinutes: 12,
    patientReport: 'Patient-reported effort: manageable.',
    poseState: 'simulated',
    reps: 8,
    poseNote: 'Illustrative rep count only; not produced by pose tracking.',
    source: 'synthetic-demo',
  },
  {
    id: 'demo-rehab-2',
    recordedAt: 'Day −1',
    status: 'completed',
    durationMinutes: 9,
    patientReport: 'No symptoms reported in this synthetic session.',
    poseState: 'uncertain',
    reps: null,
    poseNote: 'Synthetic example: camera framing was insufficient; reps not estimated.',
    source: 'synthetic-demo',
  },
]

