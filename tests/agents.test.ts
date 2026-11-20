import assert from 'node:assert/strict'
import test from 'node:test'
import { makeNurseHandoff, runRecoveryAgents, verifyAgentEvidence } from '../src/agents.ts'
import { patients } from '../src/recovery.ts'
import { demoRehabSessions } from '../src/rehab.ts'

const maya = patients[0]

test('specialist agents link findings to sources and preserve uncertain pose data', () => {
  const run = runRecoveryAgents(maya, 'I feel more winded today.', demoRehabSessions)
  const mobility = run.findings.find((finding) => finding.id === 'mobility')

  assert.equal(run.findings.length, 7)
  assert.equal(run.findings[0].agent, 'Symptom agent')
  assert.equal(run.findings.at(-1)?.agent, 'Escalation agent')
  assert.ok(mobility)
  assert.equal(mobility.status, 'uncertain')
  assert.match(mobility.summary, /no rep count or mobility trend is inferred/)
  assert.equal(run.verification.status, 'needs-review')
  assert.equal(run.verification.unsupportedFindings.length, 0)
  assert.ok(run.evidence.some((item) => item.source === 'Synthetic rehab-session fixture'))
})

test('urgent symptom reports raise a human-review priority without diagnosing', () => {
  const run = runRecoveryAgents(maya, 'Chest pain reported during home rehab.', [])
  const symptom = run.findings.find((finding) => finding.id === 'symptom')

  assert.equal(symptom?.priority, 'urgent')
  assert.match(symptom?.summary ?? '', /does not assess clinical severity/)
  assert.equal(run.handoffPriority, 'urgent')
})

test('negated symptom reports are not promoted to a positive finding', () => {
  const run = runRecoveryAgents(maya, 'I do not have chest pain or dizziness.', [])
  const symptom = run.findings.find((finding) => finding.id === 'symptom')

  assert.equal(symptom?.priority, 'routine')
  assert.equal(run.handoffPriority, 'review')
})

test('missing pose data is disclosed without automatically elevating handoff priority', () => {
  const elena = patients[1]
  const run = runRecoveryAgents(elena, elena.initialMessage, [])
  const mobility = run.findings.find((finding) => finding.id === 'mobility')

  assert.equal(mobility?.status, 'uncertain')
  assert.equal(run.verification.status, 'needs-review')
  assert.equal(run.handoffPriority, 'routine')
})

test('independent verifier rejects unsupported agent findings', () => {
  const run = runRecoveryAgents(maya, maya.initialMessage, [])
  const finding = run.findings[0]
  const verification = verifyAgentEvidence(
    [{ ...finding, evidenceIds: ['missing-source'] }],
    run.evidence,
    [],
  )

  assert.equal(verification.status, 'insufficient')
  assert.deepEqual(verification.unsupportedFindings, ['symptom'])
  assert.match(verification.summary, /do not use this handoff/)
})

test('independent verifier catches claims contradicted by linked patient evidence', () => {
  const run = runRecoveryAgents(maya, 'I feel okay today.', [])
  const symptom = run.findings.find((finding) => finding.id === 'symptom')
  assert.ok(symptom)
  const verification = verifyAgentEvidence(
    [{ ...symptom, status: 'finding', priority: 'urgent', summary: 'Chest pain reported.' }],
    run.evidence,
    [],
  )

  assert.equal(verification.status, 'insufficient')
  assert.deepEqual(verification.unsupportedFindings, ['symptom'])
})

test('nurse handoff includes evidence provenance, uncertainty, and delivery boundary', () => {
  const run = runRecoveryAgents(maya, 'I feel more winded today.', demoRehabSessions)
  const handoff = makeNurseHandoff(maya, 'Nurse follow-up', run)

  assert.match(handoff, /Synthetic rehab-session fixture/)
  assert.match(handoff, /No verified pose data/)
  assert.match(handoff, /No nurse was contacted/)
  assert.match(handoff, /Nurse follow-up/)
})

