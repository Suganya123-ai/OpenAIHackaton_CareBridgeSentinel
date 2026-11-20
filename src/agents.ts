import type { Patient } from './recovery'
import type { RehabSession } from './rehab'

export type EvidenceQuality = 'patient-reported' | 'synthetic-demo' | 'unavailable'
export type FindingStatus = 'finding' | 'clear' | 'uncertain'
export type FindingPriority = 'routine' | 'review' | 'urgent'

export interface EvidenceItem {
  id: string
  source: string
  recordedAt: string
  quality: EvidenceQuality
  detail: string
}

export interface AgentFinding {
  id: string
  agent: string
  status: FindingStatus
  priority: FindingPriority
  confidence: 'low' | 'moderate' | 'high'
  summary: string
  evidenceIds: string[]
}

export interface VerificationResult {
  status: 'evidence-linked' | 'needs-review' | 'insufficient'
  summary: string
  checkedEvidence: number
  unsupportedFindings: string[]
  limitations: string[]
}

export interface AgentRun {
  findings: AgentFinding[]
  evidence: EvidenceItem[]
  verification: VerificationResult
  handoffPriority: FindingPriority
  escalation: AgentFinding
}

export function makeNurseHandoff(
  patient: Patient,
  selectedWorkflow: string,
  run: AgentRun,
): string {
  const patientReport = run.evidence.find((item) => item.id === 'patient-report')
  const linkedEvidence = run.findings
    .flatMap((finding) =>
      finding.evidenceIds.map((id) => {
        const item = run.evidence.find((source) => source.id === id)
        return item ? `${finding.agent}: ${item.detail} [${item.source}; ${item.quality}]` : null
      }),
    )
    .filter((item): item is string => item !== null)

  return [
    `Patient: ${patient.name}, ${patient.age} · Day ${patient.daysOut} after discharge for ${patient.condition}`,
    `Escalation agent: ${run.escalation.summary}`,
    `Review priority: ${run.handoffPriority.toUpperCase()} · administrative routing only; not a clinical triage result`,
    `Patient's latest report: “${patientReport?.detail ?? 'No patient report recorded.'}”`,
    `Evidence by agent: ${linkedEvidence.join('; ') || 'No evidence linked.'}`,
    `Verification: ${run.verification.status}. ${run.verification.summary}`,
    `Uncertainty and missing information: ${[...run.verification.limitations, ...patient.missing].join('; ')}`,
    `Suggested workflow for human review: ${selectedWorkflow}.`,
    'Draft only. No nurse was contacted; no diagnosis, treatment, or exercise clearance was produced.',
  ].join('\n')
}

function containsReported(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase()
  const alternatives = terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const negativeLead =
    '\\b(?:no|not|denies|without|(?:do|does) not have|(?:don\\x27t|doesn\\x27t) have|not experiencing)\\s+(?:any\\s+)?'
  const negationStart = new RegExp(`${negativeLead}$`)
  const negatedClause = new RegExp(
    `${negativeLead}(?:${alternatives})(?:\\s+(?:or|and)\\s+(?:${alternatives}))*\\s*(?:(?:or|and)\\s*)?$`,
  )

  return terms.some((term) => {
    let start = normalized.indexOf(term)
    while (start !== -1) {
      const before = normalized.slice(Math.max(0, start - 100), start)
      if (!negationStart.test(before) && !negatedClause.test(before)) return true
      start = normalized.indexOf(term, start + term.length)
    }
    return false
  })
}

function latestSession(sessions: RehabSession[]): RehabSession | undefined {
  return sessions.at(-1)
}

interface AgentContext {
  patient: Patient
  latestPatientReport: string
  sessions: RehabSession[]
  evidence: EvidenceItem[]
}

function runSymptomAgent(context: AgentContext): AgentFinding {
  const report = context.latestPatientReport
  const urgentSymptom = containsReported(report, ['chest pain', 'dizziness', 'dizzy', 'faint'])
  const breathlessness = containsReported(report, ['breathless', 'short of breath', 'winded'])
  return {
    id: 'symptom',
    agent: 'Symptom agent',
    status: urgentSymptom || breathlessness ? 'finding' : 'uncertain',
    priority: urgentSymptom ? 'urgent' : breathlessness ? 'review' : 'routine',
    confidence: urgentSymptom || breathlessness ? 'moderate' : 'low',
    summary: urgentSymptom
      ? 'Patient-reported symptom requires human review; this rule does not assess clinical severity.'
      : breathlessness
        ? 'Breathlessness appears in the patient report; context and change from baseline need human review.'
        : 'No symptom conclusion drawn beyond the latest patient report.',
    evidenceIds: ['patient-report'],
  }
}

function runRecoveryTwinAgent(context: AgentContext, symptom: AgentFinding): AgentFinding {
  const sessions = context.sessions
  return {
    id: 'recovery',
    agent: 'Recovery agent',
    status: sessions.length > 1 ? 'finding' : 'uncertain',
    priority: symptom.priority,
    confidence: sessions.length > 1 ? 'moderate' : 'low',
    summary: sessions.length > 1
      ? `${sessions.length} session records are available. Compare only patient-reported observations; synthetic or uncertain pose signals cannot establish a mobility change.`
      : 'Not enough session history to compare recovery over time.',
    evidenceIds: sessions.length
      ? sessions.map((session) => `session-${session.id}`)
      : ['patient-report'],
  }
}

function runMobilityAgent(context: AgentContext): AgentFinding {
  const latest = latestSession(context.sessions)
  const hasReliablePose = context.sessions.some((session) => session.poseState === 'measured')
  return {
    id: 'mobility',
    agent: 'Mobility agent',
    status: hasReliablePose ? 'finding' : 'uncertain',
    priority: 'routine',
    confidence: hasReliablePose ? 'moderate' : 'low',
    summary: hasReliablePose
      ? 'Measured pose observations are available for comparison; they are not a clinical assessment.'
      : latest?.poseState === 'uncertain'
        ? 'Latest pose estimate is uncertain; no rep count or mobility trend is inferred.'
        : 'No verified pose measurements are connected; mobility trend is unknown.',
    evidenceIds: [latest ? `session-${latest.id}` : 'pose-availability'],
  }
}

function runMedicationAgent(context: AgentContext): AgentFinding {
  const medicationUnclear = /clarif|not confirmed|unknown/i.test(context.patient.medication)
  return {
    id: 'medication',
    agent: 'Medication agent',
    status: medicationUnclear ? 'uncertain' : 'clear',
    priority: 'routine',
    confidence: medicationUnclear ? 'low' : 'moderate',
    summary: medicationUnclear
      ? 'Medication status is unresolved in the synthetic discharge fixture; reconcile with the care team.'
      : `Medication status is recorded as “${context.patient.medication}” in the synthetic discharge fixture.`,
    evidenceIds: ['discharge-plan'],
  }
}

function runContextAgent(context: AgentContext): AgentFinding {
  return {
    id: 'context',
    agent: 'Context agent',
    status: 'uncertain',
    priority: 'routine',
    confidence: 'low',
    summary: `${context.patient.missing.length} information gaps remain. Next planned follow-up: ${context.patient.followUp}.`,
    evidenceIds: ['discharge-plan'],
  }
}

function runInterventionAgent(
  context: AgentContext,
  symptom: AgentFinding,
  medication: AgentFinding,
): AgentFinding {
  const breathlessness = containsReported(context.latestPatientReport, ['breathless', 'short of breath', 'winded'])
  const urgentSymptom = symptom.priority === 'urgent'
  const medicationUnclear = medication.status === 'uncertain'
  return {
    id: 'intervention',
    agent: 'Intervention agent',
    status: 'finding',
    priority: urgentSymptom ? 'urgent' : breathlessness || medicationUnclear ? 'review' : 'routine',
    confidence: urgentSymptom || breathlessness ? 'moderate' : 'low',
    summary: urgentSymptom
      ? 'Prepare an urgent human-review draft. No automated contact or clinical action is available.'
      : breathlessness
        ? 'Consider a nurse follow-up draft to clarify the patient-reported breathing change.'
        : medicationUnclear
          ? 'Consider a care-team follow-up to clarify the medication information.'
          : 'Keep the care-team workflow choices available; a human selects any follow-up.',
    evidenceIds: medicationUnclear
      ? ['patient-report', 'discharge-plan']
      : ['patient-report'],
  }
}

export function verifyAgentEvidence(
  findings: AgentFinding[],
  evidence: EvidenceItem[],
  limitations: string[],
): VerificationResult {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]))
  const unsupportedFindings = findings.filter((finding) => {
    if (!finding.evidenceIds.length) return true
    const linked = finding.evidenceIds.map((id) => evidenceById.get(id))
    if (linked.some((item) => !item || !item.source.trim() || !item.detail.trim())) return true

    if (finding.id === 'symptom' && finding.status === 'finding') {
      const report = linked.map((item) => item?.detail.toLowerCase() ?? '').join(' ')
      const terms = finding.priority === 'urgent'
        ? ['chest pain', 'dizziness', 'dizzy', 'faint']
        : ['breathless', 'short of breath', 'winded']
      return !terms.some((term) => report.includes(term))
    }

    if (finding.id === 'mobility' && finding.status === 'finding') {
      return !linked.some((item) => item?.quality === 'patient-reported')
    }
    return false
  }).map((finding) => finding.id)
  const status = unsupportedFindings.length
    ? 'insufficient'
    : limitations.some((item) => item.startsWith('No verified pose')) ||
        findings.some((finding) => finding.priority === 'urgent' || finding.priority === 'review')
      ? 'needs-review'
      : 'evidence-linked'

  return {
    status,
    summary: unsupportedFindings.length
      ? 'Some findings lack a linked evidence record; do not use this handoff.'
      : 'Every finding links to a source. The verifier preserves missing data and synthetic inputs as limitations; a clinician must review the handoff.',
    checkedEvidence: findings.reduce((count, finding) => count + finding.evidenceIds.length, 0),
    unsupportedFindings,
    limitations,
  }
}

export function runRecoveryAgents(
  patient: Patient,
  latestPatientReport: string,
  sessions: RehabSession[],
): AgentRun {
  const evidence: EvidenceItem[] = [
    {
      id: 'patient-report',
      source: 'Patient check-in',
      recordedAt: 'Latest entry',
      quality: 'patient-reported',
      detail: latestPatientReport,
    },
    {
      id: 'discharge-plan',
      source: 'Synthetic discharge-plan fixture',
      recordedAt: 'Discharge baseline',
      quality: 'synthetic-demo',
      detail: `Follow-up: ${patient.followUp}. Medication status: ${patient.medication}.`,
    },
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      source: session.source === 'synthetic-demo' ? 'Synthetic rehab-session fixture' : 'Patient-entered rehab session',
      recordedAt: session.recordedAt,
      quality: session.source === 'synthetic-demo' ? 'synthetic-demo' as const : 'patient-reported' as const,
      detail: `${session.status === 'stopped' ? 'Session stopped' : 'Session recorded'}: ${session.patientReport} Pose: ${session.poseNote}`,
    })),
    {
      id: 'pose-availability',
      source: 'Rehab integration status',
      recordedAt: 'Current prototype',
      quality: 'unavailable',
      detail: 'MediaPipe pose tracking is not connected; no live movement estimate is available.',
    },
  ]

  const context = { patient, latestPatientReport, sessions, evidence }
  const symptom = runSymptomAgent(context)
  const recovery = runRecoveryTwinAgent(context, symptom)
  const mobility = runMobilityAgent(context)
  const medication = runMedicationAgent(context)
  const socialContext = runContextAgent(context)
  const intervention = runInterventionAgent(context, symptom, medication)
  const findings = [symptom, recovery, mobility, medication, socialContext, intervention]
  const hasReliablePose = sessions.some((session) => session.poseState === 'measured')
  const limitations = [
    ...(!hasReliablePose ? ['No verified pose data; mobility cannot be assessed.'] : []),
    ...(evidence.some((item) => item.quality === 'synthetic-demo') ? ['Synthetic demo fixtures are not patient measurements.'] : []),
    'Confidence labels are rule-based and not clinically calibrated.',
  ]
  const verification = verifyAgentEvidence(findings, evidence, limitations)
  const priorities: FindingPriority[] = findings.map((finding) => finding.priority)
  const handoffPriority: FindingPriority = verification.status === 'insufficient'
    ? 'review'
    : priorities.includes('urgent')
      ? 'urgent'
      : priorities.includes('review')
        ? 'review'
        : 'routine'
  const escalation: AgentFinding = {
    id: 'escalation',
    agent: 'Escalation agent',
    status: 'finding',
    priority: handoffPriority,
    confidence: 'low',
    summary: verification.status === 'insufficient'
      ? 'Handoff held for human review because one or more findings could not be evidence-linked.'
      : handoffPriority === 'urgent'
        ? 'Urgent symptom report is reflected in a local human-review draft; no nurse alert was delivered.'
        : handoffPriority === 'review'
          ? 'Prepare a local human-review draft with evidence and limitations; no notification was delivered.'
          : 'No elevated demo workflow signal; planned follow-up remains for human confirmation.',
    evidenceIds: ['patient-report'],
  }

  return { findings: [...findings, escalation], evidence, verification, handoffPriority, escalation }
}

