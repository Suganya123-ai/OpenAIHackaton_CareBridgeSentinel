# CareBridge Sentinel — Feature Report

## Abstract

CareBridge Sentinel is a hackathon prototype for human-supervised post-discharge recovery coordination. It brings synthetic patient check-ins, rehab-session history, recovery signals, and care-plan context into a patient-specific Recovery Twin. Separate deterministic specialist functions generate source-linked observations, while an independent verifier checks evidence references and preserves uncertainty before an escalation function prepares a local clinician-review draft. The interface also demonstrates adaptive check-in questions and an opt-in, browser-only rehab video and camera preview. MediaPipe pose tracking, repetition counting, realtime voice coaching, clinical-system connections, and delivery of nurse alerts are not implemented. All patient data and example measurements are fictional; the prototype is not a clinical decision system.

## 1. Product overview

CareBridge Sentinel is a front-end hackathon prototype for post-discharge recovery coordination. It brings a synthetic patient profile, check-ins, rehab-session notes, and recovery signals into one workspace so a care-team member can review changes and prepare a human handoff.

The application is a demonstration, not a clinical product. Patient names, measurements, recovery trends, and sample sessions are fictional. The app does not diagnose, prescribe, determine exercise safety, or contact a care team.

## 2. Workspace dashboard

The single-page workspace has sidebar links for Overview, Patients, Recovery Twin, Cardiac Rehab, and Care Team Queue. Selecting a link scrolls to the corresponding section; the sections remain part of the same dashboard.

The overview cards summarize the demonstration queue: synthetic patient count, patients suggested for review, follow-up gaps, and specialist-agent roles. These are sample dashboard values, not live service metrics.

## 3. Patient recovery queue

- Displays four fictional patients with condition, recovery status, last check-in, and days at home.
- Search filters the list by patient name, condition, or status.
- Selecting a patient updates the Recovery Twin, rehab coach, session history, evidence review, and draft handoff to that patient.
- The displayed queue and status values are local demo fixtures; there is no connection to an EHR or patient registry.

## 4. Patient Recovery Twin

The Recovery Twin view combines an illustrative expected-versus-observed trajectory chart with synthetic weight, activity, medication, and follow-up details. The chart can be switched between five- and fourteen-day views. Its values are illustrative and are not produced by a validated prediction model.

The recovery timeline shows the synthetic discharge-plan initialization, recovery updates, patient-entered check-ins, and rehab observations. New check-ins update the local session state and feed the evidence review and adaptive question.

## 5. Home cardiac rehab coach

The Cardiac Rehab section provides:

- **Exercise video preview:** Select a local video file and play it in the browser.
- **Opt-in camera preview:** Confirm that the exercise plan is care-team approved, then request browser camera permission. The preview is not recorded or uploaded by this prototype.
- **Session controls:** Start, stop the camera, or end and log a session. Session duration is recorded when available.
- **Symptom reporting:** Patient-operated buttons for increased breathlessness, chest pain, or dizziness stop an active session and add a session record and observation to the selected patient’s Recovery Twin.
- **Session history:** Lists patient-specific completed or stopped sessions, source, timestamp, duration when available, and pose-measurement state.
- **Data-quality states:** The demo includes synthetic and uncertain example records. Uncertain or unavailable pose data does not become a zero rep count or an inferred mobility decline.

Symptom reports and nurse-review drafts are local demo events only. No nurse or emergency service is contacted. Follow the care team’s instructions for real symptoms.

## 6. Local multi-agent evidence workflow

The app runs separate deterministic functions for six specialist roles:

1. **Symptom agent** checks the latest patient report for a small set of symptom phrases.
2. **Recovery agent** summarizes available session history and avoids claiming a movement trend from uncertain or synthetic pose observations.
3. **Mobility agent** reports measured, uncertain, or unavailable pose status.
4. **Medication agent** reflects whether the synthetic medication status is clear or unresolved.
5. **Context agent** surfaces missing information and the planned follow-up.
6. **Intervention agent** suggests a workflow for human consideration, such as a question or nurse follow-up.

Each finding has a qualitative status, priority, confidence label, and evidence references. Expanding its source list shows the source, timestamp, data-quality label, and evidence detail.

An independent **evidence verifier** checks that findings link to existing evidence and performs simple consistency checks for selected symptom and mobility claims. It preserves limitations such as unavailable pose data, synthetic fixtures, missing information, and uncalibrated confidence. The **escalation agent** uses those findings to prepare a local review draft; it does not send an alert.

These are real, separately invoked local functions in an orchestrated workflow, but they are **not LLM agents**. There is no model API call, autonomous agent messaging, external tool use, or learned clinical reasoning.

## 7. Adaptive patient check-in

The check-in panel selects a suggested follow-up question using simple rules over the latest report. For example, reports mentioning breathlessness, swelling, medication access, or fatigue lead to different questions. A user can add the suggested question to the simulated thread or enter a synthetic patient response.

This is a deterministic demo interaction, not a language model conversation, and its suggested questions are not clinical instructions.

## 8. Workflow comparison and clinician handoff

The Care Team Queue includes selectable workflow options—continue monitoring, ask a focused question, nurse follow-up, or earlier clinician review—with illustrative potential, timing, and burden labels. These options are not outcome predictions; a clinician remains responsible for decisions.

The draft handoff brings together the patient’s latest report, source-linked evidence, verifier status, uncertainty and missing information, selected workflow, and local review priority. Users can save the draft locally. It is not delivered to a nurse, EHR, or external system.

## 9. Safety, privacy, and implementation boundaries

- All included patients, measurements, and example rehab sessions are synthetic.
- Camera access is opt-in. Video remains in the browser and is not recorded or uploaded by this prototype.
- MediaPipe pose tracking, repetition counting, speech analysis, form correction, GPT Realtime voice coaching, wearable integrations, EHR ingestion, authentication, and actual nurse notifications are not connected.
- Session and interaction state is held in the running front end; there is no backend persistence.
- Symptom matching and confidence labels are simple demo rules, not validated clinical logic.
- The app is not real-time monitoring and must not be used to assess exercise safety or replace care-team guidance.

## 10. Run and verify

From the project directory:

```bash
npm install
npm run dev
```

The project also provides:

```bash
npm test
npm run lint
npm run build
```

The automated tests cover adaptive questions, agent evidence links, contradictory or unsupported findings, uncertainty handling, and handoff content.
