(function (global) {
  'use strict';

  var C = {
    Fp1: 0, Fp2: 1, F3: 2, F4: 3, C3: 4, C4: 5, T3: 6, T4: 7, O1: 8, O2: 9
  };

  function multi(preset, channels, highlight) {
    return {
      kind: 'eeg-multi',
      preset: preset,
      config: {
        channels: channels.map(function (name) { return C[name]; }),
        highlight: (highlight || []).map(function (name) { return C[name]; })
      }
    };
  }

  function single(preset, channel, label) {
    return {
      kind: 'eeg-single',
      preset: preset,
      config: { channel: C[channel], label: label || channel }
    };
  }

  function compare(a, b, labelA, labelB) {
    return {
      kind: 'compare-panel',
      preset: a,
      presetB: b,
      config: { labelA: labelA, labelB: labelB }
    };
  }

  var LESSONS = {
    1: {
      shortTitle: 'Electrodes',
      guide: 'Location comes first.',
      question: 'O2 sits on which side?',
      optionLabels: ['Left', 'Right'],
      visual: { kind: 'head-diagram', config: { targets: ['O2'] } },
      verdict: 'Right side',
      subtitle: 'Even numbers sit on the right.',
      why: 'O means occipital. The number 2 means right hemisphere.',
      mistake: 'Do not interpret a waveform before locating the electrode.'
    },
    2: {
      shortTitle: 'Montage',
      guide: 'Wiring changes the picture.',
      question: 'A phase reversal marks what?',
      optionLabels: ['Bad lead', 'Local maximum'],
      visual: compare('focal_spike', 'focal_spike', 'Referential', 'Bipolar'),
      verdict: 'Local maximum',
      subtitle: 'The reversal points toward the source.',
      why: 'In bipolar montage, adjacent channels point away from the electrode closest to the discharge.',
      mistake: 'A montage is not neutral; always check how the channels are linked.'
    },
    3: {
      shortTitle: 'Alpha',
      guide: 'Find the posterior rhythm.',
      question: 'Tap strongest alpha.',
      visual: multi('normal_awake', ['Fp1', 'Fp2', 'F3', 'F4', 'O1', 'O2'], ['O1', 'O2']),
      verdict: 'Occipital alpha',
      subtitle: 'The dominant rhythm is posterior.',
      why: 'In a relaxed awake adult, alpha is strongest at O1 and O2.',
      mistake: 'Frontal low-amplitude beta should not be mistaken for the dominant rhythm.'
    },
    4: {
      shortTitle: 'Normal awake',
      guide: 'Normal has architecture.',
      question: 'Tap the dominant rhythm.',
      visual: multi('normal_awake', ['F3', 'F4', 'C3', 'C4', 'O1', 'O2'], ['O1', 'O2']),
      verdict: 'Posterior dominant rhythm',
      subtitle: 'Symmetric, reactive, posterior.',
      why: 'A normal awake adult EEG has an organized 8-13 Hz posterior rhythm.',
      mistake: 'Do not call a normal anterior beta pattern abnormal.'
    },
    5: {
      shortTitle: 'Drowsy',
      guide: 'State changes the signal.',
      visual: single('drowsy', 'C3', 'vertex'),
      verdict: 'Stage 1 feature',
      subtitle: 'Vertex waves are normal in drowsiness.',
      why: 'They are central, brief, and state-dependent without evolving activity.',
      mistake: 'A vertex wave is sharp, but it is not an epileptiform spike.'
    },
    6: {
      shortTitle: 'Stage 2',
      guide: 'Sleep has signatures.',
      visual: single('sleep_2', 'C3', 'spindle'),
      verdict: 'Stage 2 sleep',
      subtitle: 'Spindles and K-complexes define it.',
      why: 'A waxing-waning fast burst around the vertex is a sleep spindle.',
      mistake: 'Asymmetric absence of spindles matters more than a normal spindle itself.'
    },
    7: {
      shortTitle: 'Filters',
      guide: 'Settings shape what you see.',
      question: 'LFF at 5 Hz removes what?',
      optionLabels: ['Fast', 'Slow'],
      visual: compare('normal_awake', 'diffuse_slowing', 'Before', 'After'),
      verdict: 'Slow activity',
      subtitle: 'Low-frequency filters cut slow waves.',
      why: 'A 5 Hz low-frequency filter removes delta and most theta.',
      mistake: 'Never interpret absent delta before checking filter settings.'
    },
    8: {
      shortTitle: 'Pediatric',
      guide: 'Age changes normal.',
      question: 'Age 3 with 7 Hz PDR?',
      optionLabels: ['Abnormal', 'Normal'],
      visual: multi('normal_pediatric', ['F3', 'F4', 'C3', 'C4', 'O1', 'O2'], ['O1', 'O2']),
      verdict: 'Normal for age',
      subtitle: 'The PDR matures over childhood.',
      why: 'A slower posterior rhythm can be normal in a young child.',
      mistake: 'Adult thresholds should not be applied to pediatric EEG.'
    },
    9: {
      shortTitle: 'Wickets',
      guide: 'Benign can look sharp.',
      question: 'Tap the temporal run.',
      visual: multi('wicket', ['T3', 'T4', 'F3', 'F4', 'O1', 'O2'], ['T3', 'T4']),
      verdict: 'Wicket waves',
      subtitle: 'Temporal runs without after-going slow wave.',
      why: 'Wickets are monophasic, arciform, and occur in drowsiness.',
      mistake: 'This is one of the most common false epilepsy diagnoses.'
    },
    10: {
      shortTitle: 'Positive spikes',
      guide: 'Polarity matters.',
      question: 'Why does polarity help?',
      optionLabels: ['Irrelevant', 'Not typical IED'],
      visual: { kind: 'frequency-scope', config: { highlightBand: 3 } },
      verdict: 'Benign clue',
      subtitle: 'Most epileptiform discharges are surface-negative.',
      why: 'Surface-positive temporal bursts in the right state argue against epileptiform activity.',
      mistake: 'Do not report every sharp-looking burst as epilepsy.'
    },
    11: {
      shortTitle: 'RMTD',
      guide: 'No evolution, no seizure.',
      visual: multi('drowsy', ['T3', 'T4', 'C3', 'C4', 'O1', 'O2'], ['T3', 'T4']),
      verdict: 'Non-evolving rhythm',
      subtitle: 'The field and frequency stay fixed.',
      why: 'Temporal seizures evolve. RMTD appears and stops without spread.',
      mistake: 'A rhythmic temporal pattern is not automatically ictal.'
    },
    12: {
      shortTitle: 'Small sharp',
      guide: 'Tiny and sleep-bound.',
      question: 'Brief NREM transient?',
      optionLabels: ['Spike', 'Benign'],
      visual: single('sleep_2', 'T3', 'NREM'),
      verdict: 'Benign sleep spike',
      subtitle: 'Small, brief, and state-limited.',
      why: 'Small sharp spikes are low amplitude and lack an after-going slow wave.',
      mistake: 'Size, duration, and state are part of the diagnosis.'
    },
    13: {
      shortTitle: 'SREDA',
      guide: 'Context prevents overtreatment.',
      question: 'Awake, asymptomatic, no slowing?',
      optionLabels: ['Treat', 'Benign'],
      visual: compare('drowsy', 'temporal_seizure', 'No evolution', 'Evolution'),
      verdict: 'Benign variant',
      subtitle: 'No symptoms and no post-ictal slowing.',
      why: 'SREDA is sustained rhythmic activity without clinical change.',
      mistake: 'Treating SREDA as NCSE exposes patients to unnecessary medication.'
    },
    14: {
      shortTitle: 'Eye blink',
      guide: 'The eyes are generators.',
      question: 'Where is it largest?',
      optionLabels: ['Front', 'Back'],
      visual: multi('eye_blink', ['Fp1', 'Fp2', 'O1', 'O2'], ['Fp1', 'Fp2']),
      verdict: 'Frontal artifact',
      subtitle: 'Blinks peak at Fp1 and Fp2.',
      why: 'The corneoretinal dipole projects most strongly to the frontal poles.',
      mistake: 'Blinks can look sharp; their field gives them away.'
    },
    15: {
      shortTitle: 'Muscle',
      guide: 'Fast noise is often jaw.',
      question: 'Tap the noisy muscle lead.',
      visual: multi('muscle', ['F3', 'F4', 'T3', 'T4', 'O1', 'O2'], ['T3', 'T4']),
      verdict: 'Temporal EMG',
      subtitle: 'Temporalis muscle contaminates T3/T4.',
      why: 'Muscle artifact is irregular, fast, and strongest over lateral leads.',
      mistake: 'Fast activity from jaw tension is not fast ictal activity.'
    },
    16: {
      shortTitle: 'Cardiac',
      guide: 'Regular means not cortical.',
      question: 'Tap the QRS-locked artifact.',
      visual: multi('cardiac', ['C3', 'C4', 'T3', 'T4', 'O1', 'O2'], ['T3', 'T4']),
      verdict: 'Cardiac artifact',
      subtitle: 'A perfectly regular interval is the clue.',
      why: 'Cardiac artifact repeats with the heart rhythm and often appears temporally.',
      mistake: 'Epileptiform discharges are not mechanically regular.'
    },
    17: {
      shortTitle: 'Slow artifact',
      guide: 'Too slow is suspicious.',
      question: 'Diffuse <0.5 Hz drift?',
      optionLabels: ['Delta', 'Sweat'],
      visual: { kind: 'frequency-scope', config: { highlightBand: 0 } },
      verdict: 'Sweat artifact',
      subtitle: 'It is slower than cerebral delta.',
      why: 'Sweat causes broad baseline drift and resolves with skin/environment changes.',
      mistake: 'Do not label ultra-slow diffuse drift as encephalopathy.'
    },
    18: {
      shortTitle: 'Single channel',
      guide: 'No field, no brain.',
      question: 'Only F8 spikes?',
      optionLabels: ['IED', 'Electrode'],
      visual: { kind: 'head-diagram', config: { targets: ['F8'] } },
      verdict: 'Electrode artifact',
      subtitle: 'A true discharge spreads to neighbours.',
      why: 'Single-channel transients without a field are technical until proven otherwise.',
      mistake: 'Do not localize pathology from one isolated electrode pop.'
    },
    19: {
      shortTitle: 'Spike criteria',
      guide: 'Sharp is not enough.',
      visual: single('focal_spike', 'T3', 'after-wave'),
      verdict: 'Spike-wave complex',
      subtitle: 'The slow wave matters.',
      why: 'A spike should disrupt background and be followed by an after-going slow wave.',
      mistake: 'Pointed morphology alone is not epileptiform.'
    },
    20: {
      shortTitle: 'Focal IED',
      guide: 'Find the center.',
      question: 'Tap the phase reversal.',
      visual: multi('focal_spike', ['F3', 'C3', 'T3', 'O1', 'F4', 'T4'], ['T3']),
      verdict: 'Left temporal IED',
      subtitle: 'T3 is the discharge maximum.',
      why: 'The field is strongest over the left temporal region.',
      mistake: 'Always report lateralization and localization, not just presence.'
    },
    21: {
      shortTitle: '3 Hz',
      guide: 'Both hemispheres together.',
      visual: multi('generalized_sw', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['Fp1', 'Fp2', 'F3', 'F4']),
      verdict: 'Generalized spike-wave',
      subtitle: 'Bilateral, synchronous, frontal-predominant.',
      why: 'The burst starts and stops abruptly across both hemispheres.',
      mistake: 'Generalized does not mean diffuse slowing.'
    },
    22: {
      shortTitle: 'Focal slowing',
      guide: 'Slow waves localize dysfunction.',
      question: 'Tap the slow side.',
      visual: multi('focal_delta', ['F3', 'C3', 'T3', 'O1', 'F4', 'C4'], ['F3', 'C3', 'T3']),
      verdict: 'Left focal slowing',
      subtitle: 'Unilateral delta suggests structural dysfunction.',
      why: 'Persistent polymorphic delta over one region should prompt correlation with imaging.',
      mistake: 'Do not call focal slowing a generalized encephalopathy.'
    },
    23: {
      shortTitle: 'LPDs',
      guide: 'Periodic means risk.',
      question: 'Tap the active hemisphere.',
      visual: multi('lpd', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'T3', 'T4'], ['Fp2', 'F4', 'C4', 'T4']),
      verdict: 'Right LPDs',
      subtitle: 'Lateralized periodic discharges carry seizure risk.',
      why: 'Regular sharp-slow complexes over one hemisphere sit on the ictal-interictal continuum.',
      mistake: 'Do not treat periodicity as benign repetition.'
    },
    24: {
      shortTitle: 'Ictal',
      guide: 'Evolution is the hallmark.',
      visual: single('temporal_seizure', 'T3', 'evolving'),
      verdict: 'Seizure evolution',
      subtitle: 'Frequency, amplitude, and field change over time.',
      why: 'A seizure builds, spreads, and then slows or suppresses.',
      mistake: 'A rhythmic pattern without evolution is not enough.'
    },
    25: {
      shortTitle: 'Temporal seizure',
      guide: 'Find the onset.',
      question: 'Tap the onset channel.',
      visual: multi('temporal_seizure', ['F3', 'C3', 'T3', 'O1', 'F4', 'T4'], ['T3']),
      verdict: 'Left temporal onset',
      subtitle: 'The seizure begins at T3.',
      why: 'The rhythmic activity begins focally, then spreads ipsilaterally and beyond.',
      mistake: 'Do not localize from the largest late spread.'
    },
    26: {
      shortTitle: 'GTC',
      guide: 'The trace has phases.',
      visual: multi('gtc_seizure', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['Fp1', 'Fp2', 'F3', 'F4']),
      verdict: 'Convulsive seizure pattern',
      subtitle: 'Fast tonic activity, clonic slowing, suppression.',
      why: 'Post-ictal suppression strongly supports a true generalized tonic-clonic seizure.',
      mistake: 'PNES does not produce true post-ictal EEG suppression.'
    },
    27: {
      shortTitle: 'NCSE',
      guide: 'Altered patient, active EEG.',
      question: 'Unresponsive with continuous spike-wave?',
      optionLabels: ['Observe', 'Treat'],
      visual: multi('generalized_sw', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['F3', 'F4']),
      verdict: 'Treat urgently',
      subtitle: 'This is status until proven otherwise.',
      why: 'NCSE is an emergency when epileptiform activity persists with impaired consciousness.',
      mistake: 'Waiting can prolong neuronal injury.'
    },
    28: {
      shortTitle: 'Triphasic',
      guide: 'Metabolic patterns can mimic seizures.',
      question: 'Where are waves strongest?',
      visual: multi('triphasic', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['Fp1', 'Fp2', 'F3', 'F4']),
      verdict: 'Frontal predominance',
      subtitle: 'Triphasic waves lead frontally.',
      why: 'Clinical context and anterior-posterior lag help separate encephalopathy from NCSE.',
      mistake: 'Do not read triphasic waves without metabolic context.'
    },
    29: {
      shortTitle: 'Over-read',
      guide: 'Name the trap.',
      question: 'Temporal run, no slow wave?',
      optionLabels: ['IED', 'Wicket'],
      visual: multi('wicket', ['T3', 'T4', 'F3', 'F4', 'O1', 'O2'], ['T3', 'T4']),
      verdict: 'Wicket waves',
      subtitle: 'Benign variant, not epilepsy.',
      why: 'Runs, temporal location, drowsiness, and no after-wave point away from IED.',
      mistake: 'Over-reading wickets can create a false epilepsy diagnosis.'
    },
    30: {
      shortTitle: 'Clinical context',
      guide: 'The waveform needs a patient.',
      question: 'Choose the best impression.',
      optionLabels: ['Absence', 'NCSE'],
      visual: {
        kind: 'report',
        report: {
          tabs: ['Referral', 'Report', 'Impression'],
          rows: [
            ['Referral', 'Acute confusion after convulsion.'],
            ['EEG', '3 Hz generalized spike-wave.'],
            ['State', 'Awake but not responsive.'],
            ['Context', 'Adult patient.']
          ]
        }
      },
      verdict: 'NCSE until proven otherwise',
      subtitle: 'Same waveform, different diagnosis.',
      why: '3 Hz spike-wave in a confused adult after convulsion is an emergency pattern.',
      mistake: 'Do not apply a childhood absence label without clinical context.'
    }
  };

  var EXPLAINS = {
    1: ['Every line has an address.', 'An electrode is a listening spot. Its name tells you where it sits.'],
    2: ['The same signal can be rewired.', 'A montage is the camera angle for EEG. Change the angle, and the picture changes.'],
    3: ['First ask: fast or slow?', 'Before naming a pattern, notice how quickly it repeats. Speed is the first clue.'],
    4: ['Normal has a shape.', 'Awake adult EEG often settles into a steady rhythm at the back of the head.'],
    5: ['Sleep begins quietly.', 'Drowsiness changes the background before the patient looks fully asleep.'],
    6: ['Stage 2 leaves fingerprints.', 'Some sleep patterns are normal marks, not warning signs.'],
    7: ['The machine can hide signal.', 'Filter settings can remove the very waves you are trying to see.'],
    8: ['Children are different.', 'A slower rhythm can be normal when the brain is still maturing.'],
    9: ['Sharp is not always dangerous.', 'Some benign patterns look pointed. The after-wave decides a lot.'],
    10: ['Direction matters.', 'EEG waves have polarity. Some scary shapes point the wrong way for epilepsy.'],
    11: ['A seizure changes.', 'A pattern that does not build, speed up, slow down, or spread is less suspicious.'],
    12: ['Tiny details matter.', 'Small, brief, sleep-only sharps often do not mean disease.'],
    13: ['The patient changes the answer.', 'A calm awake patient and an unresponsive patient can make the same rhythm mean different things.'],
    14: ['Eyes write on EEG.', 'Blinks are strongest in front because the eyes sit in front.'],
    15: ['Muscle writes fast noise.', 'Jaw and temple muscles can cover the brain signal with rough fast activity.'],
    16: ['The heart repeats.', 'A perfect rhythm often comes from the heart, not the cortex.'],
    17: ['Skin can drift.', 'Sweat moves the baseline slowly, like the page itself is sliding.'],
    18: ['Brain signals spread.', 'A real brain event usually reaches neighboring electrodes. One lonely channel is suspicious.'],
    19: ['A spike has a tail.', 'The slow wave after a spike is part of the clue. A point alone is not enough.'],
    20: ['Find the center.', 'The strongest part of a discharge helps you locate where it came from.'],
    21: ['Together is different.', 'Generalized activity starts on both sides together, not one side first.'],
    22: ['Slow in one place matters.', 'A slow rhythm in one region points to that region being under stress.'],
    23: ['Repeating sharp waves raise risk.', 'Periodic discharges sit close to the border between irritation and seizure.'],
    24: ['Evolution is the story.', 'A seizure is not just a rhythm. It changes over time.'],
    25: ['Onset comes before spread.', 'The biggest late signal may not be where the seizure began.'],
    26: ['Convulsions have phases.', 'A generalized tonic-clonic seizure moves through a sequence, then quiets down.'],
    27: ['The body can be quiet.', 'Seizure activity can continue even without large movements.'],
    28: ['Illness can imitate seizure.', 'Metabolic brain stress can create patterns that look urgent. Context matters.'],
    29: ['Mistakes have patterns.', 'Most over-reads happen when one rule is forgotten.'],
    30: ['A report answers a question.', 'The final impression should fit the patient, not just the waveform.']
  };

  Object.keys(EXPLAINS).forEach(function (id) {
    if (!LESSONS[id]) return;
    LESSONS[id].explain = {
      title: EXPLAINS[id][0],
      copy: EXPLAINS[id][1]
    };
  });

  var BEGINNER = {
    1: {
      notice: 'The letter says the head region. The number says the side.',
      terms: [['Electrode', 'a small sensor spot on the scalp'], ['O2', 'right-back sensor']],
      question: 'O2 sits on which side?',
      optionLabels: ['Left side', 'Right side'],
      verdict: 'Right side'
    },
    2: {
      notice: 'Two views show the same event. In the second view, the lines flip around the strongest spot.',
      terms: [['Montage', 'a way of wiring the sensors together'], ['Bipolar', 'compare one sensor with the next']],
      question: 'When the lines flip, what does it point to?',
      optionLabels: ['Loose wire', 'Strongest spot'],
      verdict: 'Strongest spot',
      subtitle: 'The flip points toward the source.'
    },
    3: {
      notice: 'Look for the steady rhythm that repeats about ten times each second near the back of the head.',
      terms: [['Alpha', 'a relaxed awake rhythm'], ['Occipital', 'the back of the head']],
      question: 'Tap where the steady back rhythm is strongest.'
    },
    4: {
      notice: 'A normal awake trace has a steady back rhythm and quieter front activity.',
      terms: [['PDR', 'the main relaxed rhythm at the back of the head']],
      question: 'Tap the main back rhythm.'
    },
    5: {
      notice: 'As someone gets drowsy, the background slows and a brief central sharp wave can appear.',
      terms: [['Vertex', 'the top-center of the head'], ['Drowsy', 'halfway between awake and sleep']],
      question: 'Watch the central wave, then reveal what it means.'
    },
    6: {
      notice: 'Stage 2 sleep has recognizable normal marks: short fast bursts and larger slow waves.',
      terms: [['Spindle', 'a short fast burst during sleep'], ['K-complex', 'a large normal sleep wave']],
      question: 'Watch the sleep marks, then reveal what they mean.'
    },
    7: {
      notice: 'A filter is like a sieve. If set too high, it removes slow waves before you can judge them.',
      terms: [['Filter', 'a machine setting that hides part of the signal']],
      question: 'If the setting removes waves below 5 Hz, what disappears?',
      optionLabels: ['Fast waves', 'Slow waves'],
      verdict: 'Slow waves'
    },
    8: {
      notice: 'Children normally have slower and bigger rhythms than adults.',
      terms: [['Age normal', 'normal changes with age']],
      question: 'A 3-year-old has a 7 Hz back rhythm. Is that okay?',
      optionLabels: ['Too slow', 'Okay for age'],
      verdict: 'Okay for age'
    },
    9: {
      notice: 'A benign sharp-looking run often lacks the slow wave that follows a true spike.',
      terms: [['Wicket', 'a benign temporal pattern'], ['After-wave', 'the slow tail after a true spike']],
      question: 'Tap the harmless temporal run.',
      verdict: 'Wicket waves'
    },
    10: {
      notice: 'Some waves point in a direction that makes epilepsy less likely.',
      terms: [['Polarity', 'which direction the wave points']],
      question: 'Why is a positive sharp burst less suspicious?',
      optionLabels: ['Direction does not matter', 'It points the wrong way for epilepsy'],
      verdict: 'Benign clue'
    },
    11: {
      notice: 'A seizure usually changes. A harmless rhythm often starts and stops without changing.',
      terms: [['Evolution', 'change in speed, size, or spread']],
      question: 'Watch for change over time, then reveal.'
    },
    12: {
      notice: 'Very small, very brief sharp waves during sleep can be normal.',
      terms: [['Transient', 'a quick one-time wave'], ['NREM', 'non-dream sleep']],
      question: 'A tiny sleep-only sharp wave is most likely:',
      optionLabels: ['Dangerous spike', 'Benign sleep wave'],
      verdict: 'Benign sleep wave'
    },
    13: {
      notice: 'If the patient is awake and unchanged, a rhythmic pattern may be harmless.',
      terms: [['Clinical correlate', 'a matching symptom in the patient']],
      question: 'Awake, no symptoms, no slowing after. What is safer?',
      optionLabels: ['Treat as emergency', 'Call benign pattern'],
      verdict: 'Benign pattern'
    },
    14: {
      notice: 'Blinks are largest at the front because the eyes are at the front.',
      terms: [['Artifact', 'signal that is not from the brain']],
      question: 'Where is the blink largest?',
      optionLabels: ['Front', 'Back'],
      verdict: 'Frontal artifact'
    },
    15: {
      notice: 'Jaw tension makes rough fast activity near the temples.',
      terms: [['EMG', 'muscle activity']],
      question: 'Tap the rough muscle noise.'
    },
    16: {
      notice: 'Heart artifact repeats at a perfectly regular pace.',
      terms: [['QRS', 'the sharp beat on an ECG/heart tracing']],
      question: 'Tap the repeating heart artifact.'
    },
    17: {
      notice: 'Sweat makes the baseline drift slowly, slower than brain delta waves.',
      terms: [['Delta', 'slow brain waves'], ['Sweat artifact', 'slow skin-related drift']],
      question: 'Very slow drifting across the page is more likely:',
      optionLabels: ['Brain slowing', 'Sweat drift'],
      verdict: 'Sweat drift'
    },
    18: {
      notice: 'A real brain signal usually shows up in nearby sensors too.',
      terms: [['Field', 'spread of a signal to nearby sensors']],
      question: 'Only one sensor pops. What is more likely?',
      optionLabels: ['Brain spike', 'Sensor problem'],
      verdict: 'Sensor problem'
    },
    19: {
      notice: 'A true spike usually has a slow tail after the sharp point.',
      terms: [['Spike', 'a very brief sharp brain wave'], ['After-wave', 'the slow tail that follows']],
      question: 'Watch the sharp point and its tail, then reveal.'
    },
    20: {
      notice: 'The center of the discharge is where the signal is strongest.',
      terms: [['IED', 'a spike between seizures']],
      question: 'Tap the strongest center.'
    },
    21: {
      notice: 'Generalized means both sides begin together.',
      terms: [['Generalized', 'both hemispheres at once']],
      question: 'Watch both sides start together, then reveal.'
    },
    22: {
      notice: 'Slow waves on one side point to trouble in that region.',
      terms: [['Focal', 'limited to one area']],
      question: 'Tap the slow side.'
    },
    23: {
      notice: 'A sharp wave that repeats again and again can mean high seizure risk.',
      terms: [['Periodic', 'repeating at a steady interval']],
      question: 'Tap the active side.'
    },
    24: {
      notice: 'A seizure has a story: it builds, changes, spreads, then ends.',
      terms: [['Ictal', 'during a seizure']],
      question: 'Watch the changing rhythm, then reveal.'
    },
    25: {
      notice: 'The first place to change matters more than the biggest late activity.',
      terms: [['Onset', 'where the seizure starts']],
      question: 'Tap where it starts.'
    },
    26: {
      notice: 'A convulsive seizure has phases: fast, rhythmic, then quiet.',
      terms: [['Suppression', 'brief quiet period after a seizure']],
      question: 'Watch the sequence, then reveal.'
    },
    27: {
      notice: 'A patient can keep seizing on EEG without large body movements.',
      terms: [['NCSE', 'ongoing seizure activity without convulsions']],
      question: 'Unresponsive patient with continuous seizure waves:',
      optionLabels: ['Wait and watch', 'Treat urgently'],
      verdict: 'Treat urgently'
    },
    28: {
      notice: 'Metabolic illness can create seizure-like waves, so context matters.',
      terms: [['Triphasic', 'three-part waves often seen in encephalopathy']],
      question: 'Where are these waves strongest?'
    },
    29: {
      notice: 'Most mistakes happen when a benign sharp-looking pattern is overcalled.',
      terms: [['Over-read', 'calling a harmless pattern dangerous']],
      question: 'Temporal run with no slow tail:',
      optionLabels: ['Epilepsy spike', 'Wicket wave'],
      verdict: 'Wicket wave'
    },
    30: {
      notice: 'The final report should answer the patient question, not just name a waveform.',
      terms: [['Impression', 'the final meaning of the EEG']],
      question: 'Choose the best final meaning.',
      optionLabels: ['Childhood absence', 'Emergency seizure state'],
      verdict: 'Emergency seizure state'
    }
  };

  Object.keys(BEGINNER).forEach(function (id) {
    if (!LESSONS[id]) return;
    Object.assign(LESSONS[id], BEGINNER[id]);
  });

  var BITE_SIZE = {
    1: {
      shortTitle: 'Head map',
      guide: 'Find the sensor first.',
      explain: { title: 'Every line starts somewhere.', copy: 'Before reading a wave, find where it was recorded.' },
      lookTitle: 'Names tell location.',
      lookKind: 'side',
      notice: 'Letters tell the head area. Numbers tell the side.',
      terms: [['O', 'back of the head'], ['Even number', 'right side']],
      why: 'O means the back of the head. The number 2 is even, so O2 is on the right.',
      mistake: 'Reading the wave before checking where it came from.'
    },
    2: {
      shortTitle: 'Two views',
      guide: 'Same event, different view.',
      explain: { title: 'A trace can change views.', copy: 'One view shows single spots. Another compares neighboring spots.' },
      lookTitle: 'Watch the flip.',
      lookKind: 'flip',
      notice: 'When two nearby lines point away from each other, the strongest spot sits between them.',
      terms: [['View setting', 'how the EEG draws the same signal'], ['Flip', 'two nearby lines turning opposite ways']],
      question: 'The flip points to...',
      optionLabels: ['A loose wire', 'The strongest spot'],
      visual: compare('focal_spike', 'focal_spike', 'single spots', 'neighbor pairs'),
      verdict: 'Strongest spot',
      subtitle: 'The flip is a locator.',
      why: 'The event is strongest at the sensor between the two opposite lines.',
      mistake: 'Calling every flip a loose wire. A loose wire usually stays isolated to one line.'
    },
    3: {
      shortTitle: 'Back rhythm',
      guide: 'Find the steady back rhythm.',
      explain: { title: 'Speed comes before names.', copy: 'First notice whether a wave is slow, steady, or fast.' },
      lookTitle: 'Look at the back.',
      lookKind: 'speed',
      notice: 'A relaxed awake adult often has a steady rhythm near the back sensors.',
      terms: [['Alpha', 'a steady relaxed rhythm'], ['Back sensors', 'O1 and O2']],
      verdict: 'Back alpha rhythm',
      subtitle: 'The strongest steady rhythm is at the back.',
      why: 'The back sensors carry the clearest steady rhythm here.',
      mistake: 'Choosing the busiest front line instead of the steady back rhythm.'
    },
    4: {
      shortTitle: 'Awake rhythm',
      guide: 'Normal has order.',
      explain: { title: 'Normal is not empty.', copy: 'A healthy awake trace has a quiet structure you can learn to recognize.' },
      lookTitle: 'Find the main rhythm.',
      lookKind: 'spread',
      notice: 'The main relaxed rhythm is steady and strongest at the back.',
      terms: [['Main rhythm', 'the rhythm that anchors an awake EEG']],
      verdict: 'Main back rhythm',
      subtitle: 'Steady, balanced, and posterior.',
      why: 'The back lines are organized and stronger than the front lines.',
      mistake: 'Treating normal front activity as a disease pattern.'
    },
    5: {
      shortTitle: 'Drowsy wave',
      guide: 'State changes the trace.',
      explain: { title: 'Sleep starts before sleep.', copy: 'The EEG changes as someone gets drowsy.' },
      lookTitle: 'A center wave can be normal.',
      lookKind: 'spread',
      focusX: '50%',
      notice: 'A brief sharp-looking wave near the center can appear during drowsiness.',
      terms: [['Drowsy', 'between awake and asleep'], ['Center wave', 'a normal brief wave near the top-center']],
      verdict: 'Normal drowsy wave',
      subtitle: 'Sharp-looking does not always mean dangerous.',
      why: 'This wave appears in the right state and stays centered and brief.',
      mistake: 'Calling a normal drowsy wave a seizure spike.'
    },
    6: {
      shortTitle: 'Sleep marks',
      guide: 'Sleep has signatures.',
      explain: { title: 'Sleep leaves marks.', copy: 'Some patterns look dramatic but simply mean normal sleep.' },
      lookTitle: 'Two normal sleep marks.',
      lookKind: 'story',
      notice: 'Short fast bursts and larger slow waves are expected in this sleep stage.',
      terms: [['Spindle', 'a short fast sleep burst'], ['K-complex', 'a large normal sleep wave']],
      verdict: 'Normal sleep marks',
      subtitle: 'They identify stage 2 sleep.',
      why: 'The fast burst and larger wave are expected sleep features.',
      mistake: 'Mistaking normal sleep bursts for seizure activity.'
    },
    7: {
      shortTitle: 'Settings',
      guide: 'The machine can hide waves.',
      explain: { title: 'The machine edits the view.', copy: 'A setting can remove part of the signal before you see it.' },
      lookTitle: 'Filters are sieves.',
      lookKind: 'speed',
      notice: 'If a setting removes slow waves, the trace can look falsely cleaner.',
      terms: [['Filter', 'a setting that hides part of the signal']],
      question: 'If slow waves below 5 per second are hidden, what disappears?',
      optionLabels: ['Fast waves', 'Slow waves'],
      visual: compare('normal_awake', 'diffuse_slowing', 'before setting', 'after setting'),
      verdict: 'Slow waves',
      subtitle: 'The setting removed them.',
      why: 'The cutoff is above the slow waves, so those waves disappear from view.',
      mistake: 'Saying slow waves are absent before checking the settings.'
    },
    8: {
      shortTitle: 'Child rhythm',
      guide: 'Age changes normal.',
      explain: { title: 'Children are not small adults.', copy: 'A normal child trace can look slower than an adult trace.' },
      lookTitle: 'Match the age.',
      lookKind: 'speed',
      notice: 'A slower back rhythm can be normal in a young child.',
      terms: [['Age normal', 'what is expected for that age']],
      question: 'A 3-year-old has a 7-per-second back rhythm. Is that okay?',
      optionLabels: ['Too slow', 'Okay for age'],
      verdict: 'Okay for age',
      subtitle: 'Normal speed changes with age.',
      why: 'Young children can normally have slower back rhythms than adults.',
      mistake: 'Using adult rules for a child.'
    },
    9: {
      shortTitle: 'Harmless sharp',
      guide: 'Sharp is not enough.',
      explain: { title: 'Some harmless waves look sharp.', copy: 'The shape after the sharp part often tells the truth.' },
      lookTitle: 'Check for the tail.',
      lookKind: 'story',
      notice: 'This sharp-looking run ends cleanly instead of dragging a slow tail behind it.',
      terms: [['Wicket', 'a harmless temporal sharp-looking rhythm'], ['Tail', 'the slow wave after a true spike']],
      verdict: 'Harmless wicket waves',
      subtitle: 'No slow tail follows.',
      why: 'The run is sharp-looking, but it has the harmless shape and no slow tail.',
      mistake: 'Calling a harmless sharp-looking rhythm epilepsy.'
    },
    10: {
      shortTitle: 'Direction',
      guide: 'Direction is a clue.',
      explain: { title: 'Waves have direction.', copy: 'A sharp wave can point in a way that makes danger less likely.' },
      lookTitle: 'Notice which way it points.',
      lookKind: 'speed',
      notice: 'In this setting, the wave direction argues against a seizure spike.',
      terms: [['Direction', 'which way the wave points']],
      question: 'What does this direction suggest?',
      optionLabels: ['Still suspicious', 'More likely harmless'],
      verdict: 'More likely harmless',
      subtitle: 'Direction helped lower concern.',
      why: 'The sharp shape points the wrong way for the usual seizure spike pattern.',
      mistake: 'Treating shape alone as the whole answer.'
    },
    11: {
      shortTitle: 'No change',
      guide: 'Seizures usually change.',
      explain: { title: 'A seizure tells a story.', copy: 'It usually builds, spreads, or changes speed.' },
      lookTitle: 'Look for change.',
      lookKind: 'story',
      notice: 'This rhythm starts and stops without building or spreading.',
      terms: [['Evolution', 'change in speed, size, or spread']],
      verdict: 'No-change rhythm',
      subtitle: 'No build-up, no spread.',
      why: 'The rhythm stays the same instead of evolving like a seizure.',
      mistake: 'Calling any repeated rhythm a seizure.'
    },
    12: {
      shortTitle: 'Tiny sleep sharp',
      guide: 'Size and state matter.',
      explain: { title: 'Tiny sleep sharps can be normal.', copy: 'Small, brief waves during sleep often do not mean disease.' },
      lookTitle: 'Small plus sleep-bound.',
      lookKind: 'spread',
      notice: 'The sharp wave is tiny, brief, and appears in sleep.',
      terms: [['Brief wave', 'a quick one-time event'], ['Sleep-bound', 'seen only during sleep']],
      question: 'A tiny sleep-only sharp wave is most likely:',
      optionLabels: ['Dangerous spike', 'Benign sleep wave'],
      verdict: 'Benign sleep wave',
      subtitle: 'Small, brief, and sleep-only.',
      why: 'Those three clues point away from a dangerous spike.',
      mistake: 'Judging only the pointed shape.'
    },
    13: {
      shortTitle: 'Context',
      guide: 'The patient matters.',
      explain: { title: 'The same rhythm can mean different things.', copy: 'The patient state changes the interpretation.' },
      lookTitle: 'Ask what changed.',
      lookKind: 'flip',
      notice: 'If the patient is awake, unchanged, and recovers normally, the rhythm is less alarming.',
      terms: [['Symptom match', 'a patient change that matches the trace']],
      question: 'Awake, no symptoms, no after-change. What is safer?',
      optionLabels: ['Treat as emergency', 'Call benign pattern'],
      visual: compare('drowsy', 'temporal_seizure', 'unchanged', 'changing'),
      verdict: 'Benign pattern',
      subtitle: 'The patient did not change.',
      why: 'The trace alone is not enough. The patient stayed well during it.',
      mistake: 'Treating a rhythm without checking the patient.'
    },
    14: {
      shortTitle: 'Blink',
      guide: 'Eyes write on EEG.',
      explain: { title: 'The eyes make signal.', copy: 'A blink is strongest near the eyes, not the back of the head.' },
      lookTitle: 'Start at the front.',
      lookKind: 'spread',
      focusX: '28%',
      notice: 'Blink waves are largest in the front sensors.',
      terms: [['Artifact', 'signal that is not from the brain']],
      verdict: 'Front blink artifact',
      subtitle: 'The eyes are closest to the front sensors.',
      why: 'The wave is biggest at the front and fades toward the back.',
      mistake: 'Calling a blink a brain slow wave.'
    },
    15: {
      shortTitle: 'Muscle',
      guide: 'Jaw tension adds noise.',
      explain: { title: 'Muscle can cover the trace.', copy: 'Jaw and temple muscles create rough fast noise.' },
      lookTitle: 'Look near the temples.',
      lookKind: 'speed',
      notice: 'Muscle noise is rough, fast, and strongest near the side of the head.',
      terms: [['Muscle artifact', 'muscle signal mixed into the EEG']],
      verdict: 'Temple muscle noise',
      subtitle: 'Rough fast activity is strongest on the side.',
      why: 'The side sensors pick up nearby muscle tension.',
      mistake: 'Calling muscle noise a fast seizure pattern.'
    },
    16: {
      shortTitle: 'Heartbeat',
      guide: 'Perfect timing is a clue.',
      explain: { title: 'The heart can appear on EEG.', copy: 'A perfectly repeating sharp mark often comes from the heartbeat.' },
      lookTitle: 'Listen for regular timing.',
      lookKind: 'story',
      notice: 'The mark repeats at the same interval again and again.',
      terms: [['Heart artifact', 'heartbeat signal showing up in the EEG']],
      verdict: 'Heartbeat artifact',
      subtitle: 'The timing is too regular for a brain spike.',
      why: 'Each mark lands at a steady heartbeat interval.',
      mistake: 'Ignoring timing and judging only the sharp shape.'
    },
    17: {
      shortTitle: 'Skin drift',
      guide: 'Very slow drift is suspicious.',
      explain: { title: 'Skin can move the baseline.', copy: 'Sweat can make the whole trace slide slowly.' },
      lookTitle: 'Too slow for brain rhythm.',
      lookKind: 'speed',
      notice: 'The baseline drifts more slowly than ordinary brain slow waves.',
      terms: [['Drift', 'the whole line sliding up or down']],
      question: 'Very slow drifting across the page is more likely:',
      optionLabels: ['Brain slowing', 'Sweat drift'],
      verdict: 'Sweat drift',
      subtitle: 'The baseline is sliding.',
      why: 'The movement is broad and extremely slow, which fits skin/sweat artifact.',
      mistake: 'Calling baseline drift a brain rhythm.'
    },
    18: {
      shortTitle: 'One sensor',
      guide: 'Brain signals spread.',
      explain: { title: 'A real brain event has neighbors.', copy: 'If only one sensor pops, first suspect the sensor.' },
      lookTitle: 'Check the neighbors.',
      lookKind: 'side',
      notice: 'A true brain signal usually appears in nearby sensors too.',
      terms: [['Field', 'spread of a signal to nearby sensors']],
      question: 'Only one sensor pops. What is more likely?',
      optionLabels: ['Brain spike', 'Sensor problem'],
      verdict: 'Sensor problem',
      subtitle: 'No neighboring spread.',
      why: 'The event is isolated instead of spreading to nearby sensors.',
      mistake: 'Localizing disease from one lonely sensor pop.'
    },
    19: {
      shortTitle: 'Sharp plus tail',
      guide: 'A point alone is not enough.',
      explain: { title: 'A real spike often has a tail.', copy: 'The slow wave after the point is part of the clue.' },
      lookTitle: 'Find the tail.',
      lookKind: 'story',
      notice: 'A concerning spike is often followed by a slower wave.',
      terms: [['Spike', 'a very brief sharp wave'], ['Tail', 'the slower wave after it']],
      verdict: 'Spike with slow tail',
      subtitle: 'The tail makes the point matter more.',
      why: 'The sharp point disrupts the rhythm and is followed by a slow wave.',
      mistake: 'Calling every pointed wave a spike.'
    },
    20: {
      shortTitle: 'Spike center',
      guide: 'Find the strongest spot.',
      explain: { title: 'A discharge has a center.', copy: 'The strongest line helps locate where it came from.' },
      lookTitle: 'Center beats edges.',
      lookKind: 'spread',
      focusX: '38%',
      notice: 'The center is the line with the strongest sharp wave and matching neighbors.',
      terms: [['Brief burst', 'a short abnormal event']],
      question: 'Tap the strongest center.',
      verdict: 'Left-side center',
      subtitle: 'The strongest sharp wave sits at T3.',
      why: 'The nearby lines point toward the same left temporal center.',
      mistake: 'Reporting a spike without saying where it is strongest.'
    },
    21: {
      shortTitle: 'Both sides',
      guide: 'Together means something different.',
      explain: { title: 'Both sides can start together.', copy: 'Some bursts are not one-sided at all.' },
      lookTitle: 'Watch both halves.',
      lookKind: 'spread',
      focusX: '50%',
      notice: 'The burst begins on both sides at nearly the same time.',
      terms: [['Both sides', 'left and right start together']],
      verdict: 'Both-side burst',
      subtitle: 'The two sides start together.',
      why: 'The pattern appears across both hemispheres instead of starting from one small center.',
      mistake: 'Treating a both-side burst as a one-sided problem.'
    },
    22: {
      shortTitle: 'Slow side',
      guide: 'Slow waves can localize.',
      explain: { title: 'Slow in one place matters.', copy: 'One region slowing down can point to stress in that region.' },
      lookTitle: 'Compare left and right.',
      lookKind: 'spread',
      focusX: '36%',
      notice: 'One side has repeated slow waves while the other side is quieter.',
      terms: [['One area', 'limited to one region']],
      verdict: 'Left-side slowing',
      subtitle: 'The slow waves are one-sided.',
      why: 'Persistent slow activity is concentrated over the left side.',
      mistake: 'Calling one-sided slowing a whole-brain problem.'
    },
    23: {
      shortTitle: 'Repeating waves',
      guide: 'Repetition can raise risk.',
      explain: { title: 'Repeating sharp waves deserve attention.', copy: 'A sharp wave that returns again and again is not just random noise.' },
      lookTitle: 'Look for a repeating side.',
      lookKind: 'story',
      notice: 'The same side produces sharp waves at a steady pace.',
      terms: [['Repeating', 'returning at a steady interval']],
      question: 'Tap the active side.',
      verdict: 'Right-side repeating waves',
      subtitle: 'The right side keeps producing them.',
      why: 'The activity repeats over the right hemisphere at a steady interval.',
      mistake: 'Dismissing repeated sharp waves because they look too regular.'
    },
    24: {
      shortTitle: 'Changing rhythm',
      guide: 'A seizure changes over time.',
      explain: { title: 'Change is the story.', copy: 'A seizure pattern builds, shifts, spreads, and then ends.' },
      lookTitle: 'Look for a beginning, middle, and end.',
      lookKind: 'story',
      notice: 'The rhythm changes speed, size, and spread over time.',
      terms: [['Evolution', 'change over time']],
      verdict: 'Seizure evolution',
      subtitle: 'The rhythm changes in several ways.',
      why: 'It starts small, builds, spreads, and then slows down.',
      mistake: 'Calling a steady unchanged rhythm a seizure.'
    },
    25: {
      shortTitle: 'Start point',
      guide: 'Start beats spread.',
      explain: { title: 'The first change matters.', copy: 'The biggest late signal may only be spread.' },
      lookTitle: 'Find where it starts.',
      lookKind: 'spread',
      focusX: '38%',
      notice: 'The first rhythmic change appears before the later spread.',
      terms: [['Onset', 'where the event begins']],
      question: 'Tap where it starts.',
      verdict: 'Left temporal start',
      subtitle: 'The first change appears at T3.',
      why: 'The rhythm begins at T3 before it spreads elsewhere.',
      mistake: 'Choosing the largest late wave instead of the earliest change.'
    },
    26: {
      shortTitle: 'Convulsion trace',
      guide: 'The trace has phases.',
      explain: { title: 'Convulsions have a sequence.', copy: 'The EEG often moves from fast activity to rhythmic bursts to quiet.' },
      lookTitle: 'See the three phases.',
      lookKind: 'story',
      notice: 'Fast activity comes first, rhythmic bursts follow, then the trace becomes quiet.',
      terms: [['Quiet after', 'a quiet period after a seizure']],
      verdict: 'Convulsive seizure sequence',
      subtitle: 'Fast, rhythmic, then quiet.',
      why: 'The phase sequence supports a true convulsive seizure pattern.',
      mistake: 'Stopping the recording before the quiet after-phase appears.'
    },
    27: {
      shortTitle: 'Silent seizure',
      guide: 'No shaking does not mean no seizure.',
      explain: { title: 'The body can be quiet.', copy: 'Seizure activity can continue on EEG without large movements.' },
      lookTitle: 'Trace and patient disagree.',
      lookKind: 'spread',
      focusX: '52%',
      notice: 'The patient is unresponsive while seizure-like waves continue.',
      terms: [['Nonconvulsive seizure', 'ongoing seizure activity without convulsions']],
      question: 'Unresponsive patient with continuous seizure waves:',
      optionLabels: ['Wait and watch', 'Treat urgently'],
      verdict: 'Treat urgently',
      subtitle: 'The EEG is still active.',
      why: 'Ongoing seizure activity with impaired responsiveness is urgent.',
      mistake: 'Waiting for shaking before acting.'
    },
    28: {
      shortTitle: 'Illness waves',
      guide: 'Illness can imitate seizure.',
      explain: { title: 'Sick brains can make look-alikes.', copy: 'Whole-body illness can create waves that resemble seizure patterns.' },
      lookTitle: 'Use the patient context.',
      lookKind: 'spread',
      focusX: '50%',
      notice: 'These waves are broad and strongest toward the front in a sick patient.',
      terms: [['Illness effect', 'brain stress from illness or toxins']],
      question: 'Where are these waves strongest?',
      verdict: 'Front strongest',
      subtitle: 'The front leads the pattern.',
      why: 'The broad front-heavy pattern fits illness-related brain stress in the right context.',
      mistake: 'Treating every seizure look-alike as a seizure.'
    },
    29: {
      shortTitle: 'Over-call trap',
      guide: 'Name the harmless pattern.',
      explain: { title: 'Mistakes have patterns.', copy: 'Over-calling often happens when one safety check is skipped.' },
      lookTitle: 'No tail, no rush.',
      lookKind: 'story',
      notice: 'The temporal run looks sharp, but it lacks the slow tail.',
      terms: [['Over-call', 'calling a harmless pattern dangerous']],
      question: 'Temporal run with no slow tail:',
      optionLabels: ['Epilepsy spike', 'Wicket wave'],
      verdict: 'Wicket wave',
      subtitle: 'A harmless sharp-looking run.',
      why: 'The run has the common harmless shape and no slow tail.',
      mistake: 'Creating a false epilepsy label from a benign pattern.'
    },
    30: {
      shortTitle: 'Final meaning',
      guide: 'The report answers the patient question.',
      explain: { title: 'The waveform is not the whole answer.', copy: 'A final impression must fit the patient in front of you.' },
      lookTitle: 'Combine trace and story.',
      lookKind: 'report',
      notice: 'Same-looking waves can lead to different conclusions in different patients.',
      terms: [['Impression', 'the final meaning of the EEG']],
      question: 'Choose the best final meaning.',
      optionLabels: ['Childhood absence', 'Emergency seizure state'],
      visual: {
        kind: 'report',
        report: {
          tabs: ['Patient', 'Trace', 'Meaning'],
          rows: [
            ['Patient', 'Adult, confused after a convulsion.'],
            ['Trace', 'Both-side repeated seizure waves.'],
            ['State', 'Awake but not responding.'],
            ['Meaning', 'Treat as an emergency pattern.']
          ]
        }
      },
      verdict: 'Emergency seizure state',
      subtitle: 'The patient context changes the meaning.',
      why: 'In a confused adult, continuous seizure waves are an emergency pattern.',
      mistake: 'Naming the waveform without answering the clinical question.'
    }
  };

  Object.keys(BITE_SIZE).forEach(function (id) {
    if (!LESSONS[id]) return;
    Object.assign(LESSONS[id], BITE_SIZE[id]);
  });

  global.EEG_LESSON_META = LESSONS;

}(window));
