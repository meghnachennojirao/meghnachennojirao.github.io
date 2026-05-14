# EEG Lab Design Plan

## Product Intent

EEG Lab should feel like a quiet guided reading room for EEG interpretation. The user is not dropped into a dense clinical workstation. Each screen teaches one observation, asks for one judgment, then reveals why that judgment matters.

The first implementation should be mobile-first, calm, and minimal: centered text, one primary action, a single EEG trace or case note at a time, and generous negative space. Desktop can add room around the same lesson flow, but it should not become a dashboard.

This is educational practice material, not a diagnostic tool. Real patient-derived material must remain de-identified, attributed, and clearly marked as open-access or access-controlled.

## Design Principles

1. One clinical idea per screen.
2. Text sits in the center; data appears only when the learner needs it.
3. The EEG trace is a teaching object, not decoration.
4. Errors are taught gently: first ask, then reveal the trap.
5. Light mode uses white space as the main visual material.
6. Dark mode should feel like a dim reading room, not a high-contrast terminal.
7. Long clinical text is progressively disclosed.
8. Every exercise ends with a concise interpretation sentence.

## Visual Direction

Name: Quiet Signal

Mood: sparse, clinical, humane, slow.

Light mode:
- Background: near white.
- Text: soft black, not pure black.
- Accent: muted teal or restrained blue-green for signal, progress, and selected states.
- Supporting color: warm gray for report cards and annotations.

Dark mode:
- Background: deep charcoal, not pure black.
- Text: warm off-white.
- Accent: pale teal.
- Report surfaces: slightly raised charcoal with thin borders.

Typography:
- Display: keep the existing `Newsreader` voice for calm lesson titles.
- Body/UI: keep `Nunito Sans` for readable controls.
- Use small labels sparingly; avoid clinical dashboards full of pills.

Shape:
- Prefer unframed full-screen sections.
- Use cards only for a single repeated object: one report excerpt, one EEG trace, one answer group.
- Keep radius modest. No nested cards.

## Mobile Screen Model

### 1. Welcome

Purpose: set tempo, not explain everything.

Content:
- Small label: `EEG Lab`
- Large title: `Read one signal at a time.`
- One-sentence promise.
- One button: `Begin`
- Optional tiny progress hint below the fold.

Avoid:
- Long dataset explanations.
- Multiple feature buttons.
- Large hero illustrations.

### 2. Stage Intro

Purpose: prepare the learner for a cluster of related judgments.

Content:
- `Stage 2 of 6`
- Stage title.
- One short paragraph.
- `Start`

Design:
- Centered, vertically spacious.
- No trace yet.

### 3. Exercise Prompt

Purpose: isolate the observation.

Content order:
- Exercise count.
- Short title.
- One guiding sentence.
- One primary prompt.
- One action: answer, tap channel, or reveal.

The trace/report should initially be small or partially hidden if the concept can be introduced before the data. This keeps cognitive load low.

### 4. Evidence View

Purpose: let the learner inspect a real or simulated snippet.

Content:
- EEG trace, report excerpt, or both.
- Minimal controls: montage, sensitivity, time window.
- One annotation marker at a time.

Interaction:
- Tap a channel.
- Choose between two interpretations.
- Reveal expert note.

### 5. Interpretation Reveal

Purpose: explain the decision, not dump facts.

Content:
- `Finding`
- One-sentence answer.
- `Why`
- Two to three bullets.
- `Common mistake`
- One corrective line.

### 6. Mixed Case

Purpose: synthesize source material and report language.

Content:
- Referral question.
- Short de-identified report excerpt.
- EEG snippet.
- Learner drafts/selects an impression.
- Expert interpretation appears after answer.

## Information Architecture

The app should have four internal layers:

1. Course flow: 30 exercises grouped into six stages.
2. Case material: source metadata, report excerpt, annotations, attribution.
3. Signal view: simulated or imported EEG snippets.
4. Reflection layer: learner answer, feedback, common error, final interpretation.

Only the current layer should be visible on mobile. Other layers can be behind `Report`, `Trace`, and `Why` tabs.

## 30-Part Exercise Arc

### Stage 1: Orientation

1. Reading posture: age, state, montage, question.
2. 10-20 electrode names and laterality.
3. Referential versus bipolar montage.
4. Sensitivity, filters, calibration.
5. Normal awake adult background.

### Stage 2: State and Normality

6. Eyes open versus eyes closed alpha.
7. Drowsiness and vertex waves.
8. Stage 2 sleep: spindles and K-complexes.
9. Pediatric normal EEG.
10. Normal variation versus pathology.

### Stage 3: Artifacts

11. Eye blink and eye movement.
12. Muscle artifact.
13. Cardiac artifact.
14. Electrode pop and 50/60 Hz line noise.
15. Sweat and slow baseline artifact.

### Stage 4: Benign Patterns and Over-Reads

16. Wicket waves.
17. Rhythmic mid-temporal theta of drowsiness.
18. Small sharp spikes.
19. 14 and 6 Hz positive spikes.
20. SREDA and non-evolving rhythmic patterns.

### Stage 5: Pathology

21. Spike and sharp-wave criteria.
22. Focal interictal epileptiform discharges.
23. Generalized spike-wave.
24. Focal slowing.
25. Periodic discharges.

### Stage 6: Seizures and Reports

26. What makes activity ictal: evolution.
27. Temporal lobe seizure.
28. Generalized tonic-clonic seizure.
29. NCSE versus encephalopathy.
30. Final mixed case: report, trace, interpretation, common error.

## Exercise Template

Each exercise should use the same compact shape:

```json
{
  "id": 1,
  "stage": "Orientation",
  "title": "Start with the state",
  "prompt": "What should you check before interpreting the waveform?",
  "material": {
    "type": "report-excerpt | eeg-snippet | simulated-trace",
    "source": "source id",
    "license": "license/access note"
  },
  "task": {
    "type": "binary | tap-channel | choose-impression | reveal",
    "answer": "expected answer"
  },
  "feedback": {
    "finding": "one sentence",
    "why": ["point 1", "point 2"],
    "commonError": "one sentence"
  }
}
```

## Report Practice Model

Reports should be used in small excerpts:

1. Referral question.
2. State of patient.
3. Relevant technical detail.
4. One result paragraph.
5. One impression.

For early exercises, show only one line. For later exercises, reveal the report in steps: `Referral`, `Description`, `Impression`, `Clinical trap`.

## Implementation Notes

The current `Research/EEG-lab` prototype already has a good course shell: welcome screen, stage intros, 30 exercises, light/dark mode, and a live canvas simulation. The next implementation pass should not add more visible density. It should:

1. Rewrite the first screen around the `Quiet Signal` direction.
2. Move key points and credits behind progressive disclosure on mobile.
3. Add a case/report data model before importing raw reports.
4. Add source attribution to every real-data exercise.
5. Keep the sandbox as an optional side path, not the main course UI.

