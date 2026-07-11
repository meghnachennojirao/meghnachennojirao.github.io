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
      question: 'A phase reversal most directly marks what?',
      optionLabels: ['Proven cortical source', 'Local scalp maximum or minimum'],
      visual: compare('focal_spike', 'focal_spike', 'Referential', 'Bipolar'),
      verdict: 'Local scalp maximum or minimum',
      subtitle: 'The reversal describes a scalp voltage extremum.',
      why: 'Opposite deflections in adjacent bipolar channels place an extremum at the shared electrode, not a unique cortical source.',
      mistake: 'Check montage, polarity, field, and electrode quality before localizing.'
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
      question: 'A 5 Hz high-pass most attenuates what?',
      optionLabels: ['Fast', 'Slow'],
      visual: compare('normal_awake', 'diffuse_slowing', 'Before', 'After'),
      verdict: 'Slow activity',
      subtitle: 'A 5 Hz setting markedly attenuates slow waves.',
      why: 'Filters have a roll-off: delta and lower theta are attenuated and may be distorted rather than uniformly erased.',
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
      guide: 'Context prevents misclassification.',
      question: 'Awake, asymptomatic, no slowing?',
      optionLabels: ['NCSE from rhythm alone', 'SREDA after context review'],
      visual: compare('drowsy', 'temporal_seizure', 'No evolution', 'Evolution'),
      verdict: 'Benign variant',
      subtitle: 'No symptoms and no post-ictal slowing.',
      why: 'SREDA is sustained rhythmic activity without clinical change.',
      mistake: 'Do not classify SREDA as NCSE from rhythm appearance alone.'
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
      subtitle: 'Temporalis muscle often affects T7/T8 (legacy T3/T4).',
      why: 'Muscle artifact is irregular, fast, and strongest over lateral leads.',
      mistake: 'Fast activity from jaw tension is not fast ictal activity.'
    },
    16: {
      shortTitle: 'Cardiac',
      guide: 'Check timing against the ECG.',
      question: 'Tap the QRS-locked artifact.',
      visual: multi('cardiac', ['C3', 'C4', 'T3', 'T4', 'O1', 'O2'], ['T3', 'T4']),
      verdict: 'Cardiac artifact',
      subtitle: 'QRS time-locking supports cardiac artifact.',
      why: 'A consistent relationship to each QRS complex is stronger evidence than regularity alone.',
      mistake: 'Cerebral periodic activity can be regular; confirm with ECG and montage review.'
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
      guide: 'A limited field raises uncertainty.',
      question: 'Only F8 spikes?',
      optionLabels: ['IED', 'Electrode'],
      visual: { kind: 'head-diagram', config: { targets: ['F8'] } },
      verdict: 'Electrode artifact',
      subtitle: 'Artifact is favored, not proven.',
      why: 'An isolated transient favors a technical problem but requires impedance, montage, and physiologic-channel checks.',
      mistake: 'Do not make a definite cerebral or artifact call from one displayed channel.'
    },
    19: {
      shortTitle: 'IED criteria',
      guide: 'Use all six IFCN features.',
      visual: single('focal_spike', 'T3', 'after-wave'),
      verdict: 'Combined IFCN features',
      subtitle: 'No single feature establishes an IED.',
      why: 'Assess pointed multiphasic morphology, distinct duration, asymmetry, possible slow after-wave, background disruption, and a plausible scalp field.',
      mistake: 'Pointed morphology or a slow after-wave alone is not diagnostic.'
    },
    20: {
      shortTitle: 'Focal IED',
      guide: 'Find the local scalp maximum.',
      question: 'Tap the local scalp maximum.',
      visual: multi('focal_spike', ['F3', 'C3', 'T3', 'O1', 'F4', 'T4'], ['T3']),
      verdict: 'Left temporal IED',
      subtitle: 'T7 (legacy T3) is the scalp maximum.',
      why: 'The field is strongest over the left temporal region; this is approximate scalp localization, not source certainty.',
      mistake: 'Report the field and localization uncertainty, not just presence.'
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
      why: 'Right-sided LPDs are associated with seizure risk; rate, modifiers, fluctuation, and context determine whether IIC criteria are met.',
      mistake: 'Do not call every periodic pattern ictal or benign from rate alone.'
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
      subtitle: 'The first visible change is maximal at T7 (legacy T3).',
      why: 'This supports approximate lateralization but does not prove the cortical seizure-onset zone.',
      mistake: 'Do not equate the largest late wave or earliest scalp electrode with a unique cortical onset.'
    },
    26: {
      shortTitle: 'GTC',
      guide: 'The trace has phases.',
      visual: multi('gtc_seizure', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['Fp1', 'Fp2', 'F3', 'F4']),
      verdict: 'Compatible convulsive seizure pattern',
      subtitle: 'Visible phases may be obscured by muscle artifact.',
      why: 'An evolving electroclinical sequence with postictal slowing or attenuation can be supportive, but no single feature proves epilepsy.',
      mistake: 'Do not use postictal attenuation alone to confirm epilepsy or exclude a functional event.'
    },
    27: {
      shortTitle: 'NCSE',
      guide: 'Apply electroclinical criteria.',
      question: 'Unresponsive with persistent epileptiform activity?',
      optionLabels: ['Routine observation', 'Urgent expert evaluation'],
      visual: multi('generalized_sw', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['F3', 'F4']),
      verdict: 'Urgent electroclinical evaluation',
      subtitle: 'Possible NCSE requires formal criteria and context.',
      why: 'Persistent epileptiform activity with impaired responsiveness raises concern for NCSE but periodicity alone is insufficient.',
      mistake: 'Do not wait for shaking or declare definite status from one pattern alone.'
    },
    28: {
      shortTitle: 'Triphasic',
      guide: 'Metabolic patterns can mimic seizures.',
      question: 'Where are waves strongest?',
      visual: multi('triphasic', ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4'], ['Fp1', 'Fp2', 'F3', 'F4']),
      verdict: 'Frontal predominance',
      subtitle: 'GPDs with triphasic morphology may be frontally predominant.',
      why: 'Morphology and anterior-posterior lag are descriptive; evolution, modifiers, and clinical context determine whether NCSE remains a concern.',
      mistake: 'Triphasic morphology is nonspecific and does not by itself exclude NCSE.'
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
      optionLabels: ['Childhood absence from waveform alone', 'Possible NCSE — correlate'],
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
      verdict: 'Possible NCSE — urgent evaluation',
      subtitle: 'Context raises concern without proving the diagnosis.',
      why: 'Persistent generalized spike-wave with impaired responsiveness requires formal electroclinical assessment.',
      mistake: 'Do not diagnose childhood absence or definite NCSE from waveform and age alone.'
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
      subtitle: 'The flip marks a local scalp maximum or minimum.'
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
      optionLabels: ['NCSE from rhythm alone', 'SREDA after context review'],
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
      optionLabels: ['Routine observation', 'Urgent expert evaluation'],
      verdict: 'Urgent electroclinical evaluation'
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
      optionLabels: ['Childhood absence from waveform alone', 'Possible NCSE — correlate'],
      verdict: 'Possible NCSE — urgent evaluation'
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
      subtitle: 'The setting markedly attenuated them.',
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
      optionLabels: ['NCSE from rhythm alone', 'SREDA after context review'],
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
      notice: 'A cerebral signal often has a plausible field, but a limited field can occur.',
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
      subtitle: 'The local scalp maximum is at T7 (legacy T3).',
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
      subtitle: 'The first visible change is maximal at T7 (legacy T3).',
      why: 'This supports approximate left temporal lateralization without proving the cortical onset zone.',
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
      why: 'The phase sequence is compatible with a convulsive epileptic seizure, but no single postictal feature is diagnostic.',
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
      optionLabels: ['Routine observation', 'Urgent expert evaluation'],
      verdict: 'Urgent electroclinical evaluation',
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
      optionLabels: ['Childhood absence from waveform alone', 'Possible NCSE — correlate'],
      visual: {
        kind: 'report',
        report: {
          tabs: ['Patient', 'Trace', 'Meaning'],
          rows: [
            ['Patient', 'Adult, confused after a convulsion.'],
            ['Trace', 'Both-side repeated seizure waves.'],
            ['State', 'Awake but not responding.'],
            ['Meaning', 'Possible NCSE; correlate urgently.']
          ]
        }
      },
      verdict: 'Possible NCSE — urgent evaluation',
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
        c('A flip marks a scalp extremum.', 'Opposite deflections can place a local voltage maximum or minimum at the shared electrode.', 'flip', [['Phase reversal', 'opposite deflections around a shared electrode']]),
        c('Do not name a source yet.', 'Confirm the field, montage, polarity, and electrode quality.', 'spread', [['Scalp extremum', 'local measured maximum or minimum']], { focusX: '50%' })
      ],
      question: 'A bipolar phase reversal most directly marks...',
      optionLabels: ['A proven cortical source', 'A local scalp maximum or minimum'],
      visual: compare('focal_spike', 'focal_spike', 'single sensors', 'neighbor pairs'),
      verdict: 'Local scalp maximum or minimum',
      subtitle: 'The reversal describes the recorded field.',
      why: 'Opposite deflections in adjacent bipolar channels place a local voltage extremum at their shared electrode; they do not prove a unique cortical generator.',
      mistake: 'Calling a phase reversal the source before checking montage, polarity, the full field, and electrode quality.'
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
        c('A filter has a roll-off.', 'It attenuates frequencies progressively rather than making a brick-wall cut.', 'speed', [['Filter', 'a setting that changes frequency content']]),
        c('Check settings before judging.', 'Strong attenuation can hide or distort slow waves and make the trace look falsely clean.', 'compare', [['Slow waves', 'waves that repeat slowly']])
      ],
      question: 'With a 5 Hz high-pass setting, what is most attenuated?',
      optionLabels: ['Fast waves', 'Slow waves'],
      visual: compare('normal_awake', 'diffuse_slowing', 'before setting', 'after setting'),
      verdict: 'Slow waves',
      subtitle: 'Delta and lower theta are markedly attenuated.',
      why: 'A 5 Hz high-pass setting progressively attenuates slower activity and can distort morphology; it does not erase every frequency below 5 Hz equally.',
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
        c('Look beyond the point.', 'A slow after-wave is one helpful feature, not a stand-alone rule.', 'story', [['After-wave', 'a slower wave following the transient']]),
        c('Temporal means side head.', 'The side sensors sit near the temples.', 'regions', [['Temporal', 'side of the head']], { region: 'side' }),
        c('Wickets are a look-alike.', 'Arciform temporal waves in drowsiness may occur singly or in trains.', 'story', [['Wicket', 'a benign temporal look-alike']])
      ],
      question: 'Tap the harmless temporal run.',
      verdict: 'Wicket wave',
      subtitle: 'Morphology, state, field, and background favor a wicket.',
      why: 'The arciform temporal morphology, drowsy state, preserved background, and lack of a prominent slow after-wave together favor a wicket wave.',
      mistake: 'Calling a look-alike dangerous from shape alone.'
    },
    10: {
      shortTitle: 'Direction',
      guide: 'Direction is a clue.',
      cards: [
        c('Waves point.', 'A sharp wave can point upward or downward on the page.', 'polarity', [['Direction', 'which way a wave points']]),
        c('Direction adds information.', 'The named 14- and 6-Hz variant is surface-positive in its characteristic field.', 'polarity', [['Positive burst', 'a surface-positive burst']]),
        c('Combine the clues.', 'Polarity, comb morphology, posterior temporal field, and drowsy state must agree.', 'story', [['Combined features', 'several clues interpreted together']])
      ],
      question: 'How should surface-positive polarity be used here?',
      optionLabels: ['As proof by itself', 'As one clue with morphology, field, and state'],
      verdict: 'One clue in a pattern',
      subtitle: 'Polarity alone is not diagnostic.',
      why: 'Surface-positive polarity supports this benign named pattern only when its morphology, posterior temporal distribution, and drowsy state also fit.',
      mistake: 'Declaring a transient benign or epileptiform from polarity alone.'
    },
    11: {
      shortTitle: 'No change',
      guide: 'Evolution is one major clue.',
      cards: [
        c('Many seizures evolve.', 'They may change in frequency, morphology, or distribution.', 'story', [['Evolution', 'progressive change over time']]),
        c('No change is a clue.', 'A rhythm that appears and stops without changing is less suspicious.', 'story', [['Evolution', 'change over time']]),
        c('Use more than evolution.', 'State, field, duration, artifact, and clinical correlation still matter.', 'speed', [['Context', 'other evidence around the rhythm']])
      ],
      question: 'Watch for change over time, then reveal.',
      verdict: 'No-change rhythm',
      subtitle: 'No build-up, no spread.',
      why: 'The stereotyped temporal rhythm in drowsiness favors RMTD; absence of evolution alone does not exclude every seizure.',
      mistake: 'Calling any repeated rhythm a seizure—or harmless—from evolution alone.'
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
        c('After-change is supportive.', 'Post-event slowing may support a seizure interpretation but is not required or diagnostic alone.', 'story', [['After-change', 'what happens after the event']])
      ],
      question: 'Awake, asymptomatic, characteristic non-evolving rhythm. What is favored?',
      optionLabels: ['NCSE from rhythm alone', 'SREDA after full context review'],
      visual: compare('drowsy', 'temporal_seizure', 'unchanged', 'changing'),
      verdict: 'Benign pattern',
      subtitle: 'The patient did not change.',
      why: 'The characteristic pattern, unchanged patient state, preserved background, and lack of progressive evolution favor SREDA; no single negative feature excludes NCSE in every case.',
      mistake: 'Classifying a sustained rhythm without state, evolution, background, and clinical correlation.'
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
      guide: 'Check timing against the ECG.',
      cards: [
        c('The heart can show up.', 'A heartbeat can leave a small sharp mark on EEG.', 'timing', [['Heart artifact', 'heartbeat signal on EEG']]),
        c('QRS locking is the key test.', 'Compare every mark with the simultaneously recorded ECG.', 'timing', [['QRS-locked', 'same temporal relationship to each heartbeat']]),
        c('Regularity is not enough.', 'Cerebral periodic activity can also be regular, so review timing and montage.', 'line', [['Montage review', 'checking another display view']])
      ],
      question: 'Tap the repeating heart artifact.',
      verdict: 'Heartbeat artifact',
      subtitle: 'QRS time-locking supports cardiac artifact.',
      why: 'A consistent relationship to each QRS complex is stronger evidence than regularity alone; the visible field can change with reference and electrode contacts.',
      mistake: 'Declaring a regular sharp pattern cardiac without ECG correlation and montage review.'
    },
    17: {
      shortTitle: 'Skin drift',
      guide: 'The baseline can slide.',
      cards: [
        c('The baseline is the resting line.', 'Sometimes the whole line slowly slides up or down.', 'line', [['Baseline', 'the resting position of a line']]),
        c('Sweat can cause drift.', 'Skin changes can move the baseline very slowly.', 'speed', [['Drift', 'slow sliding of the line']]),
        c('Very slow is only one clue.', 'Electrode behavior, sweating, distribution, and the underlying background help identify the source.', 'speed', [['Sweat drift', 'skin-related baseline drift']])
      ],
      question: 'Very slow drift with sweating and unstable electrode baselines is more likely:',
      optionLabels: ['Brain slowing', 'Sweat drift'],
      verdict: 'Sweat drift',
      subtitle: 'The baseline is sliding.',
      why: 'The rate, sweating, and electrode instability favor artifact, but frequency alone does not prove a noncerebral source.',
      mistake: 'Calling baseline drift cerebral or artifactual without technical correlation.'
    },
    18: {
      shortTitle: 'One sensor',
      guide: 'A limited field raises uncertainty.',
      cards: [
        c('Cerebral events often have a field.', 'Nearby electrodes may sample the same volume-conducted event.', 'sensor', [['Field', 'spatial distribution across electrodes']]),
        c('A small field can still be cerebral.', 'Limited spread makes artifact more likely but does not prove it.', 'spread', [['Limited field', 'seen in very few derivations']], { focusX: '54%' }),
        c('Check the hardware and montage.', 'Inspect every derivation containing F8 and review impedance, video, EOG, and ECG.', 'code', [['Technical check', 'evidence about the electrode and recording']], { parts: ['F8', 'check'], labels: ['shared input', 'verify'] })
      ],
      question: 'Only one sensor pops. What is more likely?',
      optionLabels: ['Brain spike', 'Sensor problem'],
      verdict: 'Sensor problem',
      subtitle: 'Artifact is favored, not proven.',
      why: 'An isolated transient raises concern for electrode artifact. Confirm with impedance, every derivation containing F8, another montage, and physiologic channels.',
      mistake: 'Making a definite cerebral or artifact call from one displayed channel.'
    },
    19: {
      shortTitle: 'IED features',
      guide: 'Use the full IFCN feature set.',
      cards: [
        c('Start with shape and duration.', 'Look for a pointed di- or triphasic transient whose duration differs from the background.', 'line', [['IFCN', 'International Federation of Clinical Neurophysiology']]),
        c('Add asymmetry and after-wave.', 'Waveform asymmetry and a possible slow after-wave are two more features.', 'spike-tail', [['Possible after-wave', 'helpful but not mandatory by itself']]),
        c('Check disruption and field.', 'Background disruption and a physiologically plausible scalp voltage field complete the six-feature assessment.', 'spread', [['Scalp field', 'distribution of positive and negative voltages']], { focusX: '38%' })
      ],
      question: 'Review morphology, duration, asymmetry, after-wave, disruption, and field.',
      verdict: 'Use all six IFCN features',
      subtitle: 'No single feature establishes an IED.',
      why: 'IED interpretation rests on a combination of the six IFCN features and exclusion of artifact and benign variants.',
      mistake: 'Using pointedness or a slow after-wave as a stand-alone diagnostic rule.'
    },
    20: {
      shortTitle: 'Scalp maximum',
      guide: 'Locate the field, not a proven source.',
      cards: [
        c('A discharge has a scalp field.', 'Find the local voltage maximum or minimum and its surrounding distribution.', 'spread', [['Scalp maximum', 'strongest recorded location']], { focusX: '38%' }),
        c('T means temporal.', 'Temporal means the side of the head, near the temple.', 'regions', [['Temporal', 'side of the head'], ['T', 'short for temporal']], { region: 'side' }),
        c('T7 is left mid-temporal.', 'T7 is the modern name; older systems call the same electrode T3.', 'code', [['T7 (legacy T3)', 'left mid-temporal electrode']], { parts: ['T', '7'], labels: ['temporal', 'left'] }),
        c('Tap the local maximum.', 'It describes the scalp field but does not prove a unique cortical generator.', 'spread', [['Localization', 'an approximate inference from the scalp field']], { focusX: '38%' })
      ],
      question: 'Tap the local scalp maximum.',
      verdict: 'Left temporal scalp maximum',
      subtitle: 'T7 (legacy T3) is the local scalp maximum.',
      why: 'The synthetic field is strongest at T7 (legacy T3). Montage and field review support approximate scalp localization, not source certainty.',
      mistake: 'Calling the scalp maximum the proven cortical source.'
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
        c('Slow can be focal.', 'Persistent focal slowing indicates focal cerebral dysfunction but not one specific cause.', 'speed', [['Focal slowing', 'slowing concentrated in one region']]),
        c('Compare left with right.', 'One side may carry more slow activity than the other.', 'side', [['Side difference', 'left and right do not match']]),
        c('Name the distribution, then correlate.', 'Structural, postictal, inflammatory, migraine-related, and other processes can produce focal slowing.', 'spread', [['Nonspecific', 'does not identify one cause']], { focusX: '36%' })
      ],
      question: 'Tap the slow side.',
      verdict: 'Left-side slowing',
      subtitle: 'The slow waves are one-sided.',
      why: 'Persistent slow activity is concentrated over the left side, localizing dysfunction without identifying its cause.',
      mistake: 'Calling focal slowing a whole-brain problem or a specific structural lesion from EEG alone.'
    },
    23: {
      shortTitle: 'LPDs',
      guide: 'Describe repetition, modifiers, and risk.',
      cards: [
        c('LPDs repeat on one side.', 'Lateralized periodic discharges are associated with focal dysfunction and increased seizure risk.', 'story', [['LPD', 'lateralized periodic discharge']]),
        c('Frequency is only part of the description.', 'Plus modifiers, fluctuation, evolution, burden, and clinical state also matter.', 'side', [['Modifier', 'feature that changes interpretation']]),
        c('IIC is conditional.', 'LPDs enter the ACNS ictal-interictal continuum only when rate and modifier or fluctuation criteria are met.', 'story', [['IIC', 'ictal-interictal continuum descriptor']])
      ],
      question: 'Tap the active side.',
      verdict: 'Right-sided LPDs',
      subtitle: 'LPDs are associated with increased seizure risk.',
      why: 'The periodic discharges are lateralized to the right. Frequency, modifiers, fluctuation, evolution, burden, and clinical context determine whether IIC or seizure criteria are met.',
      mistake: 'Calling every LPD ictal—or benign—from periodicity or frequency alone.'
    },
    24: {
      shortTitle: 'Changing event',
      guide: 'Evolution strongly supports ictal activity.',
      cards: [
        c('Many seizures tell a changing story.', 'Frequency, morphology, or distribution may evolve over time.', 'story', [['Evolution', 'progressive change over time']]),
        c('Track the formal dimensions.', 'Watch frequency, morphology, location, and duration—not amplitude alone.', 'speed', [['Duration', 'how long the pattern lasts']]),
        c('Evolution is not the only route.', 'Some electrographic seizures meet rate-and-duration criteria, while artifact can look evolving.', 'story', [['Criteria', 'rules applied with context']])
      ],
      question: 'Watch the changing rhythm, then reveal.',
      verdict: 'Seizure evolution',
      subtitle: 'The rhythm changes in several ways.',
      why: 'This synthetic pattern changes in frequency, morphology, and distribution. Duration and clinical correlation determine its final classification.',
      mistake: 'Using evolution as an all-or-none shortcut or classifying amplitude change alone as evolution.'
    },
    25: {
      shortTitle: 'Earliest scalp change',
      guide: 'Track the first visible change before spread.',
      cards: [
        c('Scalp onset is what you can see.', 'The earliest scalp change may occur after the cortical seizure has already begun.', 'story', [['Scalp onset', 'earliest change visible at scalp electrodes']]),
        c('Spread can be louder.', 'The biggest late signal may not be the earliest visible change.', 'spread', [['Spread', 'later involvement of more electrodes']], { focusX: '68%' }),
        c('Use the first visible change.', 'It provides approximate lateralizing information, not a unique cortical onset zone.', 'spread', [['Lateralization', 'estimating left versus right']], { focusX: '38%' }),
        c('Here, watch T7.', 'T7 is the modern left mid-temporal name; legacy systems call it T3.', 'code', [['T7 (legacy T3)', 'left mid-temporal electrode']], { parts: ['T', '7'], labels: ['temporal', 'left'] })
      ],
      question: 'Tap the earliest visible scalp change.',
      verdict: 'Earliest left temporal scalp change',
      subtitle: 'The first visible change is maximal at T7 (legacy T3).',
      why: 'This supports approximate left temporal lateralization but does not prove the cortical seizure-onset zone.',
      mistake: 'Equating the largest late wave—or earliest scalp electrode—with a uniquely proven cortical onset.'
    },
    26: {
      shortTitle: 'Three phases',
      guide: 'The trace has phases.',
      cards: [
        c('Scalp EEG may show phases.', 'Muscle artifact often obscures much of a bilateral tonic-clonic seizure.', 'story', [['Phase', 'one part of a sequence']]),
        c('Visible activity can change.', 'Fast activity and jerk-locked discharges may be followed by slowing or attenuation.', 'story', [['Postictal', 'after the seizure']]),
        c('The after-pattern is variable.', 'Postictal slowing or attenuation can support the sequence but does not prove epilepsy by itself.', 'line', [['Supportive', 'adds evidence without being decisive']])
      ],
      question: 'Watch the sequence, then reveal.',
      verdict: 'Compatible convulsive seizure sequence',
      subtitle: 'Interpret EEG, artifact, video, and clinical phases together.',
      why: 'This synthetic sequence is compatible with a bilateral tonic-clonic seizure, but no single postictal feature independently confirms epilepsy or excludes a functional event.',
      mistake: 'Using a flat-looking postictal segment as stand-alone proof of epilepsy.'
    },
    27: {
      shortTitle: 'Possible NCSE',
      guide: 'Apply formal electroclinical criteria.',
      cards: [
        c('No convulsion does not exclude seizure.', 'An impaired patient may have ongoing electrographic or electroclinical seizure activity.', 'report', [['Nonconvulsive', 'without prominent convulsions']]),
        c('Periodic is not automatically status.', 'Apply rate, duration, evolution, modifiers, and clinical-correlation criteria.', 'spread', [['NCSE', 'nonconvulsive status epilepticus']], { focusX: '52%' }),
        c('Concern requires prompt review.', 'Urgent expert assessment and continuous EEG may be needed for possible NCSE.', 'report', [['Electroclinical', 'EEG interpreted with the patient examination']])
      ],
      question: 'Unresponsive patient with persistent epileptiform activity:',
      optionLabels: ['Routine observation only', 'Urgent expert evaluation for possible NCSE'],
      verdict: 'Urgent electroclinical evaluation',
      subtitle: 'Possible NCSE is not diagnosed from periodicity alone.',
      why: 'Impaired responsiveness plus persistent epileptiform activity warrants prompt specialist review and continuous EEG using ACNS or Salzburg criteria.',
      mistake: 'Waiting for another convulsion—or declaring definite status from one pattern—without electroclinical assessment.'
    },
    28: {
      shortTitle: 'Triphasic morphology',
      guide: 'Describe the pattern before assigning cause.',
      cards: [
        c('Triphasic is a morphology modifier.', 'Use the ACNS description generalized periodic discharges with triphasic morphology when appropriate.', 'report', [['GPD', 'generalized periodic discharge']]),
        c('The cause is nonspecific.', 'Toxic-metabolic, medication-related, infectious, and structural disorders can produce this pattern.', 'report', [['Nonspecific', 'not tied to one cause']]),
        c('Frontal predominance and lag can occur.', 'These features help describe the field but do not independently exclude NCSE.', 'spread', [['Anterior-posterior lag', 'front and back peaks occur at slightly different times']], { focusX: '28%' })
      ],
      question: 'Where are these GPDs most prominent?',
      verdict: 'Frontally predominant',
      subtitle: 'Triphasic morphology describes shape, not etiology.',
      why: 'This synthetic pattern is frontally predominant, but morphology, lag, evolution, modifiers, and clinical context must be assessed before deciding whether NCSE is a concern.',
      mistake: 'Using triphasic morphology or metabolic illness as a stand-alone exclusion of NCSE.'
    },
    29: {
      shortTitle: 'Over-call trap',
      guide: 'Do not rush the label.',
      cards: [
        c('Over-call means too much alarm.', 'It happens when a harmless pattern is called dangerous.', 'story', [['Over-call', 'calling harmless dangerous']]),
        c('The wicket returns.', 'Arciform temporal waves in drowsiness may be benign even when sharply contoured.', 'story', [['Wicket', 'benign temporal look-alike']]),
        c('Repeat the safety check.', 'Morphology, field, state, background, and patient story all matter.', 'report', [['Safety check', 'combined clues before the label']])
      ],
      question: 'Temporal run with no slow tail:',
      optionLabels: ['Epilepsy spike', 'Wicket wave'],
      verdict: 'Wicket wave',
      subtitle: 'A harmless sharp-looking run.',
      why: 'The arciform morphology, temporal field, drowsy state, preserved background, and lack of a prominent slow after-wave together favor a wicket wave.',
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
      question: 'Choose the safest final impression.',
      optionLabels: ['Childhood absence from waveform alone', 'Possible NCSE needing urgent electroclinical evaluation'],
      visual: {
        kind: 'report',
        report: {
          tabs: ['Patient', 'Trace', 'Meaning'],
          rows: [
            ['Patient', 'Adult, confused after a convulsion.'],
            ['Trace', 'Persistent generalized spike-wave pattern.'],
            ['State', 'Awake but not responding.'],
            ['Meaning', 'Possible NCSE; correlate urgently.']
          ]
        }
      },
      verdict: 'Possible NCSE — urgent evaluation',
      subtitle: 'Context raises concern but does not make the diagnosis alone.',
      why: 'Persistent generalized spike-wave with acute impaired responsiveness raises concern for NCSE. Apply formal criteria with examination, video, medications, and the recording course.',
      mistake: 'Calling childhood absence or definite NCSE from waveform and age alone.'
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
      guide: 'Use the measured map, not number size.',
      cards: [
        c('Numbers tell side first.', 'Odd is left. Even is right.', 'side', [['Odd', 'left'], ['Even', 'right']]),
        c('Names mark defined positions.', 'C4 is closer to the middle than T8 because of their measured locations, not because 4 is smaller than 8.', 'code', [['Position', 'standardized point on the scalp map']], { parts: ['C4', 'T8'], labels: ['nearer', 'farther'] }),
        c('Midline is the center path.', 'Use it as the middle of the map.', 'midline', [['Midline', 'center path of the head']])
      ],
      question: 'Which is closer to the middle?',
      optionLabels: ['T8', 'C4'],
      visual: { kind: 'head-diagram', config: { targets: ['C4', 'T4'] } },
      verdict: 'C4',
      subtitle: 'C4 is nearer the midline on the standard map.',
      why: 'T8 is a lateral temporal electrode; numeric magnitude is not a general distance code.',
      mistake: 'Inferring distance from the number instead of checking the electrode map.'
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
      guide: 'The reference is a computed mean.',
      cards: [
        c('Neighbor pairs are one view.', 'Bipolar display compares nearby sensors.', 'compare', [['Bipolar', 'neighbor-pair view']]),
        c('Average reference is computed.', 'Each electrode is compared with the instantaneous mean of the included usable EEG electrodes.', 'sensor', [['Average reference', 'comparison with a computed electrode mean']]),
        c('The mean can be biased.', 'Bad channels, incomplete coverage, and large focal activity can affect it.', 'compare', [['Included electrodes', 'channels used to calculate the mean']])
      ],
      question: 'Average reference compares an electrode with:',
      optionLabels: ['Only the next electrode', 'The mean of included usable electrodes'],
      visual: compare('focal_spike', 'focal_spike', 'neighbor pairs', 'electrode mean'),
      verdict: 'Mean of included usable electrodes',
      subtitle: 'It is computed, not a silent whole-head point.',
      why: 'The instantaneous arithmetic mean of the selected usable electrodes is subtracted from each electrode.',
      mistake: 'Calling the computed mean neutral or including grossly artifactual channels without review.'
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
      guide: 'Find the local scalp maximum.',
      cards: [
        c('A field can have a local maximum.', 'This is the strongest recorded scalp region, not a proven cortical source.', 'spread', [['Scalp maximum', 'strongest recorded location']], { focusX: '38%' }),
        c('Temporal means side head.', 'T sensors sit near the temples.', 'regions', [['Temporal', 'side of the head']], { region: 'side' }),
        c('Use the modern name.', 'T7 is the left mid-temporal electrode; T3 is its legacy label.', 'code', [['T7 (legacy T3)', 'left mid-temporal electrode']], { parts: ['T', '7'], labels: ['temporal', 'left'] })
      ],
      question: 'Tap the left temporal maximum.',
      visual: multi('focal_spike', ['F3', 'C3', 'T3', 'O1', 'F4', 'T4'], ['T3']),
      verdict: 'Left temporal maximum',
      subtitle: 'T7 (legacy T3) is the local scalp maximum.',
      why: 'The strongest abnormality is in the left temporal chain, which localizes the scalp field approximately.',
      mistake: 'Calling the scalp maximum a uniquely proven cortical source.'
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
        c('Yield varies.', 'Population, timing, sleep, activation, and recording duration all change sensitivity.', 'story', [['Sensitivity', 'chance the study detects the target finding']]),
        c('Normal does not end the story.', 'History still matters after a normal EEG.', 'report', [['Normal EEG', 'no abnormality seen in recording']])
      ],
      question: 'A normal routine EEG after a seizure means epilepsy is:',
      optionLabels: ['Impossible', 'Still possible'],
      visual: { kind: 'report', report: { tabs: ['History', 'EEG', 'Meaning'], rows: [['History', 'First seizure.'], ['EEG', 'Routine study normal.'], ['Meaning', 'Epilepsy still possible.']] } },
      verdict: 'Still possible',
      subtitle: 'Routine EEG can miss it.',
      why: 'Interictal discharges can be intermittent, and routine-EEG sensitivity varies across patient groups and protocols.',
      mistake: 'Using one normal EEG to rule out epilepsy.'
    },
    50: {
      shortTitle: 'More time',
      guide: 'Longer recording helps.',
      cards: [
        c('Abnormalities come and go.', 'More time gives more chances to catch them.', 'story', [['Intermittent', 'appears only sometimes']]),
        c('Longer sampling often improves yield.', 'The size of the gain depends on the population, protocol, and target event.', 'report', [['Variable yield', 'no single percentage fits every setting']]),
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
      shortTitle: 'Source visibility',
      guide: 'Area helps; there is no universal cutoff.',
      cards: [
        c('Larger synchronized areas are often easier.', 'More aligned activity can create a stronger scalp field.', 'spread', [['Detection', 'signal becoming visible']], { focusX: '50%' }),
        c('No fixed cm² rule applies.', 'Experimental estimates vary, and area is only one determinant.', 'code', [['Variable threshold', 'detectability changes with source and recording']], { parts: ['area', 'geometry'], labels: ['one factor', 'another factor'] }),
        c('Orientation and depth matter too.', 'Montage, coverage, conductivity, background, and noise also affect visibility.', 'report', [['Limitation', 'what a test may miss']])
      ],
      question: 'All else equal, which source is generally easier to detect?',
      optionLabels: ['Tiny point source', 'Sizable cortical area'],
      visual: { kind: 'frequency-scope', config: { highlightBand: 1 } },
      verdict: 'Sizable cortical area',
      subtitle: 'Area helps, but it is not a fixed threshold.',
      why: 'A larger synchronized area often creates a stronger field, while orientation, depth, montage, conductivity, and noise can change detectability.',
      mistake: 'Expecting scalp EEG to detect every tiny source.'
    },
    54: {
      shortTitle: 'Deep sources',
      guide: 'Distance weakens signal.',
      cards: [
        c('Location matters too.', 'Surface sources are easier for scalp sensors.', 'sensor', [['Surface source', 'nearer the scalp']]),
        c('Deep sources can hide.', 'Mesial temporal, insular, or cingulate activity may be harder to detect or localize.', 'spread', [['Deep source', 'farther from scalp sensors']], { focusX: '50%' }),
        c('Normal scalp EEG has limits.', 'Deep seizure sources can still exist.', 'report', [['Distance', 'space between source and sensor']])
      ],
      question: 'Deep brain activity is often:',
      optionLabels: ['Easier to see', 'Harder to see'],
      visual: { kind: 'frequency-scope', config: { highlightBand: 2 } },
      verdict: 'Harder to see',
      subtitle: 'Distance weakens the scalp field.',
      why: 'Distance and intervening tissues can attenuate deep activity, while orientation and propagation shape the visible scalp field.',
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
      guide: 'Find the local scalp maximum.',
      cards: [
        c('Scan the full field.', 'Find the strongest region and its neighbors.', 'spread', [['Full field', 'spread across the cap']], { focusX: '38%' }),
        c('Name side and region.', 'Left temporal is different from right posterior.', 'regions', [['Side-region label', 'left/right plus head area']], { region: 'side' }),
        c('Tap the scalp maximum.', 'It is a localization clue, not proof of one cortical generator.', 'spread', [['Scalp maximum', 'strongest recorded point']], { focusX: '38%' })
      ],
      question: 'Full cap case: tap the focal maximum.',
      visual: { kind: 'cap-trace', preset: 'focal_spike', config: { channels: [2, 4, 6, 8, 3, 5, 7, 9], highlight: [6], targets: ['T3'], header: 'field maximum', measure: 'strongest channel' } },
      verdict: 'Left temporal maximum',
      subtitle: 'T7 (legacy T3) is the local scalp maximum.',
      why: 'The strongest activity sits in the left temporal region with surrounding spread, providing approximate scalp localization.',
      mistake: 'Calling the scalp maximum the proven cortical source or choosing only later spread.'
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
      question: 'Measure the run, then use the story. Safest final impression:',
      optionLabels: ['Normal awake rhythm', 'Possible NCSE needing urgent expert evaluation'],
      visual: { kind: 'cap-trace', preset: 'generalized_sw', config: { channels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], highlight: [0, 1, 2, 3, 4, 5, 6, 7], targets: ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'T3', 'T4'], header: 'confused adult', measure: 'continuous run' } },
      verdict: 'Possible NCSE — urgent evaluation',
      subtitle: 'Trace plus patient state raises concern.',
      why: 'A persistent generalized epileptiform pattern with impaired responsiveness raises concern for NCSE, but formal electroclinical criteria determine the diagnosis.',
      mistake: 'Naming definite status—or dismissing the pattern—without examination, video, medications, and recording course.'
    },
    61: {
      shortTitle: 'Synaptic currents',
      guide: 'Start with what can sum.',
      cards: [
        c('EEG begins between neurons.', 'Synaptic input moves charge across dendritic membranes.', 'story', [['Postsynaptic', 'after a signal reaches a synapse']]),
        c('Slow fields can overlap.', 'Postsynaptic currents last longer than a brief axonal spike.', 'speed', [['Temporal summation', 'events overlapping in time']]),
        c('The scalp sees a population.', 'Many small fields must add before an electrode can detect them.', 'spread', [['Population field', 'summed activity from many cells']], { focusX: '50%' })
      ],
      question: 'What contributes most to routine scalp EEG?',
      optionLabels: ['Single axonal spikes', 'Summed postsynaptic currents'],
      visual: { kind: 'biophysics', config: { mode: 'synapse' } },
      verdict: 'Summed postsynaptic currents',
      subtitle: 'EEG is a population field, not a single-neuron recording.',
      why: 'Slower postsynaptic currents can overlap across many neurons; brief action potentials usually cancel at scalp distance.',
      mistake: 'Treating an EEG trace as a direct view of individual neurons firing.'
    },
    62: {
      shortTitle: 'Synchrony',
      guide: 'Timing and alignment make fields add.',
      cards: [
        c('One cell is too small.', 'A single cortical neuron contributes a negligible scalp field.', 'spread', [['Scalp field', 'voltage pattern measured at the head']], { focusX: '30%' }),
        c('Parallel cells can reinforce.', 'Cortical pyramidal cells are similarly oriented within a local patch.', 'regions', [['Pyramidal cell', 'aligned cortical neuron']], { region: 'center' }),
        c('Shared timing matters.', 'Coordinated currents add; mismatched currents partly cancel.', 'compare', [['Synchrony', 'activity aligned in time']])
      ],
      question: 'Which cortical population is easier to detect at the scalp?',
      optionLabels: ['Aligned and synchronous', 'Scattered and asynchronous'],
      visual: { kind: 'biophysics', config: { mode: 'synchrony' } },
      verdict: 'Aligned and synchronous',
      subtitle: 'Geometry and timing let weak fields add.',
      why: 'When similarly oriented pyramidal cells are active together, their extracellular fields reinforce instead of cancelling.',
      mistake: 'Assuming that more active neurons always produce a stronger scalp signal regardless of orientation or timing.'
    },
    63: {
      shortTitle: 'Orientation',
      guide: 'Folded cortex changes the scalp projection.',
      cards: [
        c('The cortex is folded.', 'Gyri and sulci point local cell columns in different directions.', 'regions', [['Gyrus', 'outward cortical fold'], ['Sulcus', 'inward cortical groove']], { region: 'center' }),
        c('Direction changes the field.', 'Position and orientation together shape the scalp voltage map.', 'spread', [['Orientation', 'direction of the source field']], { focusX: '58%' }),
        c('A maximum is not a pin.', 'The largest electrode value does not prove a unique generator directly beneath it.', 'sensor', [['Scalp maximum', 'largest measured voltage difference']])
      ],
      question: 'Can two equally active cortical patches create different scalp patterns?',
      optionLabels: ['No, activity alone decides', 'Yes, orientation matters'],
      visual: { kind: 'biophysics', config: { mode: 'orientation' } },
      verdict: 'Orientation matters',
      subtitle: 'The cortical sheet is folded, so its fields point in different directions.',
      why: 'A source’s position and orientation determine how its voltage field reaches each electrode.',
      mistake: 'Assuming the largest scalp channel sits directly over a unique generator.'
    },
    64: {
      shortTitle: 'Volume conduction',
      guide: 'One field can reach many electrodes.',
      cards: [
        c('The field leaves cortex.', 'It spreads passively through brain, fluid, skull, and scalp.', 'story', [['Volume conduction', 'passive field spread through tissue']]),
        c('Nearby channels share information.', 'Several electrodes can sample different parts of the same field.', 'spread', [['Shared source', 'one generator influencing many sensors']], { focusX: '46%' }),
        c('Spread has no synaptic relay.', 'The field is measured across the head without traveling neuron to neuron.', 'speed', [['Passive', 'not carried by a new neural signal']])
      ],
      question: 'A waveform appears in several nearby channels at once. Is one shared source possible?',
      optionLabels: ['No, each channel needs its own source', 'Yes, fields spread through tissue'],
      visual: { kind: 'biophysics', config: { mode: 'conduction' } },
      verdict: 'One source can reach many channels',
      subtitle: 'Channels sample a shared volume-conducted field.',
      why: 'Scalp electrodes measure voltage differences within a field that has spread through conductive tissue.',
      mistake: 'Counting every affected channel as a separate brain generator.'
    },
    65: {
      shortTitle: 'Skull filter',
      guide: 'The scalp picture is weaker and broader.',
      cards: [
        c('Distance reduces amplitude.', 'The electrode sits beyond several tissue layers.', 'sensor', [['Attenuation', 'reduction in signal amplitude']]),
        c('Conductive layers spread detail.', 'A focal cortical field becomes spatially smoother at the scalp.', 'spread', [['Spatial blur', 'loss of fine location detail']], { focusX: '50%' }),
        c('Localization stays approximate.', 'Montage, head model, anatomy, and context all affect the conclusion.', 'report', [['Localization', 'estimating where activity arose']])
      ],
      question: 'Compared with a cortical-surface recording, scalp EEG is usually:',
      optionLabels: ['Sharper and larger', 'Broader and smaller'],
      visual: { kind: 'biophysics', config: { mode: 'skull-filter' } },
      verdict: 'Broader and smaller',
      subtitle: 'Tissue between cortex and electrode acts as a spatial filter.',
      why: 'Skull resistance attenuates the field, while conductive layers spread it across the scalp.',
      mistake: 'Reading a broad scalp maximum as the exact boundary of the active cortex.'
    },
    66: {
      shortTitle: 'Inverse problem',
      guide: 'A scalp map has more than one explanation.',
      cards: [
        c('Sensors give measurements.', 'They do not directly reveal the hidden generators.', 'sensor', [['Forward problem', 'predicting sensors from known sources']]),
        c('Different sources can look alike.', 'More than one source arrangement may fit the same scalp voltages.', 'compare', [['Inverse problem', 'estimating sources from measurements']]),
        c('Models add assumptions.', 'Anatomy, montage, timing, and clinical evidence narrow the possibilities.', 'report', [['Model', 'structured set of assumptions']])
      ],
      question: 'Does one scalp map prove one unique cortical source?',
      optionLabels: ['Yes', 'No'],
      visual: { kind: 'biophysics', config: { mode: 'inverse' } },
      verdict: 'No unique source',
      subtitle: 'Scalp measurements constrain possibilities; they do not solve location by themselves.',
      why: 'This is the EEG inverse problem: multiple source configurations can explain the same electrode voltages.',
      mistake: 'Presenting visual localization as certainty without a model, montage comparison, or other evidence.'
    }
  };

  Object.keys(EXTENDED_COURSE).forEach(function (id) {
    LESSONS[id] = EXTENDED_COURSE[id];
  });

  global.EEG_LESSON_META = LESSONS;

}(window));
