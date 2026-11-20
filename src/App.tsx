import { useEffect, useState, type FormEvent } from 'react'
import { makeNurseHandoff, runRecoveryAgents } from './agents'
import {
  getAdaptiveQuestion,
  patients,
  type Patient,
} from './recovery'
import RehabCoach, { type RehabEventLevel } from './RehabCoach'
import { demoRehabSessions, type RehabSession } from './rehab'
import './App.css'

type IconName =
  | 'activity'
  | 'bell'
  | 'calendar'
  | 'check'
  | 'chevron'
  | 'clipboard'
  | 'clock'
  | 'filter'
  | 'grid'
  | 'heart'
  | 'message'
  | 'plus'
  | 'search'
  | 'shield'
  | 'spark'
  | 'users'
  | 'weight'
  | 'pill'
  | 'arrow'

const iconPaths: Record<IconName, string[]> = {
  activity: ['M3 12h4l3-8 4 16 3-8h4'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 9h18', 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z'],
  check: ['m5 12 4 4L19 6'],
  chevron: ['m9 18 6-6-6-6'],
  clipboard: ['M9 5H5v16h14V5h-4', 'M9 3h6v4H9z', 'M8 12h8', 'M8 16h6'],
  clock: ['M12 8v4l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  filter: ['M4 6h16', 'M7 12h10', 'M10 18h4'],
  grid: ['M3 3h8v8H3z', 'M13 3h8v5h-8z', 'M13 10h8v11h-8z', 'M3 13h8v8H3z'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z', 'M3.5 12h5l2-3 3 6 2-3h5'],
  message: ['M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['m21 21-4.3-4.3', 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z'],
  shield: ['M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z', 'm9 12 2 2 4-4'],
  spark: ['m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z', 'm19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M20 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  weight: ['M4 7h16l1 14H3L4 7Z', 'M9 7a3 3 0 0 1 6 0', 'M12 11v3'],
  pill: ['m10.5 20.5 10-10a5.7 5.7 0 0 0-8-8l-10 10a5.7 5.7 0 0 0 8 8Z', 'm8.5 8.5 7 7'],
  arrow: ['M7 17 17 7', 'M7 7h10v10'],
}

function Icon({
  name,
  size = 16,
}: {
  name: IconName
  size?: number
}) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  )
}

const navigation = [
  { label: 'Overview', icon: 'grid', target: 'overview' },
  { label: 'Patients', icon: 'users', target: 'patients' },
  { label: 'Recovery twin', icon: 'activity', target: 'recovery' },
  { label: 'Cardiac rehab', icon: 'heart', target: 'rehab' },
  { label: 'Care team queue', icon: 'clipboard', target: 'report' },
] as const

const actionOptions = [
  {
    id: 'monitor',
    name: 'Continue monitoring',
    details: 'Keep the planned check-in cadence and watch for change.',
    impact: 'Low',
    urgency: 'Routine',
    burden: 'Low',
  },
  {
    id: 'question',
    name: 'Ask a focused question',
    details: 'Resolve one high-value information gap before prioritizing.',
    impact: 'Clarifies',
    urgency: 'Soon',
    burden: 'Low',
  },
  {
    id: 'nurse',
    name: 'Nurse follow-up',
    details: 'Route the evidence summary to the transitional-care team.',
    impact: 'Support',
    urgency: 'Today',
    burden: 'Moderate',
  },
  {
    id: 'review',
    name: 'Earlier clinician review',
    details: 'Request human review of whether follow-up timing should change.',
    impact: 'Review',
    urgency: 'Prompt',
    burden: 'Higher',
  },
] as const

type ActionId = (typeof actionOptions)[number]['id']

function getSuggestedAction(patient: Patient): ActionId {
  if (patient.status === 'review') return 'nurse'
  if (patient.status === 'watch') return 'question'
  return 'monitor'
}

function getActionLabel(actionId: ActionId): string {
  return actionOptions.find((option) => option.id === actionId)?.name ?? 'Nurse follow-up'
}

function getRiskSummary(patient: Patient): string {
  if (patient.status === 'review') return 'Potential recovery deviation'
  if (patient.status === 'watch') return 'Information gap to resolve'
  return 'Recovery tracking near baseline'
}

function TrajectoryChart({ patient, days }: { patient: Patient; days: 5 | 14 }) {
  const expectedReference = [82, 77, 72, 67, 62]
  const observedReference = {
    review: [82, 73, 56, 46, 37],
    watch: [82, 76, 67, 61, 56],
    'on-track': [82, 77, 74, 69, 65],
  }
  const interpolate = (series: number[]) =>
    Array.from({ length: days }, (_, index) => {
      const position = (index / (days - 1)) * (series.length - 1)
      const lower = Math.floor(position)
      const upper = Math.min(lower + 1, series.length - 1)
      const fraction = position - lower
      return series[lower] * (1 - fraction) + series[upper] * fraction
    })
  const expected = interpolate(expectedReference)
  const observed = interpolate(observedReference[patient.status])
  const x = (index: number) => 63 + index * (432 / (days - 1))
  const y = (value: number) => 20 + (100 - value) * 1.18
  const path = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ')
  const labelIndexes = days === 5 ? [0, 1, 2, 3, 4] : [0, 3, 6, 10, 13]
  const chartLabels = days === 5
    ? ['Discharge', 'Day 1', 'Day 2', 'Day 3', 'Day 4']
    : ['Discharge', 'Day 3', 'Day 7', 'Day 10', 'Day 14']

  return (
    <div className="chart-wrap">
      <svg
        aria-label="Synthetic expected and observed recovery trend over five days"
        className="trajectory-chart"
        role="img"
        viewBox="0 0 520 145"
      >
        {[35, 65, 95, 125].map((lineY) => (
          <line className="chart-grid" key={lineY} x1="48" x2="503" y1={lineY} y2={lineY} />
        ))}
        <text className="chart-label" x="6" y="38">Expected</text>
        <text className="chart-label" x="6" y="68">Trend</text>
        <path className="chart-expected" d={path(expected)} />
        <path
          className={`chart-observed ${patient.status === 'review' ? 'review-line' : ''}`}
          d={path(observed)}
        />
        {expected.map((value, index) => (
          <circle
            className="chart-expected-dot"
            cx={x(index)}
            cy={y(value)}
            key={`expected-${index}`}
            r="3"
          />
        ))}
        {observed.map((value, index) => (
          <circle
            className={`chart-observed-dot ${patient.status === 'review' ? 'review-dot' : ''}`}
            cx={x(index)}
            cy={y(value)}
            key={`observed-${index}`}
            r="3.3"
          />
        ))}
        {chartLabels.map((day, index) => (
          <text className="chart-label" key={day} textAnchor="middle" x={x(labelIndexes[index])} y="142">
            {day}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-line" /> Expected trajectory</span>
        <span className="legend-item"><span className="legend-line observed" /> Observed signals</span>
      </div>
    </div>
  )
}

function App() {
  const [patientId, setPatientId] = useState(patients[0].id)
  const [search, setSearch] = useState('')
  const [activeNav, setActiveNav] = useState('Overview')
  const [chartDays, setChartDays] = useState<5 | 14>(5)
  const [notesByPatient, setNotesByPatient] = useState<Record<string, string[]>>(
    () => Object.fromEntries(patients.map((patient) => [patient.id, [patient.initialMessage]])),
  )
  const [rehabSessionsByPatient, setRehabSessionsByPatient] = useState<Record<string, RehabSession[]>>(
    () => ({ maya: demoRehabSessions }),
  )
  const [questionSent, setQuestionSent] = useState<Record<string, boolean>>({})
  const [queued, setQueued] = useState<Record<string, boolean>>({})
  const [rehabConcern, setRehabConcern] = useState<Record<string, RehabEventLevel>>({})
  const [selectedActions, setSelectedActions] = useState<Record<string, ActionId>>({})
  const [checkin, setCheckin] = useState('')
  const [toast, setToast] = useState('')

  const patient = patients.find((item) => item.id === patientId) ?? patients[0]
  const notes = notesByPatient[patient.id] ?? [patient.initialMessage]
  const rehabSessions = rehabSessionsByPatient[patient.id] ?? []
  const latestNote = notes.at(-1) ?? patient.initialMessage
  const adaptiveQuestion = getAdaptiveQuestion(notes)
  const agentRun = runRecoveryAgents(patient, latestNote, rehabSessions)
  const selectedAction = selectedActions[patient.id] ?? getSuggestedAction(patient)
  const currentRehabConcern = rehabConcern[patient.id]
  const reportRisk = currentRehabConcern === 'urgent'
    ? 'Urgent symptom reported during home rehab'
    : currentRehabConcern === 'review'
      ? 'Breathlessness reported during home rehab'
      : getRiskSummary(patient)
  const visiblePatients = patients.filter((item) =>
    `${item.name} ${item.condition} ${item.statusLabel}`.toLowerCase().includes(search.toLowerCase()),
  )
  const timeline = [
    { title: 'Discharge plan imported', time: `Day 0 · ${patient.condition}`, detail: 'Baseline, medication list, and follow-up plan initialized.' },
    { title: 'Recovery twin updated', time: 'Today · 9:14 AM', detail: 'Recent patient report and available activity / weight signals compared with baseline.' },
    ...notes.map((detail, index) => ({
      title: detail.startsWith('Home cardiac rehab:')
        ? 'Home rehab observation added'
        : 'Patient check-in received',
      time: index === 0 ? 'Today · 9:22 AM' : 'Today · just now',
      detail,
      patient: true,
    })),
    ...(questionSent[patient.id]
      ? [{ title: 'Adaptive question queued', time: 'Today · just now', detail: adaptiveQuestion }]
      : []),
  ]

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  function navigate(label: string, target: string) {
    setActiveNav(label)
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = checkin.trim()
    if (!message) return
    setNotesByPatient((current) => ({
      ...current,
      [patient.id]: [...(current[patient.id] ?? [patient.initialMessage]), message],
    }))
    setCheckin('')
    setQuestionSent((current) => ({ ...current, [patient.id]: false }))
    setToast('Check-in added to the synthetic patient thread. Review remains human-supervised.')
  }

  function handleSendQuestion() {
    setQuestionSent((current) => ({ ...current, [patient.id]: true }))
    setToast('Adaptive question added to the simulated patient thread.')
  }

  function handleQueueReport() {
    setQueued((current) => ({ ...current, [patient.id]: true }))
    setToast('Human-review handoff saved locally. No care-team notification was delivered.')
  }

  function recordRehabObservation(message: string, session: RehabSession, level: RehabEventLevel) {
    setRehabSessionsByPatient((current) => ({
      ...current,
      [patient.id]: [...(current[patient.id] ?? []), session],
    }))
    const observation = `Home cardiac rehab: ${message}`
    setNotesByPatient((current) => ({
      ...current,
      [patient.id]: [...(current[patient.id] ?? [patient.initialMessage]), observation],
    }))
    if (level !== 'routine') {
      setRehabConcern((current) => ({ ...current, [patient.id]: level }))
      setSelectedActions((current) => ({ ...current, [patient.id]: 'nurse' }))
      setToast(
        level === 'urgent'
          ? 'Session stopped. Prepare a local urgent-review handoff; no alert was sent.'
          : 'Session stopped. Prepare a local nurse-review handoff; no alert was sent.',
      )
      return
    }
    setToast('Rehab session note added to the Recovery Twin. Pose metrics were unavailable.')
  }

  const patientSummary = makeNurseHandoff(patient, getActionLabel(selectedAction), agentRun)

  return (
    <div className="app-shell" id="overview">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="heart" size={20} /></div>
          <div>
            <div className="brand-name">CareBridge</div>
            <div className="brand-caption">Sentinel</div>
          </div>
        </div>

        <div className="nav-label">Workspace</div>
        <nav aria-label="Main navigation" className="side-nav">
          {navigation.map((item) => (
            <button
              aria-current={activeNav === item.label ? 'page' : undefined}
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => navigate(item.label, item.target)}
              type="button"
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
              {item.label === 'Care team queue' && <span className="nav-count">{Object.values(queued).filter(Boolean).length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="workspace-card">
            <div className="workspace-avatar">SC</div>
            <div>
              <div className="workspace-name">Sarah Chen</div>
              <div className="workspace-role">Care coordinator</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Care operations</span>
            <Icon name="chevron" size={13} />
            <strong>Recovery overview</strong>
          </div>
          <div className="topbar-actions">
            <span className="date-chip"><Icon name="calendar" size={13} /> Tuesday, Nov 17</span>
            <span className="live-chip"><span className="live-dot" /> Demo data</span>
            <button
              aria-label="View care team queue"
              className="icon-button"
              onClick={() => navigate('Care team queue', 'report')}
              type="button"
            >
              <Icon name="bell" size={16} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>

        <main className="main-content">
          <section aria-labelledby="page-title" className="page-heading">
            <div>
              <div className="eyebrow">Post-discharge monitoring</div>
              <h1 id="page-title">Recovery overview</h1>
              <p className="page-subtitle">See what changed, why it matters, and where a human follow-up may help.</p>
            </div>
            <button
              className="primary-button"
              onClick={() => document.getElementById('checkin-input')?.focus()}
              type="button"
            >
              <Icon name="plus" size={15} /> Record check-in
            </button>
          </section>

          <section aria-label="Care team overview metrics" className="overview-cards">
            <article className="metric-card">
              <div className="metric-top"><span>Patients in demo</span><span className="metric-icon"><Icon name="users" size={14} /></span></div>
              <div className="metric-value">04</div>
              <div className="metric-detail">Synthetic patient journeys</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>Review suggested</span><span className="metric-icon"><Icon name="shield" size={14} /></span></div>
              <div className="metric-value">01</div>
              <div className="metric-detail"><strong>Human review</strong> · not an automated decision</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>Follow-up needed</span><span className="metric-icon"><Icon name="message" size={14} /></span></div>
              <div className="metric-value">02</div>
              <div className="metric-detail">Information gaps to resolve</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>Evidence roles</span><span className="metric-icon"><Icon name="spark" size={14} /></span></div>
              <div className="metric-value">06</div>
              <div className="metric-detail">Specialists · plus verifier &amp; escalation</div>
            </article>
          </section>

          <RehabCoach
            key={patient.id}
            onObservation={recordRehabObservation}
            patient={patient}
            sessions={rehabSessions}
          />

          <div className="workspace-grid">
            <div className="left-column">
              <section aria-labelledby="patients-title" className="panel patients-panel" id="patients">
                <div className="panel-heading">
                  <div>
                    <h2 id="patients-title">Patient recovery queue</h2>
                    <p className="panel-description">Prioritized by change from each person’s discharge baseline</p>
                  </div>
                  <button className="panel-action" onClick={() => setSearch('')} type="button">View all patients</button>
                </div>
                <div className="patients-toolbar">
                  <label className="search-wrap">
                    <Icon name="search" size={14} />
                    <input
                      aria-label="Search patients"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search patients or conditions"
                      value={search}
                    />
                  </label>
                  <button className="filter-button" onClick={() => setSearch('')} type="button">
                    <Icon name="filter" size={13} /> All
                  </button>
                </div>
                <div className="patient-table" role="table" aria-label="Synthetic patient recovery queue">
                  <div className="patient-table-head" role="row">
                    <span role="columnheader">Patient</span>
                    <span role="columnheader">Recovery status</span>
                    <span role="columnheader">Last check-in</span>
                    <span role="columnheader">Day home</span>
                  </div>
                  {visiblePatients.map((item) => (
                    <button
                      aria-pressed={patient.id === item.id}
                      className={`patient-row ${patient.id === item.id ? 'selected' : ''}`}
                      key={item.id}
                      onClick={() => {
                        setPatientId(item.id)
                        setCheckin('')
                      }}
                      role="row"
                      type="button"
                    >
                      <span className="patient-identity" role="cell">
                        <span className="patient-avatar">{item.initials}</span>
                        <span>
                          <span className="patient-name">{item.name}</span>
                          <span className="patient-condition">{item.condition}</span>
                        </span>
                      </span>
                      <span className={`patient-status ${item.status}`} role="cell">{item.statusLabel}</span>
                      <span className="patient-last-seen" role="cell">{item.lastSeen}</span>
                      <span className="patient-last-seen" role="cell">Day {item.daysOut}</span>
                    </button>
                  ))}
                  {visiblePatients.length === 0 && <div className="empty-patients">No matching synthetic patients.</div>}
                </div>
              </section>

              <section aria-labelledby="recovery-title" className="panel recovery-panel" id="recovery">
                <div className="panel-heading">
                  <div className="patient-detail-heading">
                    <span className="patient-avatar">{patient.initials}</span>
                    <div>
                      <h2 id="recovery-title">{patient.name} · Recovery twin</h2>
                      <div className="patient-detail-meta">{patient.age} years · {patient.condition} · Day {patient.daysOut} at home</div>
                    </div>
                  </div>
                  <div className="range-switch" aria-label="Recovery chart time range">
                    <button className={chartDays === 5 ? 'active' : ''} onClick={() => setChartDays(5)} type="button">5 days</button>
                    <button className={chartDays === 14 ? 'active' : ''} onClick={() => setChartDays(14)} type="button">14 days</button>
                  </div>
                </div>
                <div className="trajectory-summary">
                  <div className="trajectory-stat">Trajectory status<strong>{patient.statusLabel}</strong></div>
                  <div className="trajectory-stat">Current stage<strong>Day {patient.daysOut} after discharge</strong></div>
                  <span className="deviation-label"><Icon name="activity" size={13} /> {patient.status === 'review' ? 'Signals diverging' : patient.status === 'watch' ? 'More information needed' : 'Near expected range'}</span>
                </div>
                <TrajectoryChart days={chartDays} patient={patient} />
                <div className="chart-note">Illustrative trend from synthetic demo signals; not a validated clinical score or prediction.</div>
                <div className="signal-grid">
                  <div className="signal-card">
                    <div className="signal-label">Weight</div>
                    <div className="signal-value">{patient.weight}</div>
                    <div className="signal-change">{patient.weightChange}</div>
                  </div>
                  <div className="signal-card">
                    <div className="signal-label">Daily activity</div>
                    <div className="signal-value">{patient.activity}</div>
                    <div className="signal-change">{patient.activityChange}</div>
                  </div>
                  <div className="signal-card">
                    <div className="signal-label">Medication check</div>
                    <div className="signal-value">{patient.medication}</div>
                    <div className="signal-change">{patient.followUp}</div>
                  </div>
                </div>
              </section>

              <section aria-labelledby="timeline-title" className="panel timeline-panel" id="timeline">
                <div className="panel-heading">
                  <div>
                    <h2 id="timeline-title">Recovery timeline</h2>
                    <p className="panel-description">Discharge plan, observations, and follow-up events</p>
                  </div>
                  <span className="decision-badge">{timeline.length} events</span>
                </div>
                <div className="timeline-list">
                  {timeline.slice().reverse().map((event, index) => (
                    <div className="timeline-item" key={`${event.title}-${event.time}-${index}`}>
                      <div className="timeline-rail">
                        <span className={`timeline-dot ${'patient' in event && event.patient ? 'patient-dot' : ''}`} />
                        <span className="timeline-stem" />
                      </div>
                      <div className="timeline-copy">
                        <div className="timeline-title">{event.title}</div>
                        <div className="timeline-time">{event.time}</div>
                        <div className="timeline-detail">{event.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="right-column">
              <section aria-labelledby="agents-title" className="panel agent-panel">
                <div className="panel-heading">
                  <div>
                    <h2 id="agents-title">Multi-agent evidence review</h2>
                    <p className="panel-description">Deterministic local agents · no LLM connected</p>
                  </div>
                  <span className={`verification-badge ${agentRun.verification.status}`}>
                    {agentRun.verification.status === 'evidence-linked'
                      ? 'Evidence linked'
                      : agentRun.verification.status === 'needs-review'
                        ? 'Needs review'
                        : 'Insufficient'}
                  </span>
                </div>
                <div className="agent-list">
                  {agentRun.findings.filter((finding) => finding.id !== 'escalation').map((finding) => {
                    const icon: IconName = finding.id === 'symptom'
                      ? 'message'
                      : finding.id === 'medication'
                        ? 'pill'
                        : finding.id === 'context'
                          ? 'users'
                          : 'activity'
                    const linkedEvidence = finding.evidenceIds
                      .map((id) => agentRun.evidence.find((item) => item.id === id))
                      .filter((item) => item !== undefined)
                    return (
                      <div className="agent-row" key={finding.id}>
                        <span className="agent-icon"><Icon name={icon} size={14} /></span>
                        <div className="agent-copy">
                          <div className="agent-title">
                            {finding.agent}
                            <span className={`agent-status ${finding.status}`}>{finding.status} · {finding.confidence} confidence</span>
                          </div>
                          <div className="agent-description">{finding.summary}</div>
                          <details className="agent-evidence">
                            <summary>{linkedEvidence.length} linked source{linkedEvidence.length === 1 ? '' : 's'}</summary>
                            {linkedEvidence.length ? (
                              <ul>
                                {linkedEvidence.map((item) => (
                                  <li key={`${finding.id}-${item.id}`}>
                                    <strong>{item.source}</strong> · {item.recordedAt} · {item.quality}
                                    <span>{item.detail}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : <p>No evidence is linked to this finding.</p>}
                          </details>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="verifier-box">
                  <div className="verifier-top">
                    <Icon name="shield" size={14} /> Independent verifier
                    <span className="verified-tag">{agentRun.verification.checkedEvidence} links checked</span>
                  </div>
                  <div className="verifier-copy">
                    {agentRun.verification.summary}
                  </div>
                  <ul className="verifier-limitations">
                    {agentRun.verification.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                  </ul>
                </div>
                <div className={`escalation-box ${agentRun.handoffPriority}`}>
                  <div className="escalation-heading">
                    <span>Escalation agent · draft only</span>
                    <span>{agentRun.handoffPriority} priority</span>
                  </div>
                  <p>{agentRun.escalation.summary}</p>
                </div>
              </section>

              <section aria-labelledby="interventions-title" className="panel intervention-panel" id="interventions">
                <div className="panel-heading">
                  <div>
                    <h2 id="interventions-title">Compare next workflows</h2>
                    <p className="panel-description">Counterfactual options for human consideration</p>
                  </div>
                  <span className="decision-badge">No auto-action</span>
                </div>
                <div className="decision-list">
                  {actionOptions.map((option) => {
                    const suggested = getSuggestedAction(patient) === option.id
                    const priority = suggested ? 'Suggested' : option.urgency === 'Routine' ? 'Lower' : option.urgency === 'Today' || option.urgency === 'Prompt' ? 'Consider' : 'Explore'
                    const priorityTone = suggested ? 'high' : option.urgency === 'Routine' ? 'low' : 'medium'
                    return (
                      <button
                        aria-pressed={selectedAction === option.id}
                        className={`decision-option ${selectedAction === option.id ? 'selected' : ''}`}
                        key={option.id}
                        onClick={() => setSelectedActions((current) => ({ ...current, [patient.id]: option.id }))}
                        type="button"
                      >
                        <span className="decision-option-top">
                          <span className="radio-dot" />
                          <span className="decision-name">{option.name}</span>
                          <span className={`decision-priority ${priorityTone}`}>{priority}</span>
                        </span>
                        <span className="decision-description">{option.details}</span>
                        <span className="decision-metrics">
                          <span>Potential: <strong>{option.impact}</strong></span>
                          <span>Timing: <strong>{option.urgency}</strong></span>
                          <span>Burden: <strong>{option.burden}</strong></span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="intervention-footer">
                  <span className="intervention-disclaimer">Workflow comparison only. A clinician decides what happens next.</span>
                  <button
                    className="soft-button"
                    onClick={() => navigate('Recovery twin', 'recovery')}
                    type="button"
                  >
                    View patient context <Icon name="arrow" size={13} />
                  </button>
                </div>
              </section>

              <section aria-labelledby="question-title" className="panel question-panel" id="question">
                <div className="panel-heading">
                  <div>
                    <h2 id="question-title">Adaptive check-in</h2>
                    <p className="panel-description">Ask only what could resolve an open question</p>
                  </div>
                  <span className="decision-badge">Patient-led</span>
                </div>
                <div className="question-body">
                  <div className="question-kicker">Suggested next question</div>
                  <div className="question-text">“{adaptiveQuestion}”</div>
                  <p className="question-help">Selected from the latest reported information; confirm it is appropriate before sending.</p>
                  <button
                    className={`soft-button ${questionSent[patient.id] ? 'button-disabled' : ''}`}
                    disabled={Boolean(questionSent[patient.id])}
                    onClick={handleSendQuestion}
                    type="button"
                  >
                    {questionSent[patient.id] ? <><Icon name="check" size={13} /> Added to thread</> : <><Icon name="message" size={13} /> Add question to thread</>}
                  </button>
                  <form className="checkin-form" onSubmit={handleCheckIn}>
                    <label className="question-kicker" htmlFor="checkin-input">Simulate patient response</label>
                    <textarea
                      id="checkin-input"
                      onChange={(event) => setCheckin(event.target.value)}
                      placeholder="e.g. I have been more tired since yesterday…"
                      value={checkin}
                    />
                    <div className="checkin-actions">
                      <span className="checkin-hint">Synthetic demo only</span>
                      <button className="secondary-button" disabled={!checkin.trim()} type="submit">
                        <Icon name="plus" size={13} /> Add check-in
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              <section aria-labelledby="report-title" className="panel report-panel" id="report">
                <div className="panel-heading">
                  <div>
                    <div className="report-label"><Icon name="clipboard" size={14} /> Clinician-ready summary</div>
                    <p className="panel-description" id="report-title">Evidence, uncertainty, and a suggested workflow</p>
                  </div>
                  <span className="decision-badge">Human review</span>
                </div>
                <div className="report-content">
                  <div className="report-row">
                    <div className="report-key">What changed</div>
                    <div className="report-value">{reportRisk} · Day {patient.daysOut} after discharge.</div>
                  </div>
                  {currentRehabConcern && (
                    <div className={`rehab-report-alert ${currentRehabConcern === 'urgent' ? 'urgent' : ''}`} role="status">
                      {currentRehabConcern === 'urgent'
                        ? 'Urgent symptom report added. Nurse alert is local to this demo and was not delivered.'
                        : 'Breathlessness report added. Nurse review is local to this demo and was not delivered.'}
                    </div>
                  )}
                  <div className="report-row">
                    <div className="report-key">Supporting evidence</div>
                    <div className="handoff-evidence-list">
                      {agentRun.evidence.map((item) => (
                        <div className="handoff-evidence-item" key={item.id}>
                          <span>{item.detail}</span>
                          <small>{item.source} · {item.recordedAt} · {item.quality}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="report-row">
                    <div className="report-key">Verifier &amp; uncertainty</div>
                    <div className="report-value">
                      {agentRun.verification.status} · {agentRun.verification.summary}
                      {' '}Missing: {[...patient.missing, ...agentRun.verification.limitations].join(' · ')}.
                    </div>
                  </div>
                  <div className="report-row">
                    <div className="report-key">Suggested workflow</div>
                    <div className="report-value">{getActionLabel(selectedAction)} · {agentRun.handoffPriority} review priority from local demo rules; human review required, not a clinical triage result.</div>
                  </div>
                </div>
                <div className="report-footer">
                  <span className={`queue-state ${queued[patient.id] ? 'queued' : ''}`}>
                    {queued[patient.id] ? 'Local draft flagged · not delivered' : 'Draft · not sent'}
                  </span>
                  <button
                    className={`primary-button ${queued[patient.id] ? 'button-disabled' : ''}`}
                    disabled={Boolean(queued[patient.id])}
                    onClick={handleQueueReport}
                    type="button"
                  >
                    {queued[patient.id] ? <><Icon name="check" size={13} /> Saved locally</> : <><Icon name="arrow" size={13} /> Save review draft</>}
                  </button>
                </div>
                <details className="report-details">
                  <summary>View full draft report</summary>
                  <pre>{patientSummary}</pre>
                </details>
              </section>

              <div className="safety-note">
                <Icon name="shield" size={14} />
                <span>Fictional demo data only. This prototype is not a medical device and does not diagnose, prescribe, or contact a care team.</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && <div aria-live="polite" className="toast" role="status">{toast}</div>}
    </div>
  )
}

export default App
