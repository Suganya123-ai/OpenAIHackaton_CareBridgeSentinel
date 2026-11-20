# CareBridge Sentinel

A hackathon prototype for an evidence-aware, human-supervised post-discharge recovery workspace.

## Run locally

```bash
npm install
npm run dev
```

Run the focused checks with `npm test` and `npm run lint`; create a production build with `npm run build`.

## Demo workflow

- Select a fictional patient to inspect their recovery twin and recent observations.
- Compare the synthetic expected and observed recovery trajectories.
- Enter a patient-reported check-in to update the simulated thread and adapt the next question.
- Open Cardiac rehab to preview a care-team video, request a local camera preview, and log a session or symptom report to the selected patient’s Recovery Twin.
- Inspect patient-specific rehab session history, including provenance and explicit uncertain/unavailable pose states.
- Follow the local multi-agent workflow: symptom, recovery, mobility, medication, context, and intervention specialists produce source-linked findings; an independent verifier checks the links and preserves uncertainty before an escalation agent prepares a nurse-review draft.
- Compare permitted workflow options, inspect the evidence-linked handoff, then save the local draft for human review.

All patients, measurements, and workflow assessments are synthetic demo data. Specialist roles and the verifier execute as separate deterministic local functions; they are not LLM agents and do not call an external model. Rehab camera footage stays in the browser. Pose tracking, repetition counting, GPT Realtime voice coaching, clinical-system integrations, and delivery of nurse alerts are not connected; local symptom buttons are not real-time monitoring. This prototype does not diagnose, prescribe, or make care decisions.
