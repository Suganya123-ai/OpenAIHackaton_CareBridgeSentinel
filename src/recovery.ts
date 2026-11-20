export type RecoveryStatus = 'review' | 'watch' | 'on-track'

export interface Patient {
  id: string
  name: string
  initials: string
  age: number
  condition: string
  daysOut: number
  status: RecoveryStatus
  statusLabel: string
  lastSeen: string
  weight: string
  weightChange: string
  activity: string
  activityChange: string
  medication: string
  followUp: string
  initialMessage: string
  evidence: string[]
  missing: string[]
}

export const patients: Patient[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    initials: 'MC',
    age: 67,
    condition: 'Heart failure',
    daysOut: 3,
    status: 'review',
    statusLabel: 'Review suggested',
    lastSeen: '8 min ago',
    weight: '71.8 kg',
    weightChange: '+2.0 kg',
    activity: '18 min',
    activityChange: '−17 min vs baseline',
    medication: 'Needs clarification',
    followUp: 'Cardiology · Nov 21',
    initialMessage:
      'I feel more winded walking to the kitchen, and my ankles look a little swollen.',
    evidence: [
      'Breathlessness reported during routine activity',
      'Weight trend is up 2.0 kg from discharge baseline',
      'Daily activity is down 17 minutes from baseline',
      'Ankle swelling mentioned in patient check-in',
    ],
    missing: ['Current blood pressure', 'Medication use confirmation'],
  },
  {
    id: 'elena',
    name: 'Elena Martinez',
    initials: 'EM',
    age: 72,
    condition: 'COPD exacerbation',
    daysOut: 5,
    status: 'on-track',
    statusLabel: 'On track',
    lastSeen: '24 min ago',
    weight: '64.2 kg',
    weightChange: 'Stable',
    activity: '26 min',
    activityChange: '+4 min vs baseline',
    medication: 'Confirmed today',
    followUp: 'Pulmonology · Nov 24',
    initialMessage: 'Breathing feels about the same today. I took my medicines.',
    evidence: [
      'Breathing reported as unchanged',
      'Medication use confirmed in today’s check-in',
      'Activity is near personal baseline',
    ],
    missing: ['Overnight oxygen reading'],
  },
  {
    id: 'robert',
    name: 'Robert Johnson',
    initials: 'RJ',
    age: 61,
    condition: 'Type 2 diabetes',
    daysOut: 2,
    status: 'watch',
    statusLabel: 'Needs check-in',
    lastSeen: '1 hr ago',
    weight: '82.1 kg',
    weightChange: 'No recent reading',
    activity: '22 min',
    activityChange: 'Near baseline',
    medication: 'Not confirmed',
    followUp: 'Primary care · Nov 20',
    initialMessage: 'I could not pick up one of the prescriptions yet.',
    evidence: [
      'Prescription access barrier reported',
      'Medication use has not been confirmed',
      'No new symptoms shared',
    ],
    missing: ['Which prescription is unavailable?', 'Recent glucose reading'],
  },
  {
    id: 'aisha',
    name: 'Aisha Patel',
    initials: 'AP',
    age: 58,
    condition: 'Knee replacement',
    daysOut: 8,
    status: 'watch',
    statusLabel: 'Monitoring',
    lastSeen: '2 hrs ago',
    weight: '68.5 kg',
    weightChange: 'Stable',
    activity: '31 min',
    activityChange: '+6 min vs baseline',
    medication: 'Confirmed today',
    followUp: 'Orthopedics · Nov 19',
    initialMessage: 'Pain is manageable. I would like to know when to increase walking.',
    evidence: [
      'Pain described as manageable',
      'Activity is increasing gradually',
      'Patient asked about recovery milestones',
    ],
    missing: ['Physical therapy appointment confirmation'],
  },
]

export function getAdaptiveQuestion(notes: string[]): string {
  const latest = (notes.at(-1) ?? '').toLowerCase().replace(/[’‘]/g, "'")

  if (latest.includes('breath') || latest.includes('winded')) {
    return 'Is the breathlessness new or getting worse, and does it happen while resting or lying down?'
  }
  if (latest.includes('swelling') || latest.includes('swollen') || latest.includes('ankle')) {
    return 'Have you noticed a change in your weight since yesterday?'
  }
  const mentionsMedication =
    latest.includes('prescription') || latest.includes('medicine') || latest.includes('medication')
  const accessBarrier = [
    "couldn't pick up",
    'could not pick up',
    "can't get",
    'cannot get',
    'unable to get',
    'ran out of',
    'missed a dose',
  ].some((phrase) => latest.includes(phrase))
  if (mentionsMedication && accessBarrier) {
    return 'Which medicine is difficult to access, and have you been able to take the others as directed?'
  }
  if (mentionsMedication) {
    return 'Are the medication instructions clear, and have you been able to follow them as planned?'
  }
  if (latest.includes('tired') || latest.includes('fatigue') || latest.includes('sleep')) {
    return 'Are you also feeling short of breath during your usual activities?'
  }
  return 'What has changed most since your last check-in?'
}

export function getAgentFinding(patient: Patient, latestNote: string): string {
  const note = latestNote.toLowerCase().replace(/[’‘]/g, "'")
  if (note.includes('same') || note.includes('unchanged') || note.includes('no change')) {
    return patient.evidence[0]
  }
  if (note.includes('took my medicine') || note.includes('took my medication')) {
    return 'Patient reports taking medication; reconcile with the discharge list as needed.'
  }
  if (
    note.includes("couldn't pick up") ||
    note.includes('could not pick up') ||
    note.includes('unable to get') ||
    note.includes('ran out of') ||
    note.includes('missed a dose')
  ) {
    return 'Access barrier reported; confirm the medication and connect with the care team.'
  }
  if (note.includes('chest pain') || note.includes('dizz')) {
    return 'A concerning symptom was reported during rehab; the session was stopped and human review requested.'
  }
  if (note.includes('breath') || note.includes('winded')) {
    return 'New breathing concern reported; compare with the patient’s recent baseline.'
  }
  if (note.includes('swelling') || note.includes('swollen')) {
    return 'Swelling mentioned; ask a focused follow-up and verify available measurements.'
  }
  if (latestNote === patient.initialMessage) return patient.evidence[0]
  return 'Patient-reported update logged; no demo rule classifies it further.'
}

export function getEvidenceForReview(patient: Patient, latestNote: string): string[] {
  if (latestNote === patient.initialMessage) return patient.evidence
  return [`Latest patient-reported update: “${latestNote}”`, ...patient.evidence]
}

export function makeClinicianSummary(
  patient: Patient,
  action: string,
  latestNote: string,
): string {
  const evidence = getEvidenceForReview(patient, latestNote)
  return [
    `Patient: ${patient.name}, ${patient.age} · Day ${patient.daysOut} after discharge for ${patient.condition}`,
    `Workflow status: ${patient.statusLabel}`,
    `Latest patient-reported information: “${latestNote}”`,
    `Evidence for human review: ${evidence.join('; ')}`,
    `Missing information: ${patient.missing.join('; ')}`,
    `Suggested next workflow: ${action}. Human review required; no diagnosis or treatment decision is made.`,
  ].join('\n')
}
