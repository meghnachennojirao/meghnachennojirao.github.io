const SOURCE_ROOT = "https://nba.uth.tmc.edu/neuroscience/m/";

function youTubeSearch(title) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`neuroscience ${title}`)}`;
}

function lesson(section, number, title, synopsis, anchors, prompt, visual, isIntroduction = false) {
  const source = isIntroduction
    ? `${section}/introduction.html`
    : `${section}/chapter${String(number).padStart(2, "0")}.html`;

  return {
    id: `${section}-${isIntroduction ? "intro" : String(number).padStart(2, "0")}`,
    title,
    source: `${SOURCE_ROOT}${source}`,
    youtube: youTubeSearch(title),
    synopsis,
    anchors,
    prompt,
    visual,
    minutes: Math.max(24, Math.min(46, 24 + anchors.join(" ").length)),
  };
}

export const sections = [
  {
    id: "s1",
    number: "01",
    title: "Cellular & molecular neurobiology",
    short: "Signals, synapses, cells, and molecules",
    color: "coral",
    premise: "Start at the smallest useful scale: how a cell maintains a voltage, turns a stimulus into a spike, and changes another cell.",
    lessons: [
      lesson("s1", 0, "Introduction to Neurons and Neural Networks", "Build the basic map first: specialized cells exchange electrical and chemical signals, and circuits turn those exchanges into perception, action, and memory.", ["neurons and glia", "input → integration → output", "circuits as explanations"], "Explain why a brain needs both individual cells and networks to do one useful thing.", "network", true),
      lesson("s1", 1, "Resting Potentials & Action Potentials", "A neuron is not electrically silent at rest. Its membrane keeps ions unevenly distributed; a sufficiently strong, well-timed input can produce the all-or-none action potential.", ["selective membrane", "resting voltage", "threshold and refractoriness"], "Draw the voltage trace and mark where a small input becomes a spike.", "signal"),
      lesson("s1", 2, "Ionic Mechanisms of Action Potentials", "The spike has a physical mechanism: ion channels open and close with voltage, changing sodium and potassium conductance in a reliable sequence.", ["driving force", "Na⁺ activation", "K⁺ recovery"], "For each phase of a spike, name the dominant conductance and the direction ions move.", "signal"),
      lesson("s1", 3, "Propagation of Action Potentials", "Signals do not simply leak down an axon. Local current triggers adjacent membrane, while myelin and nodes of Ranvier make long-distance signaling faster and cheaper.", ["local circuit current", "saltatory conduction", "diameter and myelin"], "Predict which axon carries a signal faster and defend your answer using structure, not memorized labels.", "pathway"),
      lesson("s1", 4, "Synaptic Transmission at the Skeletal Neuromuscular Junction", "The neuromuscular junction is a clean model of chemical transmission: a motor neuron releases acetylcholine, a muscle membrane depolarizes, and contraction becomes possible.", ["presynaptic release", "nicotinic receptor", "end-plate potential"], "Tell the story from a motor-neuron spike to muscle contraction without skipping the synaptic cleft.", "synapse"),
      lesson("s1", 5, "Mechanisms of Neurotransmitter Release", "Vesicles are not passive packages. Calcium entry, release machinery, vesicle pools, and probability determine whether a presynaptic spike changes its target.", ["Ca²⁺ trigger", "SNARE-mediated fusion", "release probability"], "Why can two identical-looking spikes produce different postsynaptic effects?", "synapse"),
      lesson("s1", 6, "Synaptic Transmission in the Central Nervous System", "CNS synapses combine fast excitation, inhibition, and slower modulation. Their effect depends on receptor type, reversal potential, location, and the state of the target cell.", ["EPSPs and IPSPs", "ionotropic vs metabotropic", "integration across synapses"], "Decide whether a synapse is functionally excitatory or inhibitory from its reversal potential and context.", "synapse"),
      lesson("s1", 7, "Synaptic Plasticity", "Experience can leave a trace because synapses change. Short- and long-term plasticity alter release, receptors, and circuit weights, but the rule depends on timing and activity.", ["short-term dynamics", "LTP and LTD", "Hebbian timing"], "State one mechanism that could make a connection stronger and one that could make it weaker.", "synapse"),
      lesson("s1", 8, "Organization of Cell Types", "Nervous systems work through division of labor. Neurons vary in shape, transmitter, projection target, and gene expression; glia maintain and tune the environment around them.", ["morphology and function", "projection classes", "glial support"], "Choose two ways to classify a neuron and explain what each classification predicts.", "network"),
      lesson("s1", 9, "Synapse Formation, Survival, and Elimination", "Wiring is built and revised. Development creates candidate connections, activity and molecular cues stabilize some, and pruning removes others to make circuits precise.", ["guidance cues", "activity-dependent refinement", "pruning"], "Why is removing a synapse sometimes a sign of healthy development?", "network"),
      lesson("s1", 10, "Transport and the Molecular Mechanism of Secretion", "A neuron is too large to rely on diffusion alone. Motor proteins move cargo along cytoskeletal tracks, ensuring that distant terminals receive proteins, vesicles, and energy.", ["microtubule tracks", "kinesin and dynein", "axonal logistics"], "Compare anterograde with retrograde transport and give one thing each must carry.", "pathway"),
      lesson("s1", 11, "Acetylcholine Neurotransmission", "Acetylcholine has distinct roles at neuromuscular junctions, autonomic ganglia, and brain circuits. Its synthesis, receptors, and breakdown explain why one molecule can have many effects.", ["choline acetyltransferase", "nicotinic and muscarinic receptors", "acetylcholinesterase"], "Contrast a fast nicotinic effect with a slower muscarinic effect.", "synapse"),
      lesson("s1", 12, "Biogenic Amine Neurotransmitters", "Dopamine, norepinephrine, serotonin, and histamine act through diffuse systems that set priorities, state, and learning conditions rather than merely carrying point-to-point messages.", ["monoamine synthesis", "diffuse projections", "reuptake and modulation"], "Pick one monoamine and connect its projection pattern to a behavioral role.", "brain"),
      lesson("s1", 13, "Amino Acid Neurotransmitters", "Glutamate and GABA provide much of the CNS's rapid excitation and inhibition. Their receptor subtypes, uptake systems, and balance shape circuit stability and computation.", ["glutamate receptors", "GABA receptors", "excitation–inhibition balance"], "Why is calling glutamate simply 'good' and GABA simply 'bad' a misleading shortcut?", "synapse"),
      lesson("s1", 14, "Neuropeptides and Nitric Oxide", "Some neural signals are slow, broad, and state dependent. Peptides and nitric oxide often modify the conditions under which faster transmitters work.", ["dense-core vesicles", "volume transmission", "retrograde signaling"], "Describe one way a peptide signal differs from a fast amino-acid synapse.", "synapse"),
      lesson("s1", 15, "Genetics and Neuronal Disease", "Genes influence proteins, cells, circuits, and vulnerability—but they rarely map one-to-one onto a complex disease. Use genetics to trace mechanisms, not to make deterministic stories.", ["gene → protein → circuit", "risk vs cause", "developmental timing"], "Write one sentence that distinguishes genetic risk from genetic certainty.", "brain"),
    ],
  },
  {
    id: "s2",
    number: "02",
    title: "Sensory systems",
    short: "From a stimulus at the body to a percept in the brain",
    color: "teal",
    premise: "Follow information into the nervous system: receptors translate physical energy, pathways preserve selected features, and the brain makes a percept.",
    lessons: [
      lesson("s2", 1, "Overview of the Nervous System", "Orient yourself before learning pathways: central and peripheral divisions, somatic and autonomic functions, and the logic of afferent versus efferent traffic.", ["CNS and PNS", "afferent and efferent", "gray and white matter"], "Trace a signal from touching a hot pan to withdrawing your hand and label each direction of travel.", "brain"),
      lesson("s2", 2, "Somatosensory Systems", "Touch, vibration, position, temperature, and pain do not begin as the same signal. Receptors and afferents are tuned to different kinds of change in the body.", ["receptor specialization", "receptive fields", "adaptation"], "Compare a rapidly adapting receptor with a slowly adapting receptor using one everyday example.", "pathway"),
      lesson("s2", 3, "Anatomy of the Spinal Cord", "The spinal cord is both a conduit and a local processor. Its segmental organization, roots, horns, and tracts explain why lesion signs have a pattern.", ["dorsal and ventral roots", "gray horns", "ascending and descending tracts"], "Use dorsal/ventral and sensory/motor as two paired anchors—what connects to what?", "pathway"),
      lesson("s2", 4, "Somatosensory Pathways", "Different body signals take different routes. The dorsal column system and anterolateral system cross at different places and preserve different information.", ["decussation", "dorsal column–medial lemniscus", "spinothalamic pathway"], "Predict which side of the body is affected by a lesion before and after a pathway crosses.", "pathway"),
      lesson("s2", 5, "Somatosensory Processes", "Perception is an inference from distributed activity. Receptive fields, lateral inhibition, cortical maps, and adaptation explain resolution, localization, and change detection.", ["two-point discrimination", "lateral inhibition", "somatotopy"], "Why are fingertips better at locating a touch than the back?", "brain"),
      lesson("s2", 6, "Pain Principles", "Pain is not a direct readout of tissue damage. Nociception detects potentially damaging stimuli; perception is shaped by context, expectation, and descending control.", ["nociceptors", "acute vs persistent pain", "nociception vs pain"], "Explain why 'no pain' and 'no tissue damage' are not equivalent claims.", "pathway"),
      lesson("s2", 7, "Pain Tracts and Sources", "Pain and temperature information travel through defined spinal and brain pathways, but their source can be misleading because organs and skin converge on shared circuits.", ["anterolateral ascent", "referred pain", "visceral afferents"], "Use convergence to explain how pain can be felt in a location away from the injured tissue.", "pathway"),
      lesson("s2", 8, "Pain Modulation and Mechanisms", "The nervous system can amplify or dampen pain. Spinal gating, descending pathways, inflammatory signals, and plasticity help explain both protection and chronic pain.", ["gate control", "descending analgesia", "sensitization"], "Name one mechanism that turns the gain down and one that turns the gain up.", "network"),
      lesson("s2", 9, "Chemical Senses: Olfaction and Gustation", "Smell and taste turn molecules into neural codes. Their receptor families, transduction mechanisms, and central connections explain flavor and its strong link to memory.", ["chemoreceptors", "labeled lines", "flavor integration"], "Why does food taste muted when your nose is blocked?", "synapse"),
      lesson("s2", 10, "Vestibular System: Structure and Function", "The vestibular organs detect head motion and orientation using hair cells in semicircular canals and otolith organs. The relevant variable is acceleration, not simply movement.", ["hair-cell transduction", "semicircular canals", "otolith organs"], "Separate angular acceleration from linear acceleration using a real movement example.", "pathway"),
      lesson("s2", 11, "Vestibular System: Pathways and Reflexes", "Vestibular signals reach eye, spinal, thalamic, and cortical circuits. Reflexes stabilize gaze and posture before you consciously identify that you are moving.", ["vestibulo-ocular reflex", "vestibulospinal pathways", "gaze stabilization"], "Explain why your eyes move opposite to your head during a stable gaze.", "pathway"),
      lesson("s2", 12, "Auditory System: Structure and Function", "Hearing begins when pressure waves move the cochlea. Hair-cell mechanics preserve frequency and intensity information in a neural code.", ["cochlear tonotopy", "hair cells", "frequency coding"], "Trace one sound from air pressure to auditory-nerve spikes.", "pathway"),
      lesson("s2", 13, "Auditory System: Pathways and Reflexes", "Auditory pathways compare information from both ears and retain frequency organization. This makes localization and reflexive orienting possible.", ["binaural comparison", "sound localization", "inferior colliculus"], "Which cue is more useful for locating a low-pitched versus high-pitched sound, and why?", "pathway"),
      lesson("s2", 14, "Visual Processing: Eye and Retina", "The retina is neural tissue, not camera film. Optical structure focuses light; photoreceptors and retinal circuits transform it into contrast-sensitive output.", ["rods and cones", "center–surround fields", "retinal output"], "Explain how a center–surround receptive field detects an edge better than a uniform surface.", "brain"),
      lesson("s2", 15, "Visual Processing: Cortical Pathways", "Visual cortex preserves maps while extracting features. Parallel pathways support different questions about an object—where it is, what it is, and how it is moving.", ["retinotopy", "ventral and dorsal streams", "feature integration"], "Compare a 'what' error with a 'where/how' error using a visual task.", "brain"),
    ],
  },
  {
    id: "s3",
    number: "03",
    title: "Motor systems",
    short: "The hierarchy that makes movement accurate and adaptable",
    color: "gold",
    premise: "Movement is not a single command. It is a negotiated result of muscles, spinal circuits, cortex, basal ganglia, cerebellum, and sensory feedback.",
    lessons: [
      lesson("s3", 1, "Motor Units and Muscle Receptors", "A motor unit links one motor neuron to the muscle fibers it controls. Muscle spindles and Golgi tendon organs continuously report length, stretch, and force.", ["motor-unit recruitment", "muscle spindle", "Golgi tendon organ"], "Contrast a sensor for muscle length with a sensor for muscle tension.", "pathway"),
      lesson("s3", 2, "Spinal Reflexes and Descending Motor Pathways", "Spinal circuits can produce rapid, useful responses, while descending pathways bias and organize them for goals. Reflexes reveal circuit architecture in action.", ["stretch reflex", "interneurons", "corticospinal control"], "Tell the difference between a reflex arc and a voluntary movement plan.", "pathway"),
      lesson("s3", 3, "Motor Cortex", "Motor cortex contributes to planning, selecting, and controlling movement through population activity and descending projections—not a simple one-muscle-per-spot map.", ["somatotopy", "motor planning", "population coding"], "Why is a motor-cortex map useful but incomplete as an explanation of movement?", "brain"),
      lesson("s3", 4, "Basal Ganglia", "Basal ganglia circuits help select and scale actions. Their direct and indirect pathways are best understood as a control system that balances initiation, suppression, and learning.", ["action selection", "dopamine", "direct and indirect pathways"], "Use action selection, not 'movement center,' to explain what basal ganglia contribute.", "network"),
      lesson("s3", 5, "Cerebellum", "The cerebellum compares intended and actual outcomes, supports timing and calibration, and uses error signals to improve future movements.", ["prediction error", "coordination", "motor learning"], "Give one example of a movement that would become clumsy if predictive calibration failed.", "network"),
      lesson("s3", 6, "Disorders of the Motor System", "Lesion patterns separate upper motor neuron, lower motor neuron, basal ganglia, cerebellar, and neuromuscular problems. Symptoms are clues to which level of control is disrupted.", ["weakness and tone", "tremor and ataxia", "localization"], "Start from a sign—weakness, rigidity, or incoordination—and name a plausible level of the system to inspect.", "brain"),
      lesson("s3", 7, "Ocular Motor System", "Eye movements are an elegant motor system because their goal is measurable: put an image on the fovea and keep it stable despite movement.", ["saccades", "smooth pursuit", "fixation"], "Choose the eye movement used to follow a bird in flight versus jump to a word on a page.", "pathway"),
      lesson("s3", 8, "Ocular Motor Control", "Ocular motor control blends brainstem circuits, cortex, cerebellum, and vestibular input to coordinate both eyes and stabilize vision.", ["conjugate gaze", "neural integrator", "vestibular interaction"], "Explain why moving only one eye is usually a coordination problem, not an isolated muscle story.", "network"),
    ],
  },
  {
    id: "s4",
    number: "04",
    title: "Homeostasis & higher brain functions",
    short: "Regulation, emotion, memory, language, and the changing brain",
    color: "violet",
    premise: "The brain must regulate the body while constructing goals, memories, language, and decisions. These are connected constraints, not isolated topics.",
    lessons: [
      lesson("s4", 1, "Hypothalamus: Structural Organization", "The hypothalamus is compact but strategically placed to integrate internal signals and coordinate endocrine, autonomic, and behavioral responses.", ["nuclei and zones", "internal-state sensing", "control outputs"], "Why does a small structure need unusually broad connections to regulate the body?", "brain"),
      lesson("s4", 2, "Hypothalamic Control of Pituitary Hormones", "Hypothalamic signals control the pituitary through releasing factors and neural secretion, linking brain state to slower, body-wide hormonal actions.", ["anterior pituitary", "posterior pituitary", "feedback loops"], "Compare a releasing hormone pathway with a hormone released directly from hypothalamic neurons.", "pathway"),
      lesson("s4", 3, "Central Control of the Autonomic Nervous System & Thermoregulation", "Autonomic control continuously adjusts cardiovascular, digestive, and temperature systems. Thermoregulation is a model of feedback, set points, and coordinated effectors.", ["sympathetic and parasympathetic", "negative feedback", "heat production and loss"], "Write the feedback loop for body temperature: sensor, comparator, effectors, and result.", "network"),
      lesson("s4", 4, "Central Control of Feeding Behavior", "Feeding combines energy signals, reward, learning, social context, and prediction. Hunger is therefore a regulated state, not a single switch.", ["homeostatic signals", "reward value", "energy balance"], "Explain one reason a person might eat when they are not in an energy deficit.", "network"),
      lesson("s4", 5, "Limbic System: Hippocampus", "The hippocampus supports relational and episodic memory by binding elements of an experience into a context-rich representation that can later be retrieved.", ["episodic binding", "spatial coding", "consolidation"], "How is remembering a route to a café different from recognizing the café's logo?", "brain"),
      lesson("s4", 6, "Limbic System: Amygdala", "The amygdala helps detect and learn the significance of stimuli, especially when they predict threat, reward, or uncertainty. It does not equal a single emotion.", ["salience learning", "fear conditioning", "context and regulation"], "Replace 'the amygdala is fear' with a more accurate one-sentence description.", "brain"),
      lesson("s4", 7, "Learning and Memory", "Memory is a family of processes: working, episodic, semantic, procedural, and emotional memory use overlapping but nonidentical circuits and mechanisms.", ["encoding and retrieval", "systems consolidation", "multiple memory systems"], "Sort three everyday memories into types and name what makes each type different.", "network"),
      lesson("s4", 8, "Higher Cortical Functions: Language", "Language requires distributed perception, production, meaning, attention, and motor planning. Lesions reveal components, but real language emerges from networks.", ["comprehension and production", "aphasia", "distributed language network"], "Contrast a problem understanding words with a problem producing fluent, meaningful speech.", "brain"),
      lesson("s4", 9, "Higher Cortical Functions: Association and Executive Processing", "Association cortex integrates information across modalities; executive processing maintains goals, selects rules, inhibits distractions, and changes strategy when the task changes.", ["working memory", "cognitive control", "flexible rule use"], "Describe a task that requires holding a goal while suppressing a tempting but irrelevant response.", "network"),
      lesson("s4", 10, "CNS Aging and Alzheimer's Disease", "Aging changes brain systems unevenly. Alzheimer's disease involves specific molecular pathology and network vulnerability; it should not be confused with ordinary forgetfulness.", ["normal aging vs disease", "protein pathology", "network vulnerability"], "State one difference between a risk factor, a biomarker, and a clinical symptom.", "brain"),
      lesson("s4", 11, "Blood Brain Barrier and Cerebral Metabolism", "The brain has high energy needs and a tightly regulated environment. The blood–brain barrier selects passage; blood flow and metabolism must match activity without destabilizing tissue.", ["barrier selectivity", "neurovascular coupling", "glucose and oxygen use"], "Why does protecting brain chemistry require a barrier that is selective rather than simply closed?", "pathway"),
      lesson("s4", 12, "Neurotransmitter and Cell Death", "Cells can die through regulated and damaging processes. Excitotoxicity, oxidative stress, trophic support, and inflammation help explain why injury may unfold over time.", ["apoptosis and necrosis", "excitotoxicity", "cellular vulnerability"], "Explain how a useful excitatory transmitter can become harmful under extreme conditions.", "synapse"),
    ],
  },
];

export const lessons = sections.flatMap((section) => section.lessons.map((item, index) => ({
  ...item,
  sectionId: section.id,
  sectionTitle: section.title,
  sectionNumber: section.number,
  lessonNumber: index + 1,
  sectionColor: section.color,
})));

export const lessonCount = lessons.length;
