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

  function c(title, copy, kind, terms, extra) {
    var out = Object.assign({ title: title, copy: copy, kind: kind || 'spread' }, extra || {});
    if (terms && terms.length) out.terms = terms;
    return out;
  }

  var COURSE_REWRITE = {
    1: {
      shortTitle: 'O2',
      guide: 'Decode the label.',
      cards: [
        c('This is a trace.', 'Each moving line comes from one listening spot.', 'line', [['Trace', 'a drawn EEG line'], ['Listening spot', 'a small scalp sensor']]),
        c('Sensors sit on a head map.', 'A sensor name tells you where it sits.', 'sensor', [['Sensor', 'a scalp listening spot']]),
        c('The head map has regions.', 'For now, learn front, center, side, and back.', 'regions', [['Back', 'the rear of the head']], { region: 'back' }),
        c('Occipital means back.', 'Doctors call the back of the head occipital.', 'regions', [['Occipital', 'the back of the head'], ['O', 'short for occipital']], { region: 'back' }),
        c('Numbers tell side.', 'Odd numbers are left. Even numbers are right.', 'side', [['Odd', 'left side'], ['Even', 'right side']]),
        c('Now decode O2.', 'O means back. 2 means right. O2 means back-right.', 'code', [['O2', 'back-right sensor']], { parts: ['O', '2'], labels: ['back', 'right'] })
      ],
      question: 'O2 sits on which side?',
      optionLabels: ['Left side', 'Right side'],
      verdict: 'Right side',
      subtitle: 'O2 is back-right.',
      why: 'O means occipital, the back of the head. 2 is even, so it is right.',
      mistake: 'Trying to read a line before decoding its address.'
    },
    2: {
      shortTitle: 'Views',
      guide: 'Same signal, new drawing.',
      cards: [
        c('The same signal can be redrawn.', 'One view shows each sensor alone.', 'sensor', [['View', 'how the EEG is drawn']]),
        c('Another view compares neighbors.', 'A line can show the difference between two nearby sensors.', 'compare', [['Neighbor pair', 'two sensors compared']]),
        c('A flip is a locator.', 'When nearby lines point away from each other, the center is strongest.', 'flip', [['Flip', 'nearby lines turn opposite ways']]),
        c('Do not name it yet.', 'First ask: where is the strongest spot?', 'spread', [['Strongest spot', 'where the event is largest']], { focusX: '50%' })
      ],
      question: 'The flip points to...',
      optionLabels: ['A loose wire', 'The strongest spot'],
      visual: compare('focal_spike', 'focal_spike', 'single sensors', 'neighbor pairs'),
      verdict: 'Strongest spot',
      subtitle: 'The flip helps locate it.',
      why: 'The event is biggest at the sensor between the opposite lines.',
      mistake: 'Calling a flip a loose wire before checking the pattern around it.'
    },
    3: {
      shortTitle: 'Back rhythm',
      guide: 'Find the steady back line.',
      cards: [
        c('Waves have speed.', 'Slow waves repeat less often. Fast waves repeat more often.', 'speed', [['Speed', 'how often a wave repeats']]),
        c('Some rhythms are steady.', 'A rhythm repeats with a regular shape.', 'line', [['Rhythm', 'a repeating wave pattern']]),
        c('The back can carry a calm rhythm.', 'In an awake relaxed adult, the back lines often look steady.', 'regions', [['Back lines', 'sensors near the rear head']], { region: 'back' }),
        c('Now name it.', 'That calm back rhythm is called alpha.', 'speed', [['Alpha', 'a steady relaxed back rhythm']])
      ],
      question: 'Tap the steady back rhythm.',
      verdict: 'Back alpha rhythm',
      subtitle: 'It is strongest near O1 and O2.',
      why: 'The clearest steady rhythm is in the back sensors.',
      mistake: 'Choosing a busy line instead of the steady back rhythm.'
    },
    4: {
      shortTitle: 'Awake trace',
      guide: 'Normal has structure.',
      cards: [
        c('Normal is not blank.', 'A healthy awake trace still has shape and rhythm.', 'line', [['Awake trace', 'EEG while awake']]),
        c('Compare front and back.', 'The back rhythm can be clearer than the front lines.', 'regions', [['Front', 'near the forehead'], ['Back', 'rear head']], { region: 'back' }),
        c('Look for balance.', 'Normal awake rhythms are usually steady and similar on both sides.', 'side', [['Balanced', 'left and right look similar']])
      ],
      question: 'Tap the main back rhythm.',
      verdict: 'Main back rhythm',
      subtitle: 'Steady, balanced, and posterior.',
      why: 'The back lines are organized and stronger than the front lines.',
      mistake: 'Calling ordinary front activity abnormal.'
    },
    5: {
      shortTitle: 'Drowsy',
      guide: 'State changes the trace.',
      cards: [
        c('State means brain mode.', 'Awake, drowsy, and asleep can look different.', 'story', [['State', 'awake, drowsy, or asleep']]),
        c('Drowsy is the doorway.', 'As a person gets sleepy, the trace slows and changes.', 'speed', [['Drowsy', 'between awake and asleep']]),
        c('A center wave can be normal.', 'A brief sharp-looking center wave can appear in drowsiness.', 'spread', [['Center wave', 'normal brief drowsy wave']], { focusX: '50%' })
      ],
      question: 'Watch the center wave, then reveal.',
      verdict: 'Normal drowsy wave',
      subtitle: 'The state explains the shape.',
      why: 'It appears briefly, near the center, while the person is drowsy.',
      mistake: 'Treating every sharp-looking wave as dangerous.'
    },
    6: {
      shortTitle: 'Sleep marks',
      guide: 'Sleep has normal marks.',
      cards: [
        c('Sleep has stages.', 'A sleeping EEG does not look the same all night.', 'story', [['Sleep stage', 'a sleep state with its own pattern']]),
        c('A short fast burst can be normal.', 'This burst grows and fades during sleep.', 'speed', [['Spindle', 'a short fast sleep burst']]),
        c('A large slow wave can be normal.', 'This larger sleep wave may appear near the center.', 'spread', [['K-complex', 'a large normal sleep wave']], { focusX: '50%' }),
        c('Name only after the clue.', 'Spindles and K-complexes are normal sleep marks.', 'story', [['Sleep mark', 'normal signal during sleep']])
      ],
      question: 'Watch the sleep marks, then reveal.',
      verdict: 'Normal sleep marks',
      subtitle: 'They identify stage 2 sleep.',
      why: 'The fast burst and large slow wave are expected during sleep.',
      mistake: 'Mistaking normal sleep marks for danger.'
    },
    7: {
      shortTitle: 'Settings',
      guide: 'The machine can hide waves.',
      cards: [
        c('The display is not raw truth.', 'Machine settings can change what you see.', 'line', [['Display', 'the drawn view of the signal']]),
        c('A filter is a sieve.', 'It can hide waves that are too slow or too fast.', 'speed', [['Filter', 'a setting that hides part of the signal']]),
        c('Check settings before judging.', 'If slow waves are hidden, the trace can look falsely clean.', 'compare', [['Slow waves', 'waves that repeat slowly']])
      ],
      question: 'If slow waves below 5 per second are hidden, what disappears?',
      optionLabels: ['Fast waves', 'Slow waves'],
      visual: compare('normal_awake', 'diffuse_slowing', 'before setting', 'after setting'),
      verdict: 'Slow waves',
      subtitle: 'The setting removed them.',
      why: 'The setting cuts off waves below that speed.',
      mistake: 'Saying slow waves are absent before checking the settings.'
    },
    8: {
      shortTitle: 'Child rhythm',
      guide: 'Age changes normal.',
      cards: [
        c('Normal depends on age.', 'A child trace is allowed to look slower than an adult trace.', 'speed', [['Age normal', 'expected for that age']]),
        c('Children mature over time.', 'The relaxed back rhythm usually gets faster with age.', 'regions', [['Mature', 'change toward adult pattern']], { region: 'back' }),
        c('Compare with the child, not the adult.', 'A 3-year-old can have a slower back rhythm.', 'speed', [['7 per second', 'seven repeats each second']])
      ],
      question: 'A 3-year-old has a 7-per-second back rhythm. Is that okay?',
      optionLabels: ['Too slow', 'Okay for age'],
      verdict: 'Okay for age',
      subtitle: 'Normal speed changes with age.',
      why: 'Young children can normally have slower back rhythms than adults.',
      mistake: 'Using adult rules for a child.'
    },
    9: {
      shortTitle: 'Sharp look-alike',
      guide: 'Sharp is not enough.',
      cards: [
        c('A pointed wave is only a shape.', 'Shape alone does not decide whether a pattern is dangerous.', 'line', [['Pointed wave', 'a sharp-looking shape']]),
        c('Look after the point.', 'A concerning point often has a slow tail after it.', 'story', [['Tail', 'the slower wave after a point']]),
        c('Temporal means side head.', 'The side sensors sit near the temples.', 'regions', [['Temporal', 'side of the head']], { region: 'side' }),
        c('Wickets are a look-alike.', 'A temporal sharp-looking run with no tail can be harmless.', 'story', [['Wicket', 'a harmless temporal look-alike']])
      ],
      question: 'Tap the harmless temporal run.',
      verdict: 'Wicket wave',
      subtitle: 'Sharp-looking, but no slow tail.',
      why: 'The run sits near the side and lacks the slow tail that would raise concern.',
      mistake: 'Calling a look-alike dangerous from shape alone.'
    },
    10: {
      shortTitle: 'Direction',
      guide: 'Direction is a clue.',
      cards: [
        c('Waves point.', 'A sharp wave can point upward or downward on the page.', 'polarity', [['Direction', 'which way a wave points']]),
        c('Direction changes meaning.', 'Some sharp bursts point the wrong way for the usual danger pattern.', 'polarity', [['Positive burst', 'a burst pointing the benign way']]),
        c('Use shape plus direction.', 'Do not judge a sharp wave from shape alone.', 'story', [['Shape plus direction', 'two clues together']])
      ],
      question: 'What does this direction suggest?',
      optionLabels: ['Still suspicious', 'More likely harmless'],
      verdict: 'More likely harmless',
      subtitle: 'Direction lowered concern.',
      why: 'The sharp burst points in a way that argues against the usual danger pattern.',
      mistake: 'Treating shape alone as the whole answer.'
    },
    11: {
      shortTitle: 'No change',
      guide: 'Danger usually changes.',
      cards: [
        c('A seizure is a changing event.', 'It usually builds, spreads, or changes speed.', 'story', [['Seizure', 'abnormal brain activity that evolves']]),
        c('No change is a clue.', 'A rhythm that appears and stops without changing is less suspicious.', 'story', [['Evolution', 'change over time']]),
        c('Ask what happened over time.', 'Speed, size, and spread are the three questions.', 'speed', [['Spread', 'movement to more sensors']])
      ],
      question: 'Watch for change over time, then reveal.',
      verdict: 'No-change rhythm',
      subtitle: 'No build-up, no spread.',
      why: 'The rhythm stays the same instead of evolving like a seizure.',
      mistake: 'Calling any repeated rhythm a seizure.'
    },
    12: {
      shortTitle: 'Tiny sleep sharp',
      guide: 'Size and state matter.',
      cards: [
        c('Tiny changes mean less.', 'A very small sharp wave can be harmless.', 'line', [['Tiny', 'low height on the page']]),
        c('Sleep changes the rules.', 'Some brief sharp waves are normal only in sleep.', 'story', [['Sleep-only', 'appears during sleep']]),
        c('Combine the clues.', 'Tiny, brief, and sleep-only points away from danger.', 'spread', [['Brief', 'very short in time']])
      ],
      question: 'A tiny sleep-only sharp wave is most likely:',
      optionLabels: ['Dangerous wave', 'Benign sleep wave'],
      verdict: 'Benign sleep wave',
      subtitle: 'Small, brief, and sleep-only.',
      why: 'Those three clues point away from a dangerous wave.',
      mistake: 'Judging only the pointed shape.'
    },
    13: {
      shortTitle: 'Patient state',
      guide: 'The person matters.',
      cards: [
        c('A trace is not the whole story.', 'The patient state can change the meaning.', 'report', [['Patient state', 'what the patient is doing or feeling']]),
        c('Look for a matching symptom.', 'If the trace changes but the patient does not, be careful.', 'compare', [['Symptom match', 'patient change matching the trace']]),
        c('After-change matters too.', 'A seizure often leaves the trace slower afterward.', 'story', [['After-change', 'what happens after the event']])
      ],
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
      guide: 'First ask: brain or not?',
      cards: [
        c('Not every signal is brain.', 'EEG also catches eyes, muscles, heart, skin, and wires.', 'sensor', [['Artifact', 'signal that is not brain']]),
        c('Eyes sit in front.', 'A blink is strongest near the forehead sensors.', 'regions', [['Front', 'near the forehead']], { region: 'front' }),
        c('Front first, back fades.', 'If a blink fades toward the back, it is probably eye signal.', 'spread', [['Blink', 'eye movement on EEG']], { focusX: '28%' })
      ],
      question: 'Where is the blink largest?',
      optionLabels: ['Front', 'Back'],
      verdict: 'Front blink artifact',
      subtitle: 'The eyes are closest to the front sensors.',
      why: 'The wave is biggest at the front and fades toward the back.',
      mistake: 'Calling a blink a brain slow wave.'
    },
    15: {
      shortTitle: 'Muscle',
      guide: 'Jaw tension adds noise.',
      cards: [
        c('Muscle can write on EEG.', 'Jaw and temple muscles create rough fast noise.', 'speed', [['Muscle noise', 'muscle signal on EEG']]),
        c('Temples are side head.', 'Jaw tension often appears near the side sensors.', 'regions', [['Temple', 'side of the head']], { region: 'side' }),
        c('Rough and fast is the clue.', 'Muscle noise looks scratchy, not smooth and organized.', 'line', [['Rough fast', 'scratchy high-speed signal']])
      ],
      question: 'Tap the rough muscle noise.',
      verdict: 'Temple muscle noise',
      subtitle: 'Rough fast activity is strongest on the side.',
      why: 'The side sensors pick up nearby muscle tension.',
      mistake: 'Calling muscle noise a fast seizure pattern.'
    },
    16: {
      shortTitle: 'Heartbeat',
      guide: 'Perfect timing is a clue.',
      cards: [
        c('The heart can show up.', 'A heartbeat can leave a small sharp mark on EEG.', 'timing', [['Heart artifact', 'heartbeat signal on EEG']]),
        c('Timing is the giveaway.', 'Heart marks repeat at a very regular interval.', 'timing', [['Regular interval', 'same time gap again and again']]),
        c('Brain spikes are less exact.', 'A perfectly repeated mark is often not brain.', 'line', [['Not brain', 'signal from outside the cortex']])
      ],
      question: 'Tap the repeating heart artifact.',
      verdict: 'Heartbeat artifact',
      subtitle: 'The timing is too regular for a brain event.',
      why: 'Each mark lands at a steady heartbeat interval.',
      mistake: 'Ignoring timing and judging only the sharp shape.'
    },
    17: {
      shortTitle: 'Skin drift',
      guide: 'The baseline can slide.',
      cards: [
        c('The baseline is the resting line.', 'Sometimes the whole line slowly slides up or down.', 'line', [['Baseline', 'the resting position of a line']]),
        c('Sweat can cause drift.', 'Skin changes can move the baseline very slowly.', 'speed', [['Drift', 'slow sliding of the line']]),
        c('Too slow is suspicious.', 'If it is slower than brain rhythm, think skin first.', 'speed', [['Sweat drift', 'skin-related baseline drift']])
      ],
      question: 'Very slow drifting across the page is more likely:',
      optionLabels: ['Brain slowing', 'Sweat drift'],
      verdict: 'Sweat drift',
      subtitle: 'The baseline is sliding.',
      why: 'The movement is broad and extremely slow, which fits skin or sweat artifact.',
      mistake: 'Calling baseline drift a brain rhythm.'
    },
    18: {
      shortTitle: 'One sensor',
      guide: 'Brain signals have neighbors.',
      cards: [
        c('Brain events spread nearby.', 'A real brain signal usually reaches neighboring sensors.', 'sensor', [['Neighbor', 'a nearby sensor']]),
        c('Spread is called a field.', 'Field means the signal shows up around the source.', 'spread', [['Field', 'spread to nearby sensors']], { focusX: '54%' }),
        c('One lonely pop is suspicious.', 'If only one sensor pops, check the sensor first.', 'code', [['Single pop', 'one isolated sensor event']], { parts: ['F8', 'only'], labels: ['one sensor', 'no neighbors'] })
      ],
      question: 'Only one sensor pops. What is more likely?',
      optionLabels: ['Brain spike', 'Sensor problem'],
      verdict: 'Sensor problem',
      subtitle: 'No neighboring spread.',
      why: 'The event is isolated instead of spreading to nearby sensors.',
      mistake: 'Localizing disease from one lonely sensor pop.'
    },
    19: {
      shortTitle: 'Spike rule',
      guide: 'A point alone is not enough.',
      cards: [
        c('A spike is very brief.', 'A spike is a short sharp brain wave.', 'line', [['Spike', 'a very brief sharp wave']]),
        c('The tail matters.', 'A concerning spike is often followed by a slower wave.', 'spike-tail', [['Tail', 'the slower wave after it']]),
        c('Look for disruption.', 'The spike should interrupt the surrounding rhythm.', 'line', [['Disrupt', 'break the ongoing rhythm']])
      ],
      question: 'Watch the sharp point and its tail, then reveal.',
      verdict: 'Spike with slow tail',
      subtitle: 'The tail makes the point matter more.',
      why: 'The sharp point disrupts the rhythm and is followed by a slow wave.',
      mistake: 'Calling every pointed wave a spike.'
    },
    20: {
      shortTitle: 'Spike center',
      guide: 'Find the source area.',
      cards: [
        c('A spike has a center.', 'The center is where the sharp wave is strongest.', 'spread', [['Center', 'strongest part of the event']], { focusX: '38%' }),
        c('T means temporal.', 'Temporal means the side of the head, near the temple.', 'regions', [['Temporal', 'side of the head'], ['T', 'short for temporal']], { region: 'side' }),
        c('T3 means left temporal.', 'T is side head. 3 is odd, so it is left.', 'code', [['T3', 'left temporal sensor']], { parts: ['T', '3'], labels: ['side', 'left'] }),
        c('Tap the center, not the edge.', 'The strongest line is the best locator.', 'spread', [['Locator', 'clue to source area']], { focusX: '38%' })
      ],
      question: 'Tap the strongest center.',
      verdict: 'Left temporal center',
      subtitle: 'The strongest sharp wave sits at T3.',
      why: 'T3 means left temporal, and the nearby lines point toward that center.',
      mistake: 'Reporting a spike without saying where it is strongest.'
    },
    21: {
      shortTitle: 'Both sides',
      guide: 'Together means different.',
      cards: [
        c('Some bursts start on both sides.', 'Not every event begins from one small center.', 'side', [['Both sides', 'left and right together']]),
        c('Timing matters.', 'If left and right begin together, it is a different clue.', 'story', [['Together', 'same moment on both sides']]),
        c('Do not force a side.', 'A both-side burst should not be called one-sided.', 'spread', [['One-sided', 'mainly left or mainly right']], { focusX: '50%' })
      ],
      question: 'Watch both sides start together, then reveal.',
      verdict: 'Both-side burst',
      subtitle: 'The two sides start together.',
      why: 'The pattern appears across both sides instead of starting from one small center.',
      mistake: 'Treating a both-side burst as a one-sided problem.'
    },
    22: {
      shortTitle: 'Slow side',
      guide: 'Compare the halves.',
      cards: [
        c('Slow can be local.', 'Slow waves in one area can point to stress there.', 'speed', [['Slow wave', 'a wave that repeats slowly']]),
        c('Compare left with right.', 'One side may carry more slow activity than the other.', 'side', [['Side difference', 'left and right do not match']]),
        c('One area is a clue.', 'If slow waves stay in one region, name the region.', 'spread', [['One area', 'limited to one region']], { focusX: '36%' })
      ],
      question: 'Tap the slow side.',
      verdict: 'Left-side slowing',
      subtitle: 'The slow waves are one-sided.',
      why: 'Persistent slow activity is concentrated over the left side.',
      mistake: 'Calling one-sided slowing a whole-brain problem.'
    },
    23: {
      shortTitle: 'Repeating side',
      guide: 'Repetition can raise risk.',
      cards: [
        c('Repetition changes concern.', 'A sharp wave that keeps returning deserves attention.', 'story', [['Repeating', 'returning again and again']]),
        c('Side matters again.', 'If repetition stays on one side, that side is active.', 'side', [['Active side', 'side with repeated events']]),
        c('Regular is not always harmless.', 'Some dangerous patterns repeat steadily.', 'story', [['Steady pace', 'similar time gap each time']])
      ],
      question: 'Tap the active side.',
      verdict: 'Right-side repeating waves',
      subtitle: 'The right side keeps producing them.',
      why: 'The activity repeats over the right side at a steady interval.',
      mistake: 'Dismissing repeated sharp waves because they look too regular.'
    },
    24: {
      shortTitle: 'Changing event',
      guide: 'A seizure changes over time.',
      cards: [
        c('A seizure is a story.', 'It has a beginning, changes, and then ends.', 'story', [['Seizure', 'abnormal brain activity that evolves']]),
        c('Evolution means change.', 'Watch speed, size, and spread over time.', 'speed', [['Evolution', 'change over time']]),
        c('One clue is not enough.', 'A steady rhythm is less convincing than a changing one.', 'story', [['Steady', 'not changing much']])
      ],
      question: 'Watch the changing rhythm, then reveal.',
      verdict: 'Seizure evolution',
      subtitle: 'The rhythm changes in several ways.',
      why: 'It starts small, builds, spreads, and then slows down.',
      mistake: 'Calling a steady unchanged rhythm a seizure.'
    },
    25: {
      shortTitle: 'Start point',
      guide: 'Start beats spread.',
      cards: [
        c('Onset means start.', 'The onset is where the event begins.', 'story', [['Onset', 'where the event starts']]),
        c('Spread can be louder.', 'The biggest late signal may not be the start.', 'spread', [['Spread', 'movement after the start']], { focusX: '68%' }),
        c('Use the first change.', 'Find the earliest rhythm change before choosing a location.', 'spread', [['First change', 'earliest new activity']], { focusX: '38%' }),
        c('Here, watch T3.', 'T3 is the left temporal sensor you decoded earlier.', 'code', [['T3', 'left temporal sensor']], { parts: ['T', '3'], labels: ['side', 'left'] })
      ],
      question: 'Tap where it starts.',
      verdict: 'Left temporal start',
      subtitle: 'The first change appears at T3.',
      why: 'The rhythm begins at T3 before it spreads elsewhere.',
      mistake: 'Choosing the largest late wave instead of the earliest change.'
    },
    26: {
      shortTitle: 'Three phases',
      guide: 'The trace has phases.',
      cards: [
        c('A convulsion has phases.', 'The EEG can move through a clear sequence.', 'story', [['Phase', 'one part of a sequence']]),
        c('Fast, rhythmic, quiet.', 'Fast activity comes first, rhythmic bursts follow, then quiet.', 'story', [['Quiet after', 'brief quiet period afterward']]),
        c('The quiet part matters.', 'The after-quiet helps confirm the sequence.', 'line', [['After-quiet', 'quiet trace after the event']])
      ],
      question: 'Watch the sequence, then reveal.',
      verdict: 'Convulsive seizure sequence',
      subtitle: 'Fast, rhythmic, then quiet.',
      why: 'The phase sequence supports a true convulsive seizure pattern.',
      mistake: 'Stopping the recording before the quiet after-phase appears.'
    },
    27: {
      shortTitle: 'Quiet body',
      guide: 'The EEG may still be active.',
      cards: [
        c('Movement can stop before EEG stops.', 'A patient may look still while the trace remains active.', 'report', [['Unresponsive', 'awake but not responding']]),
        c('No shaking is not enough.', 'Seizure activity can continue without large movements.', 'spread', [['Nonconvulsive', 'without large convulsions']], { focusX: '52%' }),
        c('Patient plus trace decides urgency.', 'Unresponsive patient plus continuous seizure waves is urgent.', 'report', [['Urgent', 'needs immediate attention']])
      ],
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
      cards: [
        c('Sick brains make look-alikes.', 'Whole-body illness can create seizure-like waves.', 'report', [['Look-alike', 'pattern that resembles danger']]),
        c('Use the patient story.', 'A metabolic illness can change the meaning of the trace.', 'report', [['Metabolic', 'body chemistry related']]),
        c('Front-heavy waves are a clue.', 'Broad waves strongest in front can fit illness-related brain stress.', 'spread', [['Front-heavy', 'largest near forehead sensors']], { focusX: '28%' })
      ],
      question: 'Where are these waves strongest?',
      verdict: 'Front strongest',
      subtitle: 'The front leads the pattern.',
      why: 'The broad front-heavy pattern fits illness-related brain stress in the right context.',
      mistake: 'Treating every seizure look-alike as a seizure.'
    },
    29: {
      shortTitle: 'Over-call trap',
      guide: 'Do not rush the label.',
      cards: [
        c('Over-call means too much alarm.', 'It happens when a harmless pattern is called dangerous.', 'story', [['Over-call', 'calling harmless dangerous']]),
        c('The wicket returns.', 'Temporal sharp-looking runs without a slow tail can be harmless.', 'story', [['Wicket', 'harmless temporal look-alike']]),
        c('Repeat the safety check.', 'Shape, tail, state, and patient story all matter.', 'report', [['Safety check', 'clues before the label']])
      ],
      question: 'Temporal run with no slow tail:',
      optionLabels: ['Epilepsy spike', 'Wicket wave'],
      verdict: 'Wicket wave',
      subtitle: 'A harmless sharp-looking run.',
      why: 'The run has the common harmless shape and no slow tail.',
      mistake: 'Creating a false epilepsy label from a benign pattern.'
    },
    30: {
      shortTitle: 'Final meaning',
      guide: 'Answer the patient question.',
      cards: [
        c('A report is an answer.', 'It should say what the trace means for this patient.', 'report', [['Report', 'written EEG answer']]),
        c('Same waveform, different person.', 'A child and a confused adult can need different conclusions.', 'compare', [['Context', 'patient story around the trace']]),
        c('Combine the clues.', 'Location, rhythm, change, artifact, and patient story all join here.', 'report', [['Impression', 'final meaning of the EEG']])
      ],
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

  Object.keys(COURSE_REWRITE).forEach(function (id) {
    if (!LESSONS[id]) return;
    Object.assign(LESSONS[id], COURSE_REWRITE[id]);
  });

  var EXTENDED_COURSE = {
    31: {
      shortTitle: 'Landmarks',
      guide: 'Start from fixed points.',
      cards: [
        c('The cap needs anchors.', 'Sensors are placed from landmarks anyone can find.', 'landmarks', [['Landmark', 'reliable body point']]),
        c('Nasion is front.', 'The nasion sits at the bridge of the nose.', 'landmarks', [['Nasion', 'bridge of the nose']]),
        c('Inion is back.', 'The inion is the bony bump at the back.', 'landmarks', [['Inion', 'bony back bump']])
      ],
      question: 'The front-to-back measurement starts at:',
      optionLabels: ['Temple to temple', 'Nose bridge to back bump'],
      visual: { kind: 'head-diagram', config: { targets: ['Fp1', 'O1'] } },
      verdict: 'Nose bridge to back bump',
      subtitle: 'Nasion to inion.',
      why: 'Those two landmarks anchor the front-back head measurement.',
      mistake: 'Starting the map from a vague hairline.'
    },
    32: {
      shortTitle: 'Ear points',
      guide: 'Side-to-side needs anchors.',
      cards: [
        c('There is a side line too.', 'The cap also needs a left-to-right measurement.', 'landmarks', [['Side line', 'left-to-right head measure']], { mode: 'ears' }),
        c('Use ear landmarks.', 'Preauricular points sit just in front of each ear.', 'landmarks', [['Preauricular', 'just before the ear']], { mode: 'ears' }),
        c('Now the map has two axes.', 'Front-back and side-side lines can cross.', 'intersections', [['Axis', 'a measured direction']])
      ],
      question: 'The side-to-side measurement uses points near the:',
      optionLabels: ['Eyes', 'Ears'],
      visual: { kind: 'head-diagram', config: { targets: ['T3', 'T4'] } },
      verdict: 'Ears',
      subtitle: 'Preauricular points sit by the ears.',
      why: 'Those side landmarks anchor the left-right measurement.',
      mistake: 'Using the eyes as the side anchor.'
    },
    33: {
      shortTitle: '10-20',
      guide: 'The name comes from measurement.',
      cards: [
        c('The map is measured.', 'Distances are divided into percentage steps.', 'measure', [['Percent step', 'part of a measured distance']]),
        c('Ten and twenty are steps.', 'The marks use 10% and 20% intervals.', 'measure', [['10-20', 'percentage placement system']]),
        c('This makes caps reproducible.', 'Different heads can use the same placement rule.', 'intersections', [['Reproducible', 'repeatable across patients']])
      ],
      question: 'In 10-20, the 10 and 20 are:',
      optionLabels: ['Channel counts', 'Measurement percentages'],
      visual: { kind: 'head-diagram', config: { targets: ['F3', 'C3', 'P3'] } },
      verdict: 'Measurement percentages',
      subtitle: 'The map is built from measured distances.',
      why: 'Marks are placed at 10% and 20% intervals.',
      mistake: 'Treating 10-20 as only a list of names.'
    },
    34: {
      shortTitle: 'Crossings',
      guide: 'Sensors sit where lines cross.',
      cards: [
        c('Measured lines cross.', 'Front-back and side-side marks create intersections.', 'intersections', [['Intersection', 'where two measured lines meet']]),
        c('Intersections become sensor spots.', 'The final electrodes are placed at those crossings.', 'intersections', [['Electrode', 'sensor placed on the scalp']]),
        c('This is why the cap is a map.', 'Placement is measured before recording begins.', 'intersections', [['Cap map', 'measured sensor layout']])
      ],
      question: 'Watch how measured lines create sensor positions.',
      visual: { kind: 'head-diagram', config: { targets: ['F3', 'C3', 'P3', 'F4', 'C4', 'P4'] } },
      verdict: 'Measured crossings',
      subtitle: 'The cap is a map, not a guess.',
      why: 'Electrodes are placed where measured head-map lines intersect.',
      mistake: 'Thinking sensors are placed by eye.'
    },
    35: {
      shortTitle: 'Near middle',
      guide: 'Numbers also hint distance.',
      cards: [
        c('Numbers tell side first.', 'Odd is left. Even is right.', 'side', [['Odd', 'left'], ['Even', 'right']]),
        c('Lower often means nearer middle.', 'C4 is closer to the middle than T8.', 'code', [['Lower number', 'nearer the midline']], { parts: ['C4', 'T8'], labels: ['nearer', 'farther'] }),
        c('Midline is the center path.', 'Use it as the middle of the map.', 'midline', [['Midline', 'center path of the head']])
      ],
      question: 'Which is closer to the middle?',
      optionLabels: ['T8', 'C4'],
      visual: { kind: 'head-diagram', config: { targets: ['C4', 'T4'] } },
      verdict: 'C4',
      subtitle: 'Lower numbers tend to sit nearer the midline.',
      why: 'T8 is farther out on the side of the head.',
      mistake: 'Using number only for left-right.'
    },
    36: {
      shortTitle: 'Z line',
      guide: 'Z marks the middle.',
      cards: [
        c('Some sensors are neither side.', 'They sit on the middle line.', 'midline', [['Middle line', 'center path of the head']]),
        c('Z means zero side.', 'Fz, Cz, and Pz sit on the midline.', 'code', [['z', 'midline marker']], { parts: ['C', 'z'], labels: ['center', 'midline'] }),
        c('Midline helps orientation.', 'It separates left from right.', 'midline', [['Cz', 'center sensor']])
      ],
      question: 'Cz sits on the:',
      optionLabels: ['Right side', 'Middle line'],
      visual: { kind: 'head-diagram', config: { targets: ['Cz'] } },
      verdict: 'Middle line',
      subtitle: 'z means the midline.',
      why: 'Midline sensors are neither odd-left nor even-right.',
      mistake: 'Reading z as a side number.'
    },
    37: {
      shortTitle: 'Channel',
      guide: 'One displayed comparison.',
      cards: [
        c('EEG compares inputs.', 'A displayed line often shows a difference.', 'compare', [['Difference', 'one signal minus another']]),
        c('Two inputs become one line.', 'That output line is a channel.', 'line', [['Channel', 'one displayed EEG line']]),
        c('Derivation means the same idea.', 'It is another word for the displayed comparison.', 'code', [['Derivation', 'one channel comparison']], { parts: ['A', 'B'], labels: ['input', 'input'] })
      ],
      question: 'A channel is best thought of as:',
      optionLabels: ['The whole cap', 'One displayed comparison'],
      visual: compare('normal_awake', 'normal_awake', 'input one', 'input two'),
      verdict: 'One displayed comparison',
      subtitle: 'Two inputs become one line.',
      why: 'The displayed line is the output of a comparison.',
      mistake: 'Thinking one channel always means one raw electrode.'
    },
    38: {
      shortTitle: 'Chain',
      guide: 'Channels can link.',
      cards: [
        c('Channels can be ordered.', 'A page can link neighboring comparisons in a row.', 'story', [['Order', 'how channels are stacked']]),
        c('A chain follows a path.', 'It can move from front to side to back.', 'regions', [['Chain', 'linked row of channels']], { region: 'side' }),
        c('Chains help localization.', 'Read neighboring lines together.', 'spread', [['Neighboring lines', 'lines next to each other']])
      ],
      question: 'A chain is:',
      optionLabels: ['One isolated sensor', 'A linked row of channels'],
      visual: multi('normal_awake', ['Fp2', 'F4', 'C4', 'O2'], ['F4', 'C4']),
      verdict: 'Linked row of channels',
      subtitle: 'The page is organized in chains.',
      why: 'A chain lets you follow activity across neighboring sensor pairs.',
      mistake: 'Reading each line without its neighbors.'
    },
    39: {
      shortTitle: 'Page order',
      guide: 'The page mirrors the head.',
      cards: [
        c('A full page has sections.', 'Chains are stacked in a known order.', 'report', [['Section', 'group of related channels']]),
        c('Left and right are grouped.', 'Temporal and parasagittal chains sit in page order.', 'side', [['Parasagittal', 'near-midline chain']]),
        c('Do not read random lines.', 'Use the display order to keep your place.', 'story', [['Page order', 'where chains appear']])
      ],
      question: 'Watch the page as chains are stacked from left to right.',
      visual: multi('normal_awake', ['Fp1', 'F3', 'C3', 'O1', 'Fp2', 'F4', 'C4', 'O2'], ['C3', 'C4']),
      verdict: 'Organized page',
      subtitle: 'The display mirrors the head map.',
      why: 'The chain order helps you locate patterns across the cap.',
      mistake: 'Treating the page order as random.'
    },
    40: {
      shortTitle: 'ECG line',
      guide: 'The heart gets its own line.',
      cards: [
        c('Not every line is brain.', 'Some pages include a heart channel.', 'line', [['ECG', 'heart rhythm line']]),
        c('Use it for timing.', 'Regular sharp EEG marks can match the heartbeat.', 'timing', [['Timing match', 'same time as ECG']]),
        c('This prevents overcalling.', 'Heart artifact can look sharp on EEG.', 'timing', [['Heart artifact', 'heart signal on EEG']])
      ],
      question: 'The bottom ECG channel helps check:',
      optionLabels: ['Hair thickness', 'Heartbeat timing'],
      visual: multi('cardiac', ['C3', 'C4', 'T3', 'T4', 'O1', 'O2'], ['T3', 'T4']),
      verdict: 'Heartbeat timing',
      subtitle: 'It helps separate brain from heart artifact.',
      why: 'Regular EEG marks can be compared with the ECG rhythm.',
      mistake: 'Ignoring ECG when sharp marks repeat regularly.'
    },
    41: {
      shortTitle: 'Average view',
      guide: 'Another comparison style.',
      cards: [
        c('Neighbor pairs are one view.', 'Bipolar display compares nearby sensors.', 'compare', [['Bipolar', 'neighbor-pair view']]),
        c('Average view is different.', 'It compares one sensor with the head average.', 'sensor', [['Average reference', 'sensor compared with head average']]),
        c('Both are montages.', 'A montage is a way to draw the same EEG data.', 'compare', [['Montage', 'display view']])
      ],
      question: 'Average reference compares a sensor with:',
      optionLabels: ['Only the next sensor', 'The head average'],
      visual: compare('focal_spike', 'focal_spike', 'neighbor pairs', 'head average'),
      verdict: 'The head average',
      subtitle: 'It is another montage view.',
      why: 'Different views can reveal different parts of the same signal.',
      mistake: 'Assuming one display view is the only truth.'
    },
    42: {
      shortTitle: 'Choose view',
      guide: 'No view is neutral.',
      cards: [
        c('The same EEG can look different.', 'Changing the montage changes the picture.', 'compare', [['View choice', 'selected display method']]),
        c('Views have strengths.', 'One may show location better. Another may show shape better.', 'story', [['Strength', 'what a view shows well']]),
        c('Check view before judging.', 'Interpretation starts with the display method.', 'report', [['Display method', 'how the page is drawn']])
      ],
      question: 'Before interpreting, first check:',
      optionLabels: ['The patient initials only', 'The display view'],
      visual: compare('normal_awake', 'focal_spike', 'view one', 'view two'),
      verdict: 'The display view',
      subtitle: 'The montage shapes the picture.',
      why: 'The same signal can look different in different montages.',
      mistake: 'Interpreting without knowing the display.'
    },
    43: {
      shortTitle: 'Eye dipole',
      guide: 'Eyes have polarity.',
      cards: [
        c('The eye is electrical too.', 'The front and back of the eye have different charge.', 'dipole', [['Dipole', 'two-sided electrical source']]),
        c('Cornea is front.', 'The cornea is relatively positive.', 'regions', [['Cornea', 'front of the eye']], { region: 'front' }),
        c('Retina is back.', 'The retina is relatively negative.', 'regions', [['Retina', 'back of the eye']], { region: 'back' })
      ],
      question: 'The front of the eye is the:',
      optionLabels: ['Retina', 'Cornea'],
      visual: multi('eye_blink', ['Fp1', 'Fp2', 'O1', 'O2'], ['Fp1', 'Fp2']),
      verdict: 'Cornea',
      subtitle: 'The cornea is relatively positive.',
      why: 'Eye movement creates signal because the eye has polarity.',
      mistake: 'Treating eye movement as only mechanical motion.'
    },
    44: {
      shortTitle: 'Blink field',
      guide: 'Blinks are front-heavy.',
      cards: [
        c('A blink moves the eye upward.', 'This normal movement is called Bell phenomenon.', 'story', [['Bell phenomenon', 'eyes roll upward during blink']]),
        c('Front sensors feel it most.', 'Fp1 and Fp2 sit closest to the eyes.', 'regions', [['Fp', 'front-polar sensors']], { region: 'front' }),
        c('Both front lines jump.', 'A blink creates a large frontal deflection.', 'spread', [['Deflection', 'large line movement']], { focusX: '28%' })
      ],
      question: 'A blink is largest near:',
      optionLabels: ['Back sensors', 'Front sensors'],
      visual: multi('eye_blink', ['Fp1', 'Fp2', 'O1', 'O2'], ['Fp1', 'Fp2']),
      verdict: 'Front sensors',
      subtitle: 'The eyes sit in front.',
      why: 'The upward eye movement projects strongly to Fp1 and Fp2.',
      mistake: 'Calling a blink a frontal brain wave.'
    },
    45: {
      shortTitle: 'Eyes closed',
      guide: 'Alpha has a state.',
      cards: [
        c('Alpha is wakeful.', 'It is common during relaxed wakefulness.', 'speed', [['Alpha', 'relaxed awake rhythm']]),
        c('Eyes closed brings it out.', 'Alpha is often stronger when the eyes are closed.', 'story', [['Eyes closed', 'relaxed resting state']]),
        c('Look posteriorly.', 'The back sensors often show alpha best.', 'regions', [['Posterior', 'toward the back']], { region: 'back' })
      ],
      question: 'Alpha is commonly strongest when eyes are:',
      optionLabels: ['Open and scanning', 'Closed and relaxed'],
      visual: multi('normal_awake', ['Fp1', 'Fp2', 'F3', 'F4', 'O1', 'O2'], ['O1', 'O2']),
      verdict: 'Closed and relaxed',
      subtitle: 'A relaxed eyes-closed state brings it out.',
      why: 'Alpha is a normal wakeful rhythm that is often posterior and around 10 Hz.',
      mistake: 'Calling normal alpha abnormal.'
    },
    46: {
      shortTitle: 'Left temporal',
      guide: 'Find the maximum.',
      cards: [
        c('Focal means one main area.', 'A focal abnormality has a strongest region.', 'spread', [['Focal', 'one main area']], { focusX: '38%' }),
        c('Temporal means side head.', 'T sensors sit near the temples.', 'regions', [['Temporal', 'side of the head']], { region: 'side' }),
        c('Name side and region.', 'Left temporal means left side-head area.', 'code', [['T3', 'left temporal sensor']], { parts: ['T', '3'], labels: ['temporal', 'left'] })
      ],
      question: 'Tap the left temporal maximum.',
      visual: multi('focal_spike', ['F3', 'C3', 'T3', 'O1', 'F4', 'T4'], ['T3']),
      verdict: 'Left temporal maximum',
      subtitle: 'T3 sits in the left temporal region.',
      why: 'The strongest abnormality is in the left temporal chain.',
      mistake: 'Choosing later spread instead of the maximum field.'
    },
    47: {
      shortTitle: 'Right posterior',
      guide: 'Back-right can be maximal.',
      cards: [
        c('Posterior means back.', 'Posterior sensors sit toward the rear head.', 'regions', [['Posterior', 'back of the head']], { region: 'back' }),
        c('Right uses even numbers.', 'O2 is right because 2 is even.', 'code', [['O2', 'right posterior sensor']], { parts: ['O', '2'], labels: ['back', 'right'] }),
        c('Find the maximal field.', 'Look for the strongest back-right activity.', 'spread', [['Maximal field', 'strongest spread area']], { focusX: '68%' })
      ],
      question: 'Tap the right posterior maximum.',
      visual: multi('focal_spike', ['F3', 'C3', 'T3', 'O1', 'F4', 'T4', 'O2'], ['O2']),
      verdict: 'Right posterior maximum',
      subtitle: 'O2 is the back-right sensor.',
      why: 'The maximal field is posterior and right-sided.',
      mistake: 'Naming back activity without checking side.'
    },
    48: {
      shortTitle: 'Whole head',
      guide: 'Some bursts start everywhere.',
      cards: [
        c('Generalized means broad.', 'The burst involves both sides together.', 'side', [['Generalized', 'both sides together']]),
        c('It is not spread from one point.', 'The whole-head pattern starts broadly.', 'spread', [['Synchronous', 'at the same time']], { focusX: '50%' }),
        c('A run can fill the page.', 'Several seconds of repeated bursts can appear.', 'story', [['Run', 'repeating pattern over time']])
      ],
      question: 'Watch the broad run across both sides.',
      visual: multi('generalized_sw', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['Fp1', 'Fp2', 'F3', 'F4']),
      verdict: 'Whole-head burst',
      subtitle: 'Both sides are involved together.',
      why: 'The activity appears broadly rather than starting from one focal center.',
      mistake: 'Forcing a focal source onto a broad pattern.'
    },
    49: {
      shortTitle: 'Normal can miss',
      guide: 'Yield is probability.',
      cards: [
        c('EEG does not catch everything.', 'A person with epilepsy can have a normal routine EEG.', 'report', [['Yield', 'chance a test finds something']]),
        c('Timing matters.', 'Within 24 hours of a first seizure, yield is about half.', 'story', [['About half', 'roughly 50%']]),
        c('Normal does not end the story.', 'History still matters after a normal EEG.', 'report', [['Normal EEG', 'no abnormality seen in recording']])
      ],
      question: 'A normal routine EEG after a seizure means epilepsy is:',
      optionLabels: ['Impossible', 'Still possible'],
      visual: { kind: 'report', report: { tabs: ['History', 'EEG', 'Meaning'], rows: [['History', 'First seizure.'], ['EEG', 'Routine study normal.'], ['Meaning', 'Epilepsy still possible.']] } },
      verdict: 'Still possible',
      subtitle: 'Routine EEG can miss it.',
      why: 'A single routine EEG may find epileptiform activity only about half the time.',
      mistake: 'Using one normal EEG to rule out epilepsy.'
    },
    50: {
      shortTitle: 'More time',
      guide: 'Longer recording helps.',
      cards: [
        c('Abnormalities come and go.', 'More time gives more chances to catch them.', 'story', [['Intermittent', 'appears only sometimes']]),
        c('Twenty-four hours improves yield.', 'Longer EEG can catch many missed discharges.', 'report', [['80-90%', 'common prolonged EEG yield range']]),
        c('Still not perfect.', 'Even prolonged EEG can be normal in epilepsy.', 'report', [['Not perfect', 'cannot rule out every case']])
      ],
      question: 'A 24-hour EEG is more likely to catch discharges because it records:',
      optionLabels: ['More channels only', 'More time'],
      visual: { kind: 'report', report: { tabs: ['Routine', 'Longer', 'Limit'], rows: [['Routine', 'Shorter chance.'], ['Longer', 'More time to catch events.'], ['Limit', 'Still can be normal.']] } },
      verdict: 'More time',
      subtitle: 'More time raises yield.',
      why: 'Epileptiform activity can be intermittent, so longer recordings catch more chances.',
      mistake: 'Assuming more time makes EEG perfect.'
    },
    51: {
      shortTitle: 'Repeat EEG',
      guide: 'More chances help.',
      cards: [
        c('A short test is a snapshot.', 'It only records what happens during that window.', 'story', [['Snapshot', 'limited time sample']]),
        c('Repeats add windows.', 'Several routine EEGs can approach longer-recording yield.', 'report', [['Repeat study', 'another recording session']]),
        c('Practicality matters.', 'Many short tests may be less practical than one long test.', 'report', [['Practical', 'reasonable to do']])
      ],
      question: 'Repeating routine EEGs can help because abnormalities are often:',
      optionLabels: ['Always present', 'Intermittent'],
      visual: { kind: 'report', report: { tabs: ['Test 1', 'Test 2', 'Test 3'], rows: [['Window', 'Different time.'], ['Chance', 'Another opportunity.'], ['Meaning', 'Yield can increase.']] } },
      verdict: 'Intermittent',
      subtitle: 'They may appear only sometimes.',
      why: 'More recording opportunities can reveal activity missed before.',
      mistake: 'Treating EEG yield as all-or-nothing.'
    },
    52: {
      shortTitle: 'Source area',
      guide: 'Size affects visibility.',
      cards: [
        c('Scalp sensors are distant.', 'They listen from outside the skull.', 'sensor', [['Scalp EEG', 'recording from scalp sensors']]),
        c('Small sources can hide.', 'A tiny active cortex area may not reach the scalp clearly.', 'spread', [['Cortex', 'outer brain surface']], { focusX: '50%' }),
        c('Larger areas are easier.', 'More synchronized cortex creates a stronger scalp field.', 'spread', [['Synchronized', 'active together']], { focusX: '50%' })
      ],
      question: 'A very small abnormal brain area is:',
      optionLabels: ['Always visible on scalp EEG', 'Sometimes missed'],
      visual: { kind: 'frequency-scope', config: { highlightBand: 0 } },
      verdict: 'Sometimes missed',
      subtitle: 'The scalp signal may be too small.',
      why: 'Enough synchronized cortex must be involved to reach scalp electrodes consistently.',
      mistake: 'Assuming scalp EEG sees every abnormal neuron group.'
    },
    53: {
      shortTitle: 'Area threshold',
      guide: 'A sizable area helps.',
      cards: [
        c('Detection needs enough area.', 'Small points may disappear before reaching the scalp.', 'spread', [['Detection', 'signal becoming visible']], { focusX: '50%' }),
        c('Think ten to twenty.', 'Roughly 10-20 square centimeters may be needed consistently.', 'code', [['10-20 cm²', 'rough scalp visibility estimate']], { parts: ['10', '20'], labels: ['cm²', 'cm²'] }),
        c('This is a limitation.', 'A normal scalp EEG can miss small sources.', 'report', [['Limitation', 'what a test may miss']])
      ],
      question: 'Consistent scalp detection usually needs a:',
      optionLabels: ['Tiny point source', 'Sizable cortical area'],
      visual: { kind: 'frequency-scope', config: { highlightBand: 1 } },
      verdict: 'Sizable cortical area',
      subtitle: 'Area helps the signal reach the scalp.',
      why: 'A larger synchronized area creates a stronger scalp field.',
      mistake: 'Expecting scalp EEG to detect every tiny source.'
    },
    54: {
      shortTitle: 'Deep sources',
      guide: 'Distance weakens signal.',
      cards: [
        c('Location matters too.', 'Surface sources are easier for scalp sensors.', 'sensor', [['Surface source', 'nearer the scalp']]),
        c('Deep sources can hide.', 'Mesial temporal, insular, or singulate activity may be harder to see.', 'spread', [['Deep source', 'farther from scalp sensors']], { focusX: '50%' }),
        c('Normal scalp EEG has limits.', 'Deep seizure sources can still exist.', 'report', [['Distance', 'space between source and sensor']])
      ],
      question: 'Deep brain activity is often:',
      optionLabels: ['Easier to see', 'Harder to see'],
      visual: { kind: 'frequency-scope', config: { highlightBand: 2 } },
      verdict: 'Harder to see',
      subtitle: 'Distance weakens the scalp field.',
      why: 'Scalp electrodes sit far from deep structures.',
      mistake: 'Assuming normal scalp EEG excludes deep sources.'
    },
    55: {
      shortTitle: 'Limits',
      guide: 'A test needs context.',
      cards: [
        c('Normal is not always no disease.', 'EEG can miss small, deep, or intermittent activity.', 'report', [['False negative', 'test misses real disease']]),
        c('Interpret with history.', 'The patient story changes how much a normal EEG means.', 'report', [['History', 'clinical story']]),
        c('State the limit clearly.', 'A good report says what the test can and cannot show.', 'report', [['Limit statement', 'what result cannot rule out']])
      ],
      question: 'A normal scalp EEG should be read with:',
      optionLabels: ['No clinical context', 'Clinical context'],
      visual: { kind: 'report', report: { tabs: ['Trace', 'Limits', 'Context'], rows: [['Trace', 'No abnormality seen.'], ['Limits', 'Small/deep sources can hide.'], ['Context', 'History still matters.']] } },
      verdict: 'Clinical context',
      subtitle: 'The test has limits.',
      why: 'Timing, source size, and source depth all affect what scalp EEG can show.',
      mistake: 'Overpromising what a normal EEG can rule out.'
    },
    56: {
      shortTitle: 'Full cap blink',
      guide: 'Use the whole page.',
      cards: [
        c('Now read a full cap clue.', 'Start with where the biggest change appears.', 'spread', [['Full cap', 'many sensors shown together']], { focusX: '28%' }),
        c('Front plus blink means eye.', 'Fp1 and Fp2 are closest to the eyes.', 'regions', [['Fp1/Fp2', 'front-polar sensors']], { region: 'front' }),
        c('Do not overcall artifact.', 'If the field fits the eyes, name eye artifact.', 'report', [['Field fit', 'pattern matches the source']])
      ],
      question: 'Full cap case: biggest wave at Fp1/Fp2 during blink. Most likely:',
      optionLabels: ['Occipital seizure', 'Eye artifact'],
      visual: { kind: 'cap-trace', preset: 'eye_blink', config: { channels: [0, 1, 2, 3, 4, 5, 8, 9], highlight: [0, 1], targets: ['Fp1', 'Fp2'], header: 'blink field', measure: 'front maximum' } },
      verdict: 'Eye artifact',
      subtitle: 'Front field plus eye movement.',
      why: 'The field is maximal at the frontal polar sensors closest to the eyes.',
      mistake: 'Calling a frontal artifact a brain event.'
    },
    57: {
      shortTitle: 'Full cap view',
      guide: 'Know the montage first.',
      cards: [
        c('Full cap pages are organized.', 'Lines belong to chains and a display view.', 'report', [['Full cap page', 'many organized EEG lines']]),
        c('Montage comes before location.', 'A line means different things in different views.', 'compare', [['Montage', 'display view']]),
        c('Then find the region.', 'Use the chain order to avoid getting lost.', 'story', [['Chain order', 'where channel groups sit']])
      ],
      question: 'Before localizing a full cap pattern, first check:',
      optionLabels: ['Only the largest line', 'The montage and chain'],
      visual: { kind: 'cap-trace', preset: 'normal_awake', config: { channels: [0, 2, 4, 6, 8, 1, 3, 5, 7, 9], targets: ['Fp1', 'T3', 'O1', 'Fp2', 'T4', 'O2'], header: 'chain order', measure: 'read top to bottom' } },
      verdict: 'Montage and chain',
      subtitle: 'The display determines what each line means.',
      why: 'A full cap page is organized by linked channel chains.',
      mistake: 'Localizing from one line without knowing the display.'
    },
    58: {
      shortTitle: 'Full cap field',
      guide: 'Find the maximum.',
      cards: [
        c('Scan the full field.', 'Find the strongest region and its neighbors.', 'spread', [['Full field', 'spread across the cap']], { focusX: '38%' }),
        c('Name side and region.', 'Left temporal is different from right posterior.', 'regions', [['Side-region label', 'left/right plus head area']], { region: 'side' }),
        c('Tap the maximum.', 'The maximum is the best first localization clue.', 'spread', [['Maximum', 'strongest point']], { focusX: '38%' })
      ],
      question: 'Full cap case: tap the focal maximum.',
      visual: { kind: 'cap-trace', preset: 'focal_spike', config: { channels: [2, 4, 6, 8, 3, 5, 7, 9], highlight: [6], targets: ['T3'], header: 'field maximum', measure: 'strongest channel' } },
      verdict: 'Left temporal maximum',
      subtitle: 'T3 is the center of the field.',
      why: 'The strongest activity sits in the left temporal region with surrounding spread.',
      mistake: 'Choosing a region that only shows later spread.'
    },
    59: {
      shortTitle: 'Full cap broad',
      guide: 'Check if both sides start together.',
      cards: [
        c('Not all bursts are focal.', 'Some begin across the whole cap.', 'side', [['Broad onset', 'many regions begin together']]),
        c('Three per second is a rhythm.', 'A repeated spike-wave run can be generalized.', 'speed', [['Spike-wave run', 'repeating spike plus slow wave']]),
        c('Start pattern decides.', 'Broad at onset is not the same as spread later.', 'story', [['At onset', 'from the beginning']])
      ],
      question: 'Count the waves inside the 1-second bracket. This run is:',
      optionLabels: ['Focal onset', 'Generalized pattern'],
      visual: { kind: 'cap-trace', preset: 'generalized_sw', config: { channels: [0, 1, 2, 3, 4, 5, 6, 7], highlight: [0, 1, 2, 3, 4, 5], targets: ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], header: 'generalized run', measure: '1 second · about 3 waves' } },
      verdict: 'Generalized pattern',
      subtitle: 'Both sides begin together.',
      why: 'The run involves the whole head at onset rather than spreading from one point.',
      mistake: 'Forcing a focal source on a broad synchronous pattern.'
    },
    60: {
      shortTitle: 'Full cap report',
      guide: 'Answer the clinical question.',
      cards: [
        c('Final cases combine everything.', 'Use location, rhythm, artifact checks, and patient story.', 'report', [['Synthesis', 'combining clues']]),
        c('The patient changes urgency.', 'A confused adult is different from a well child.', 'report', [['Urgency', 'how quickly action is needed']]),
        c('Write the practical meaning.', 'The final answer should guide care.', 'report', [['Final impression', 'practical report answer']])
      ],
      question: 'Measure the run, then use the story. Best final meaning:',
      optionLabels: ['Normal awake rhythm', 'Emergency seizure state'],
      visual: { kind: 'cap-trace', preset: 'generalized_sw', config: { channels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], highlight: [0, 1, 2, 3, 4, 5, 6, 7], targets: ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'T3', 'T4'], header: 'confused adult', measure: 'continuous run' } },
      verdict: 'Emergency seizure state',
      subtitle: 'Trace plus patient story changes urgency.',
      why: 'Continuous seizure waves in an unresponsive or confused adult are urgent.',
      mistake: 'Naming only the waveform and ignoring the clinical question.'
    }
  };

  Object.keys(EXTENDED_COURSE).forEach(function (id) {
    LESSONS[id] = EXTENDED_COURSE[id];
  });

  global.EEG_LESSON_META = LESSONS;

}(window));
