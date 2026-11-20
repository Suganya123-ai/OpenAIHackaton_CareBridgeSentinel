import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAdaptiveQuestion,
  getAgentFinding,
  getEvidenceForReview,
  makeClinicianSummary,
  patients,
} from '../src/recovery.ts'

const maya = patients[0]
const elena = patients[1]

test('adaptive questions follow the unresolved signal in the latest check-in', () => {
  assert.match(getAdaptiveQuestion(['I feel winded walking']), /resting or lying down/)
  assert.match(getAdaptiveQuestion(['My ankles look swollen']), /weight since yesterday/)
  assert.match(getAdaptiveQuestion(['I could not pick up a prescription']), /Which medicine/)
  assert.match(getAdaptiveQuestion(['I am tired and slept poorly']), /short of breath/)
  assert.match(getAdaptiveQuestion(['I took my medicines today']), /instructions clear/)
})

test('neutral breathing updates do not become new symptom findings', () => {
  assert.equal(getAgentFinding(elena, 'Breathing feels about the same today.'), elena.evidence[0])
})

test('unclassified check-ins are not rewritten as existing symptoms', () => {
  assert.match(getAgentFinding(maya, 'I slept well last night.'), /no demo rule classifies it further/)
})

test('rehab warning symptoms are surfaced for human review', () => {
  assert.match(getAgentFinding(maya, 'Home cardiac rehab: Dizziness reported during exercise.'), /session was stopped/)
})

test('new patient reports are included as unverified evidence for review', () => {
  const update = 'I felt more tired after lunch.'
  const evidence = getEvidenceForReview(maya, update)
  assert.match(evidence[0], /Latest patient-reported update/)
  assert.match(evidence[0], /more tired/)
  assert.equal(evidence.length, maya.evidence.length + 1)
  assert.equal(getEvidenceForReview(maya, maya.initialMessage), maya.evidence)
})

test('clinician summaries preserve missing information and human-review boundaries', () => {
  const summary = makeClinicianSummary(maya, 'Nurse follow-up', 'I feel more winded today.')
  assert.match(summary, /I feel more winded today/)
  assert.match(summary, /Current blood pressure/)
  assert.match(summary, /Human review required/)
})
