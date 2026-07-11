(function () {
  const scoringRules = {
    A: { name: "Part A", count: 20, attemptLimit: 15, correct: 2, wrong: -0.5 },
    B: { name: "Part B", count: 40, attemptLimit: 35, correct: 2, wrong: -0.5 },
    C: { name: "Part C", count: 40, attemptLimit: 25, correct: 4, wrong: -1 }
  };

  const sectionNames = {
    A: "General aptitude",
    B: "Life sciences concepts",
    C: "Analysis and application"
  };

  const explanationGuides = {
    "serial dilution": {
      formula: "Final dilution = D1 x D2 x ... x Dn",
      components: "D values are the denominator values in each 1:D dilution step.",
      use: "Use this when a diluted sample is diluted again; sequential dilution factors multiply."
    },
    "buffer calculation": {
      formula: "C1V1 = C2V2",
      components: "C1 is stock concentration, V1 is stock volume, C2 is final concentration, and V2 is final volume.",
      use: "Use this for preparing a lower-concentration working solution from a concentrated stock."
    },
    "standard curve": {
      formula: "signal = slope x concentration + intercept",
      components: "If the intercept is zero, concentration = signal / slope.",
      use: "Use this when absorbance or fluorescence is calibrated against known standards."
    },
    "cell doubling": {
      formula: "N = N0 x 2^n",
      components: "N0 is starting cell number and n is the number of doublings.",
      use: "Use this for ideal exponential growth when each cycle doubles the population."
    },
    "probability multiplication": {
      formula: "P(A and B and C) = P(A) x P(B) x P(C)",
      components: "The multiplication rule applies only when the events are independent.",
      use: "Use this for independent biological outcomes such as independent seed germination events."
    },
    "percentage w/v": {
      formula: "percent w/v = grams solute per 100 mL solution",
      components: "1 percent w/v means 1 g in 100 mL; scale grams in direct proportion to volume.",
      use: "Use this for agarose, salts, and other mass-per-volume solution recipes."
    },
    "pH scale": {
      formula: "pH = -log10[H+]",
      components: "A decrease of 1 pH unit means a 10-fold increase in hydrogen ion concentration.",
      use: "Use this for comparing acidity when pH values differ by whole units."
    },
    "B-DNA turns": {
      formula: "turns = base pairs / 10",
      components: "B-DNA has about 10 base pairs per helical turn.",
      use: "Use this for approximate helical-turn estimates in standard B-form DNA."
    },
    "protein stock": {
      formula: "volume = mass / concentration",
      components: "Mass is the protein amount needed and concentration is mass per volume.",
      use: "Use this when taking a measured amount of protein from a stock solution."
    },
    "percent increase": {
      formula: "percent increase = (new value - original value) / original value x 100",
      components: "The denominator is always the starting value, not the final value.",
      use: "Use this when comparing a biological measurement before and after a change."
    },
    "z-score": {
      formula: "z = (x - mean) / standard deviation",
      components: "x is the observed value; the z-score tells how many standard deviations x is from the mean.",
      use: "Use this to standardize measurements drawn from a normal-like distribution."
    },
    "microscope magnification": {
      formula: "total magnification = objective magnification x eyepiece magnification",
      components: "The objective and eyepiece magnifications compound multiplicatively.",
      use: "Use this for light microscope magnification questions."
    },
    "od doubling": {
      formula: "OD after n doublings = starting OD x 2^n",
      components: "OD is used as a proxy for cell density in the linear measuring range.",
      use: "Use this only while OD is proportional to cell number; saturated cultures do not follow it well."
    },
    "odds": {
      formula: "odds against = P(not event) : P(event)",
      components: "P(not event) equals 1 - P(event).",
      use: "Use this when probability must be converted into an odds ratio."
    },
    "competitive inhibition": {
      formula: "v = Vmax[S] / (Km + [S])",
      components: "Competitive inhibitors increase apparent Km because more substrate is needed; Vmax is unchanged at saturating substrate.",
      use: "Use this when inhibitor and substrate compete for the active site."
    },
    "enzyme inhibition": {
      formula: "v = Vmax[S] / (Km + [S])",
      components: "Km reflects the substrate concentration giving half-maximal velocity; Vmax is the maximum velocity at saturating substrate.",
      use: "Use Km/Vmax changes to identify competitive, noncompetitive, uncompetitive, or mixed inhibition."
    },
    "Hardy-Weinberg heterozygotes": {
      formula: "p + q = 1; genotype frequencies are p^2, 2pq, q^2",
      components: "p and q are allele frequencies; 2pq is the heterozygote frequency.",
      use: "Use this under Hardy-Weinberg assumptions: random mating, no selection, no migration, no mutation, and large population size."
    },
    "recessive phenotype calculation": {
      formula: "q = sqrt(q^2); carriers = 2pq",
      components: "For a recessive phenotype, affected frequency equals q^2, not q.",
      use: "Use this when a rare recessive trait frequency is given and carrier frequency is requested."
    },
    "linkage mapping": {
      formula: "recombination frequency = recombinant offspring / total offspring x 100",
      components: "One percent recombination is approximately one map unit or centimorgan.",
      use: "Use this when progeny classes from a test cross are counted."
    },
    "mark recapture": {
      formula: "N = M x C / R",
      components: "M is first marked, C is captured later, and R is marked individuals recaptured.",
      use: "Use this when marked individuals mix randomly before a second capture."
    },
    "X-linked recessive": {
      formula: "Father gives X to daughters and Y to sons",
      components: "An affected male passes his X-linked allele to every daughter but to no sons.",
      use: "Use this for pedigree questions involving affected fathers and X-linked recessive alleles."
    },
    "G alpha s": {
      pathway: "GPCR activation can load G alpha s with GTP; active G alpha s stimulates adenylyl cyclase, increasing cAMP and PKA signaling.",
      use: "Use this when a question locks G alpha s in an active GTP-bound state or asks about cAMP output."
    },
    "kinase-dead RTK": {
      pathway: "Ligand-bound RTKs normally dimerize and autophosphorylate tyrosines, creating docking sites for SH2/PTB-domain proteins such as Ras/MAPK pathway adaptors.",
      use: "Use this when ligand binding occurs but receptor kinase activity is lost."
    },
    "JAK-STAT": {
      pathway: "Cytokine receptors activate JAKs, phosphorylated receptor tails recruit STATs, and STAT dimers enter the nucleus to regulate transcription.",
      use: "Use this when receptor phosphorylation or STAT docking is altered."
    },
    "Na/K ATPase": {
      formula: "3 Na+ out, 2 K+ in, 1 ATP hydrolyzed",
      components: "The unequal ion exchange makes the pump electrogenic and helps maintain resting membrane potential.",
      use: "Use this for membrane potential, ion gradient, and epithelial transport questions."
    },
    "normal distribution": {
      formula: "Empirical rule: 68 percent, 95 percent, 99.7 percent within 1, 2, 3 standard deviations",
      components: "The percentages apply to an approximately normal distribution.",
      use: "Use this for quick probability estimates around a mean."
    }
  };

  const partAGenerators = [
    {
      concept: "serial dilution",
      repeat: 4,
      build(i) {
        const a = 10 + (i % 6) * 10;
        const b = 5 + (i % 5);
        const value = a * b;
        return q(`A 1:${a} dilution is followed by a 1:${b} dilution. What is the final dilution?`, `1:${value}`, [`1:${a + b}`, `1:${a}`, `1:${value * 10}`], "Dilution factors multiply during serial dilution.");
      }
    },
    {
      concept: "buffer calculation",
      repeat: 3,
      build(i) {
        const stock = 10 + (i % 5) * 5;
        const vol = 100;
        const ans = Number((vol / stock).toFixed(2));
        return q(`How much ${stock}x stock is needed to prepare ${vol} mL of 1x buffer?`, `${ans} mL`, [`${ans * 2} mL`, `${Math.max(1, ans / 2)} mL`, `${stock} mL`], "Use C1V1 = C2V2; stock volume is final volume divided by stock strength.");
      }
    },
    {
      concept: "Chargaff rule",
      repeat: 4,
      build(i) {
        const a = 20 + (i % 11);
        const g = 50 - a;
        return q(`A double-stranded DNA sample has ${a} percent adenine. What is the expected guanine percentage?`, `${g} percent`, [`${a} percent`, `${100 - a} percent`, `${50 + a} percent`], "In double-stranded DNA, A pairs with T and G pairs with C; A + G must equal 50 percent.");
      }
    },
    {
      concept: "standard curve",
      repeat: 3,
      build(i) {
        const slope = 0.02 + (i % 4) * 0.005;
        const absorbance = 0.4 + (i % 5) * 0.1;
        const ans = Number((absorbance / slope).toFixed(1));
        return q(`A standard curve has slope ${slope.toFixed(3)} absorbance per uM. What concentration gives absorbance ${absorbance.toFixed(2)}?`, `${ans} uM`, [`${(ans / 2).toFixed(1)} uM`, `${(ans * 2).toFixed(1)} uM`, `${(absorbance * slope).toFixed(3)} uM`], "For a straight-line standard curve through the origin, concentration equals absorbance divided by slope.");
      }
    },
    {
      concept: "cell doubling",
      repeat: 3,
      build(i) {
        const start = (1 + (i % 5)) * 100000;
        const doublings = 2 + (i % 4);
        const ans = start * 2 ** doublings;
        return q(`A culture starts with ${start.toExponential(1)} cells and doubles ${doublings} times. What is the final cell number?`, ans.toExponential(1), [(start * 2).toExponential(1), (start * 4).toExponential(1), (ans / 2).toExponential(1)], "Each doubling multiplies the population by 2.");
      }
    },
    {
      concept: "probability multiplication",
      repeat: 3,
      build(i) {
        const p = 0.55 + (i % 6) * 0.05;
        const ans = Number((p ** 3).toFixed(3));
        return q(`If seed germination probability is ${p.toFixed(2)}, what is the probability that three independent seeds all germinate?`, `${ans}`, [`${p.toFixed(3)}`, `${(1 - p).toFixed(3)}`, `${(3 * p).toFixed(3)}`], "For independent events, multiply the individual probabilities.");
      }
    },
    {
      concept: "median",
      repeat: 2,
      build(i) {
        const mid = 5 + (i % 9);
        return q(`What is the median of ${mid - 4}, ${mid - 2}, ${mid}, ${mid + 3}, ${mid + 15}?`, `${mid}`, [`${mid - 2}`, `${mid + 3}`, `${mid + 15}`], "The median is the middle value after ordering five observations.");
      }
    },
    {
      concept: "percentage w/v",
      repeat: 3,
      build(i) {
        const pct = 1 + (i % 5);
        const vol = 100 + (i % 4) * 50;
        const ans = (pct * vol) / 100;
        return q(`A ${pct} percent w/v agarose solution is prepared in ${vol} mL. How many grams agarose are needed?`, `${ans} g`, [`${ans / 2} g`, `${ans * 10} g`, `${pct + vol / 100} g`], "Percent w/v means grams per 100 mL.");
      }
    },
    {
      concept: "pH scale",
      repeat: 4,
      build(i) {
        const shift = 1 + (i % 3);
        return q(`A solution changes from pH 7 to pH ${7 - shift}. How does hydrogen ion concentration change?`, `${10 ** shift}-fold higher`, [`${shift}-fold higher`, `${10 ** (shift + 1)}-fold lower`, `No change`], "A one-unit pH decrease means a tenfold increase in hydrogen ion concentration.");
      }
    },
    {
      concept: "B-DNA turns",
      repeat: 2,
      build(i) {
        const bp = 1000 + (i % 7) * 250;
        const ans = bp / 10;
        return q(`Approximately how many turns are present in ${bp} bp of B-DNA if one turn is 10 bp?`, `${ans}`, [`${ans / 2}`, `${ans * 2}`, `${bp}`], "B-DNA has roughly 10 base pairs per helical turn.");
      }
    },
    {
      concept: "specificity",
      repeat: 2,
      build(i) {
        const sp = 90 + (i % 8);
        return q(`A diagnostic test has ${sp} percent specificity. What does this mean?`, `It correctly identifies ${sp} percent of non-diseased individuals`, [`It detects ${sp} percent of diseased individuals`, `It has ${sp} percent false positives`, `It cannot have false negatives`], "Specificity measures the true-negative rate.");
      }
    },
    {
      concept: "normal distribution",
      repeat: 2,
      build() {
        return q("Approximately what percentage of observations in a normal distribution lies within one standard deviation of the mean?", "68 percent", ["34 percent", "95 percent", "99.7 percent"], "The empirical rule places about 68 percent within one standard deviation.");
      }
    },
    {
      concept: "protein stock",
      repeat: 2,
      build(i) {
        const conc = 4 + (i % 7);
        const mass = 8 + (i % 6) * 2;
        const ans = Number((mass / conc).toFixed(2));
        return q(`A protein stock is ${conc} mg/mL. What volume contains ${mass} mg protein?`, `${ans} mL`, [`${(ans * 10).toFixed(2)} mL`, `${(ans / 2).toFixed(2)} mL`, `${(conc / mass).toFixed(2)} mL`], "Volume equals required mass divided by concentration.");
      }
    },
    {
      concept: "percent increase",
      repeat: 2,
      build(i) {
        const start = 100 + (i % 8) * 50;
        const increase = 25 + (i % 4) * 25;
        const ans = Number(((increase / start) * 100).toFixed(1));
        return q(`A population increases from ${start} to ${start + increase}. What is the percent increase?`, `${ans} percent`, [`${increase} percent`, `${(ans * 2).toFixed(1)} percent`, `${(ans / 2).toFixed(1)} percent`], "Percent increase is change divided by original value, multiplied by 100.");
      }
    },
    {
      concept: "z-score",
      repeat: 2,
      build(i) {
        const mean = 50 + (i % 4) * 5;
        const sd = 5;
        const z = 1 + (i % 3);
        const value = mean + z * sd;
        return q(`A value is ${value}, mean is ${mean}, and standard deviation is ${sd}. What is the z-score?`, `${z}`, [`${z + 1}`, `${value - mean}`, `${mean / sd}`], "A z-score equals value minus mean divided by standard deviation.");
      }
    },
    {
      concept: "microscope magnification",
      repeat: 2,
      build(i) {
        const obj = [10, 20, 40, 60][i % 4];
        const eye = 10;
        return q(`A microscope uses a ${obj}x objective and ${eye}x eyepiece. What is total magnification?`, `${obj * eye}x`, [`${obj + eye}x`, `${obj}x`, `${obj * eye * 10}x`], "Total magnification is objective magnification multiplied by eyepiece magnification.");
      }
    },
    {
      concept: "od doubling",
      repeat: 2,
      build(i) {
        const od = 0.2 + (i % 4) * 0.1;
        return q(`A culture OD doubles from ${od.toFixed(1)} in 30 minutes. What OD is expected after two more doublings?`, `${(od * 4).toFixed(1)}`, [`${(od * 2).toFixed(1)}`, `${(od + 0.2).toFixed(1)}`, `${(od * 8).toFixed(1)}`], "Two additional doublings multiply the starting OD by 4.");
      }
    },
    {
      concept: "odds",
      repeat: 2,
      build(i) {
        const p = [0.25, 0.2, 0.4, 0.1][i % 4];
        const against = Math.round((1 - p) / p);
        return q(`If an event has probability ${p}, what are the odds against occurrence?`, `${against}:1`, [`1:${against}`, `${against + 1}:1`, `1:1`], "Odds against compare probability of non-occurrence to probability of occurrence.");
      }
    },
    {
      concept: "gel migration",
      repeat: 3,
      build() {
        return q("Why does a 500 bp DNA fragment migrate farther than a 1000 bp fragment in agarose gel?", "Smaller DNA fragments move faster through the gel matrix", ["Larger fragments have no charge", "DNA migrates toward the negative electrode", "Ethidium bromide digests larger DNA"], "DNA has a similar charge-to-mass ratio, so size mainly determines migration through agarose.");
      }
    },
    {
      concept: "centrifugation",
      repeat: 2,
      build() {
        return q("A larger pellet forms after increasing centrifugation speed. What does the pellet represent?", "Material sedimented by centrifugal force", ["Only dissolved salts", "Only gases", "Material prevented from sedimenting"], "Centrifugation sediments particles according to size, density, and applied force.");
      }
    }
  ];

  const lifeTopics = [
    ["B","Molecular biology","DNA topoisomerase",4,"Which enzyme relieves torsional strain ahead of a replication fork?","DNA topoisomerase",["DNA ligase","Primase","Telomerase"],"Topoisomerases cut and rejoin DNA to remove supercoils.","Ligase seals DNA nicks; primase makes RNA primers; telomerase extends telomeres."],
    ["B","Molecular biology","Okazaki fragments",4,"Okazaki fragments are produced during synthesis of which strand?","Lagging strand",["Leading strand","Template strand only","rRNA strand"],"The lagging strand is synthesized discontinuously as Okazaki fragments.","The leading strand is synthesized continuously."],
    ["B","Gene expression","Shine-Dalgarno sequence",4,"The Shine-Dalgarno sequence is involved in which process?","Prokaryotic translation initiation",["Eukaryotic mRNA splicing","Protein glycosylation","DNA repair in mitochondria"],"It pairs with 16S rRNA to position the bacterial ribosome.","It is not a splice signal or glycosylation tag."],
    ["B","Gene expression","TATA-binding protein",3,"TATA-binding protein mainly helps assemble which complex?","Transcription pre-initiation complex",["Replication fork","Spliceosome active site","Proteasome core"],"TBP helps recruit general transcription factors and RNA polymerase II.","Replication, splicing, and proteolysis use different complexes."],
    ["B","Genetics","Genetic code degeneracy",4,"Degeneracy of the genetic code means what?","More than one codon can specify the same amino acid",["One codon specifies many amino acids","Codons overlap during translation","Stop codons encode modified amino acids"],"Several amino acids are encoded by multiple codons.","A codon normally specifies one amino acid or termination."],
    ["B","Genetics","Wobble base pairing",3,"The wobble position usually corresponds to which codon position?","Third base of the codon",["First base of the codon","Second base of the codon","Peptide-bond position"],"Flexibility at the third codon position allows one tRNA to read multiple codons.","The first two codon positions are usually more stringent."],
    ["B","Gene regulation","lac operon induction",4,"The lac operon is maximally expressed under which condition?","Lactose present and glucose absent",["Lactose absent and glucose present","Both glucose and lactose absent","Repressor bound to operator"],"Lactose inactivates the repressor and low glucose raises cAMP-CAP activation.","Glucose represses lac expression through catabolite repression."],
    ["B","Gene regulation","CAP-cAMP",3,"cAMP-CAP activates transcription most strongly when glucose is:","Low",["High","Converted into lactose","Bound to the operator"],"Low glucose increases cAMP, allowing CAP to stimulate transcription.","High glucose lowers cAMP and reduces CAP activity."],
    ["B","Biochemistry","competitive inhibition",4,"A competitive inhibitor usually changes which enzyme parameter?","Increases apparent Km without changing Vmax",["Decreases Vmax without changing Km","Decreases both Km and Vmax","Increases Vmax only"],"Competitive inhibition can be overcome by high substrate concentration, so Vmax is unchanged.","Vmax reduction is typical of noncompetitive or mixed inhibition."],
    ["B","Biochemistry","allosteric site",3,"An allosteric regulator usually binds where?","A site distinct from the active site",["The ribosomal A site","The peptide bond only","The anticodon loop"],"Allosteric regulation occurs through binding at a regulatory site.","The active site binds substrate; ribosomal and anticodon sites are unrelated."],
    ["B","Bioenergetics","oxygen as final acceptor",4,"The final electron acceptor in aerobic respiration is:","Oxygen",["NADH","Succinate","ATP"],"Oxygen accepts electrons at complex IV and is reduced to water.","NADH and succinate donate electrons upstream."],
    ["B","Bioenergetics","complex III",3,"Cytochrome c receives electrons most directly from:","Complex III",["Complex I","Complex II","ATP synthase"],"Complex III transfers electrons to cytochrome c.","Complex I and II feed electrons into the quinone pool."],
    ["B","Bioenergetics","ATP synthase",4,"The proton gradient across the inner mitochondrial membrane is used by:","ATP synthase",["Rubisco","DNA polymerase","Peptidyl transferase"],"ATP synthase couples proton flow to ATP formation.","Rubisco and polymerases do not use the mitochondrial proton gradient."],
    ["B","Photosynthesis","Calvin cycle location",3,"The Calvin cycle occurs in the:","Chloroplast stroma",["Thylakoid lumen","Mitochondrial matrix","Peroxisomal core"],"Carbon fixation reactions of the Calvin cycle occur in the stroma.","Light-driven proton accumulation occurs in the thylakoid lumen."],
    ["B","Photosynthesis","Rubisco",4,"Rubisco catalyzes carboxylation of:","Ribulose-1,5-bisphosphate",["Glucose-6-phosphate","Oxaloacetate","Phosphoenolpyruvate"],"Rubisco fixes CO2 onto ribulose-1,5-bisphosphate.","The other metabolites belong to different pathways."],
    ["B","Photosynthesis","photosystem II",3,"Photolysis of water is associated with:","Photosystem II",["Photosystem I only","Rubisco active site","Mitochondrial complex IV"],"The oxygen-evolving complex of photosystem II splits water.","Photosystem I receives electrons downstream."],
    ["B","Plant physiology","abscisic acid",3,"Which plant hormone promotes stomatal closure during water stress?","Abscisic acid",["Auxin","Gibberellin","Cytokinin"],"ABA accumulates during drought and promotes guard-cell ion changes leading to closure.","Auxin and gibberellin regulate growth processes more directly."],
    ["B","Plant physiology","ethylene",2,"Fruit ripening in many climacteric fruits is promoted by:","Ethylene",["Abscisic acid only","Florigen","Strigolactone"],"Ethylene is a gaseous hormone central to climacteric fruit ripening.","Florigen is linked to flowering, not ripening."],
    ["B","Plant physiology","phytochrome",4,"Red/far-red reversible light responses are mediated mainly by:","Phytochrome",["Phototropin only","Rubisco","Nitrogenase"],"Phytochrome interconverts between red- and far-red-absorbing forms.","Phototropins mainly mediate blue-light responses."],
    ["B","Plant physiology","vernalization",3,"Vernalization refers to flowering promoted by:","Prolonged cold exposure",["High salt exposure","Mechanical injury","Brief darkness"],"Some plants require a cold period to become competent to flower.","This is distinct from photoperiodic night-length sensing."],
    ["B","Genetics","meiotic crossing over",4,"Crossing over during meiosis occurs mainly in:","Pachytene",["Leptotene","Anaphase II","Telophase I"],"Homologous chromosomes recombine during pachytene of prophase I.","Anaphase II separates sister chromatids."],
    ["B","Population genetics","Hardy-Weinberg heterozygotes",4,"For allele frequencies p and q, expected heterozygote frequency is:","2pq",["p squared","q squared","p plus q"],"Hardy-Weinberg genotype frequencies are p2, 2pq, and q2.","p2 and q2 are homozygote frequencies."],
    ["B","Evolution","genetic drift",3,"Random change in allele frequency is called:","Genetic drift",["Stabilizing selection","Epistasis","Codominance"],"Drift is stochastic and strongest in small populations.","Selection is nonrandom differential reproductive success."],
    ["B","Evolution","bottleneck effect",3,"Loss of variation after a severe population crash is called:","Bottleneck effect",["Gene conversion","Balanced translocation","Adaptive radiation only"],"A bottleneck samples only part of the original genetic variation.","Adaptive radiation is diversification into ecological niches."],
    ["B","Evolution","founder effect",2,"Allele-frequency shifts in a new population started by few individuals reflect:","Founder effect",["Convergent evolution","Incomplete dominance","Transduction"],"The founder effect is drift caused by colonization by a small group.","Convergent evolution concerns similar adaptations in unrelated lineages."],
    ["B","Immunology","MHC class I",3,"MHC class I molecules present antigen mainly to:","CD8 T cells",["CD4 T cells","B cells only","Eosinophils only"],"CD8 T cells recognize peptides presented by MHC class I.","CD4 T cells recognize MHC class II."],
    ["B","Immunology","MHC class II",3,"MHC class II molecules are most directly recognized by:","CD4 T cells",["CD8 T cells only","Erythrocytes","Platelets"],"MHC class II presents extracellularly derived peptides to helper T cells.","Erythrocytes do not perform antigen presentation."],
    ["B","Immunology","IgG abundance",3,"The most abundant antibody class in serum is:","IgG",["IgE","IgD","Secretory IgA only"],"IgG is the dominant serum immunoglobulin in secondary responses.","IgA is prominent at mucosal surfaces."],
    ["B","Immunology","V(D)J recombination",4,"Antibody variable-region diversity is generated in part by:","V(D)J recombination",["Binary fission","Reverse transcription only","RNA editing of all exons"],"Developing lymphocytes recombine V, D, and J gene segments.","This is not bacterial cell division or retroviral copying."],
    ["B","Immunology","complement C3",2,"A central component common to major complement pathways is:","C3",["IgE","Histamine","Interleukin-2"],"C3 cleavage is a key convergence point in complement activation.","IgE and histamine are prominent in allergic responses."],
    ["B","Cell biology","apoptosis caspases",4,"Executioner caspases are most directly involved in:","Apoptosis",["Glycolysis","DNA replication initiation","Photosynthetic electron flow"],"Caspases cleave cellular proteins during programmed cell death.","They are not enzymes of glycolysis or photosynthesis."],
    ["B","Cell cycle","p53",4,"p53 is best known for regulating:","DNA damage response and cell-cycle arrest",["Peptidoglycan synthesis","Starch breakdown","Light harvesting"],"p53 can induce arrest, repair, senescence, or apoptosis after damage.","Peptidoglycan synthesis is bacterial cell-wall biology."],
    ["B","Cell cycle","cyclins",3,"Cyclin-dependent kinases are regulated mainly by binding to:","Cyclins",["Okazaki fragments","tRNA synthetases","Microtubule motors only"],"Cyclin binding activates and times CDK activity.","Okazaki fragments are DNA replication intermediates."],
    ["B","Cytoskeleton","microtubules",4,"Chromosome movement during mitosis depends strongly on:","Microtubules",["Cellulose microfibrils","Peptidoglycan","Intermediate filaments only"],"Spindle microtubules attach to kinetochores and segregate chromosomes.","Cellulose and peptidoglycan are wall polymers."],
    ["B","Cytoskeleton","actin",3,"Actin filaments are especially important for:","Cell motility and cytokinesis",["DNA methylation only","mRNA capping","Electron transfer to oxygen"],"Actin drives cell shape, movement, and contractile ring function.","DNA methylation and mRNA capping are nuclear processes."],
    ["B","Cell biology","Golgi apparatus",3,"The Golgi apparatus is most directly involved in:","Protein modification and sorting",["DNA replication","ATP generation by chemiosmosis","Spindle checkpoint only"],"Golgi compartments modify and route secretory and membrane proteins.","ATP generation by chemiosmosis occurs in mitochondria and chloroplasts."],
    ["B","Protein targeting","ER signal peptide",3,"A signal peptide on a nascent protein commonly directs it to the:","Endoplasmic reticulum",["Nucleolus","Peroxisomal matrix only","Bacterial nucleoid"],"Signal recognition particle targets ribosome-nascent chain complexes to the ER.","The nucleolus is involved in ribosome biogenesis."],
    ["B","Protein targeting","KDEL retrieval",2,"KDEL-like sequences are associated with retrieval to the:","Endoplasmic reticulum",["Plasma membrane exterior","Mitochondrial matrix","Chloroplast thylakoid lumen"],"KDEL is an ER retrieval signal for soluble ER-resident proteins.","Mitochondrial proteins use different targeting sequences."],
    ["B","Protein targeting","nuclear localization signal",3,"A nuclear localization signal promotes import into the:","Nucleus",["Lysosome","Golgi lumen","Extracellular matrix"],"NLS motifs are recognized by nuclear import machinery.","Secretory pathway signals differ from NLS motifs."],
    ["B","Molecular tools","RNA interference",3,"siRNA usually reduces gene expression by:","Sequence-specific mRNA degradation or translational repression",["Permanent chromosomal deletion","Increasing promoter strength","Blocking all ribosomes nonspecifically"],"siRNA guides RNA-induced silencing complexes to complementary RNA.","It does not edit the genome by itself."],
    ["B","Genome editing","CRISPR knockout",4,"A one-base insertion early in a coding sequence often causes:","Frameshift loss of function",["Silent change in all cases","Increased enhancer activity","Chromosome nondisjunction only"],"Indels not divisible by three can shift the reading frame.","Silent mutations do not alter encoded amino acids."],
    ["B","RNA processing","spliceosome",3,"The spliceosome removes:","Introns from pre-mRNA",["Promoters from DNA","Exons from mature proteins","Poly-A tails from all mRNA"],"Splicing joins exons and removes introns.","Promoters are DNA regulatory regions, not spliceosome substrates."],
    ["B","Chromosome biology","telomerase",3,"Telomerase extends chromosome ends using:","An internal RNA template",["A protein template","Random amino acids","rRNA as primer only"],"Telomerase is a ribonucleoprotein reverse transcriptase.","It does not use amino acids as templates."],
    ["B","DNA repair","nucleotide excision repair",3,"Bulky UV-induced thymine dimers are mainly removed by:","Nucleotide excision repair",["Translation proofreading","tRNA editing","Noncoding RNA methylation only"],"NER removes bulky helix-distorting lesions such as thymine dimers.","Mismatch repair handles replication mismatches."],
    ["B","DNA repair","mismatch repair",3,"Defective mismatch repair can cause:","Microsatellite instability",["Loss of all histones","Failure of photosynthesis","Excess chlorophyll synthesis"],"Short repeat tracts are especially sensitive to mismatch repair defects.","This is unrelated to chlorophyll synthesis."],
    ["B","Molecular biology","reverse transcriptase",2,"Reverse transcriptase synthesizes:","DNA from RNA",["RNA from protein","Protein from DNA","Lipid from RNA"],"Reverse transcriptase copies RNA into DNA.","Translation makes protein from mRNA."],
    ["B","Molecular tools","restriction enzymes",2,"Type II restriction enzymes generally recognize:","Specific DNA sequences",["Protein phosphorylation sites","Membrane lipids","mRNA caps"],"They cut DNA at or near specific recognition sequences.","They do not recognize protein modification sites."],
    ["B","Methods","SDS-PAGE",3,"SDS-PAGE separates denatured proteins primarily by:","Molecular mass",["Native charge only","mRNA length","Enzyme activity"],"SDS gives proteins a similar charge-to-mass ratio.","Native charge is masked by SDS."],
    ["B","Methods","western blot",3,"A western blot primarily detects:","Specific proteins",["Specific lipids only","Respiration rate","Cell morphology only"],"Antibodies are used to detect target proteins on a membrane.","It is not a direct assay of respiration."],
    ["B","Methods","ELISA",3,"ELISA commonly detects antigen or antibody using:","Enzyme-linked signal amplification",["Agarose DNA migration only","Ultracentrifugation only","Chromosome painting only"],"An enzyme-conjugated reagent converts substrate to a measurable signal.","Agarose migration is used in gel electrophoresis."],
    ["B","Methods","PCR contamination",2,"Amplification in a PCR no-template control most strongly suggests:","Contamination",["Correct negative result","No primer binding","Complete enzyme failure"],"A no-template control should not produce the target band.","A band indicates contaminating template or amplicon."],
    ["B","Methods","cDNA library",3,"A cDNA library represents:","Expressed transcripts converted into DNA",["All introns and promoters equally","Only centromeric DNA","Only mitochondrial proteins"],"cDNA is made from mRNA, so it reflects expressed genes.","Genomic libraries contain introns and promoters."],
    ["B","Genomics","ChIP-seq",3,"ChIP-seq is used to identify:","Genomic binding sites of DNA-associated proteins",["Protein half-life only","Membrane potential","Amino acid composition only"],"ChIP enriches DNA fragments bound by a protein of interest.","It is not a protein degradation assay."],
    ["B","Genomics","ATAC-seq",2,"ATAC-seq commonly maps:","Open chromatin regions",["Mitochondrial ATP concentration","Antibody affinity only","Ribosome molecular weight"],"Transposase accessibility reveals chromatin openness.","Antibody affinity requires different assays."],
    ["B","Methods","yeast two-hybrid",2,"A yeast two-hybrid assay tests for:","Protein-protein interaction",["DNA base composition","Membrane fluidity only","Glucose uptake only"],"Interaction reconstitutes transcription factor activity in yeast.","It is not a sequencing assay."],
    ["B","Methods","FRAP",2,"FRAP recovery after bleaching measures:","Molecular mobility or diffusion",["DNA replication rate","Protein sequence","Cell viability only"],"Recovery depends on movement of unbleached fluorescent molecules.","It does not reveal amino acid sequence."],
    ["B","Neurobiology","tetrodotoxin",3,"Tetrodotoxin blocks action potentials by inhibiting:","Voltage-gated sodium channels",["Ligand-gated chloride channels only","Gap junction proteins only","Mitochondrial ribosomes"],"Voltage-gated Na+ influx is required for action potential upstroke.","Mitochondrial ribosomes do not conduct action potentials."],
    ["B","Physiology","Na/K ATPase",3,"The sodium-potassium pump normally moves:","3 Na+ out and 2 K+ in",["2 Na+ out and 3 K+ in","3 K+ out and 2 Na+ in","Equal Na+ and K+ both directions"],"Na/K ATPase exports three sodium ions and imports two potassium ions per ATP.","The unequal exchange makes it electrogenic."],
    ["B","Evolution","endosymbiosis",3,"Mitochondrial endosymbiotic origin is supported by:","Circular DNA and bacterial-like ribosomes",["Absence of membranes","Cellulose cell wall","Nuclear spliceosomes"],"Mitochondria retain bacterial-like features.","Mitochondria are double-membraned, not membrane-free."],
    ["B","Microbiology","nitrogenase",3,"Nitrogenase is strongly inhibited by:","Oxygen",["Carbon dioxide only","Sucrose","Potassium ions"],"Nitrogenase is oxygen-sensitive, so nodules regulate oxygen exposure.","Carbon dioxide is not the main inhibitor."],
    ["B","Development","morphogen gradient",3,"A morphogen gradient gives positional information because cells respond to:","Different concentration thresholds",["Identical DNA sequences only","Random codon usage","Only osmotic pressure"],"Distinct morphogen concentrations activate different developmental programs.","Identical DNA does not by itself create positional differences."],
    ["B","Development","homeotic genes",3,"A mutation converting one segment identity into another affects:","Homeotic patterning genes",["Glycolysis enzymes only","Complement proteins","Restriction enzymes"],"Homeotic genes specify regional identity along the body plan.","Restriction enzymes cut DNA in molecular biology."],
    ["B","Cancer biology","cancer hallmark",3,"Sustained proliferative signaling is:","A cancer hallmark",["A photosynthetic adaptation","A form of codon wobble","A bacterial operon only"],"Cancer cells often acquire autonomous growth signaling.","Codon wobble concerns translation."],
    ["B","Physiology","hypoxia response",2,"Stabilization of HIF-1 alpha under low oxygen induces genes involved in:","Hypoxia response",["UV photorepair only","Complement lysis","Meiotic crossing over"],"HIF activates genes for adaptation to low oxygen.","It does not primarily regulate meiotic recombination."]
  ];

  const analysisTopics = [
    ["C","Biochemistry","enzyme inhibition",4,"An enzyme has higher apparent Km with unchanged Vmax after adding inhibitor X. What is X most likely to be?","Competitive inhibitor",["Uncompetitive inhibitor","Pure noncompetitive inhibitor","Allosteric activator"],"Competitive inhibition raises apparent Km but can be overcome at high substrate.","Uncompetitive inhibition lowers both Km and Vmax."],
    ["C","Genetics","linkage mapping",4,"Parental classes are much more frequent than recombinant classes in a test cross. What does this indicate?","The genes are linked",["The genes assort independently","The genes are on different chromosomes only","No recombination occurs in the organism"],"Excess parental types indicate linkage between loci.","Unlinked genes usually produce about 50 percent recombinants."],
    ["C","Population genetics","recessive phenotype calculation",4,"A recessive phenotype has frequency q squared. Which step estimates carrier frequency?","Find q by square root, then calculate 2pq",["Use q squared as carrier frequency","Use p squared as carrier frequency","Set p and q both to 0.5 always"],"Under Hardy-Weinberg, recessive phenotype equals q2 and carriers equal 2pq.","The phenotype frequency is not the heterozygote frequency."],
    ["C","Genetics","epistasis ratio",3,"A 9:3:4 dihybrid ratio most often suggests:","Recessive epistasis",["Codominance","Simple monohybrid inheritance","Maternal inheritance only"],"A 9:3:4 ratio occurs when homozygosity at one locus masks the second locus.","Monohybrid inheritance gives a 3:1 ratio."],
    ["C","Genetics","complementation test",3,"Two recessive mutants produce wild-type offspring when crossed. What is the best inference?","The mutations are in different genes",["The mutations are in the same codon","Both mutations are dominant","No mutation is present"],"Complementation occurs when each parent supplies the functional allele missing in the other.","Same-gene recessive mutations generally fail to complement."],
    ["C","Gene regulation","trans-acting lacI",4,"A lacI- mutant is rescued by a plasmid carrying lacI+. What does this show?","lacI encodes a trans-acting product",["lacI is strictly cis-acting","lacI is lactose permease","lacI is a ribosomal RNA"],"The LacI repressor protein can diffuse and act on another DNA molecule.","Cis-acting elements affect only the DNA molecule they are on."],
    ["C","Gene regulation","promoter mutation",3,"A promoter mutation reduces mRNA without changing coding sequence. What is the direct effect?","Reduced transcription initiation",["Altered amino acid sequence necessarily","Changed genetic code","Increased translation termination"],"Promoters regulate transcription initiation.","A coding-sequence change is not required."],
    ["C","Gene regulation","enhancer orientation",3,"An enhancer activates a reporter even when inverted. This supports:","Orientation-independent enhancer action",["Stop-codon readthrough","Operator repression only","RNA primer removal"],"Enhancers often act independent of orientation and at variable distances.","Stop codons and RNA primers are unrelated."],
    ["C","Protein targeting","NLS mutation",3,"A transcription factor lacking an NLS is most likely found in the:","Cytoplasm",["Mitochondrial matrix","Extracellular space","Nucleolus only"],"Without an NLS, nuclear import is inefficient.","Transcription factors generally act in the nucleus after import."],
    ["C","Protein targeting","SRP inhibition",3,"Blocking signal recognition particle directly disrupts:","Cotranslational targeting to ER",["DNA ligation","Glycolytic ATP formation","Bacterial conjugation"],"SRP pauses translation and targets ribosomes to the ER membrane.","DNA ligase functions in DNA repair and replication."],
    ["C","Methods","western activity mismatch",3,"A protein is detected by western blot but has no enzyme activity. What is the best conclusion?","Protein abundance does not prove functional activity",["Western blots detect only active enzymes","The protein must be absent","Antibodies cannot bind denatured proteins"],"Western blotting reports antigen presence, not catalytic state.","The protein can be present but inactive or misfolded."],
    ["C","Methods","ELISA background",2,"High signal in blank ELISA wells most likely reflects:","Insufficient washing or blocking",["Perfect specificity","No substrate conversion","Absence of antibody in all wells"],"Poor washing or blocking creates nonspecific signal.","Blanks should have low signal."],
    ["C","Methods","PCR negative control",3,"A no-template PCR control shows a target-size band. What is the first concern?","DNA contamination",["Successful sterile technique","No primer-template annealing","Excess agarose concentration"],"A no-template control should lack amplifiable DNA.","A target band indicates contaminating DNA or amplicon."],
    ["C","Genomics","ChIP interpretation",3,"A ChIP-seq peak upstream of a gene indicates:","Protein binding near that genomic region",["Protein molecular mass","A translated peptide sequence","A mitochondrial mutation"],"ChIP-seq maps DNA fragments associated with the immunoprecipitated protein.","It does not directly measure protein size."],
    ["C","Genomics","RNA-seq interpretation",3,"RNA-seq shows a tenfold increase in gene X reads after treatment. This most directly means:","Higher transcript abundance",["Higher enzyme activity necessarily","Protein phosphorylation","DNA copy number loss"],"RNA-seq quantifies RNA abundance.","Protein activity requires separate assays."],
    ["C","Genome editing","CRISPR frameshift",4,"A two-base deletion early in an exon is most likely to cause:","Frameshift and premature stop codon",["Synonymous mutation always","Increased telomere length","Improved splicing accuracy"],"Indels not divisible by three shift the reading frame.","Synonymous substitutions do not change amino acid sequence."],
    ["C","Molecular tools","siRNA knockdown",3,"siRNA reduces target protein because it primarily acts on:","Target mRNA",["Target genomic DNA","Mitochondrial cristae","Cell wall peptidoglycan"],"siRNA guides silencing complexes to complementary mRNA.","It does not normally delete chromosomal DNA."],
    ["C","Cell death","Annexin V",4,"Annexin V positivity before membrane rupture indicates:","Early apoptosis",["Necrosis only","DNA replication","Photosynthetic stress"],"Annexin V detects phosphatidylserine exposure, an early apoptotic event.","Necrosis is associated with early membrane failure."],
    ["C","Cell cycle","p53 loss",4,"Cells lacking p53 after DNA damage are defective in:","Damage-induced cell-cycle arrest",["ATP synthase rotation","Ribosomal peptide transfer","Light-dependent reactions"],"p53 activates checkpoint and repair or apoptosis programs.","ATP synthase and translation are unrelated to p53 checkpoint control."],
    ["C","Signal transduction","kinase-dead RTK",4,"A kinase-dead receptor tyrosine kinase binds ligand but cannot autophosphorylate. What is impaired?","Recruitment of phosphotyrosine-binding signaling proteins",["Ligand diffusion","mRNA capping","Protein glycosylation only"],"Autophosphorylated tyrosines are docking sites for downstream signaling proteins.","Ligand binding alone is not enough for full signaling."],
    ["C","Signal transduction","G alpha s",3,"Locking G alpha s in the GTP-bound form will most likely increase:","cAMP production",["DNA methylation","Microtubule depolymerization","Lysosomal pH only"],"Active G alpha s stimulates adenylate cyclase.","DNA methylation is not the immediate GPCR output."],
    ["C","Signal transduction","JAK-STAT",2,"STAT cannot bind a phosphorylated cytokine receptor. Which step is blocked?","STAT recruitment and activation",["Ligand binding to receptor","ATP hydrolysis by myosin","DNA replication origin licensing"],"STAT proteins dock on phosphorylated receptor/JAK complexes before activation.","Ligand binding can still occur upstream."],
    ["C","Cytoskeleton","microtubule inhibitor",4,"A drug preventing microtubule polymerization will directly block:","Mitotic spindle formation",["mRNA polyadenylation","Peptidoglycan crosslinking","Calvin cycle carbon fixation"],"Spindle microtubules are required for chromosome segregation.","mRNA processing and photosynthesis use other machinery."],
    ["C","Membrane biology","FRAP recovery",2,"Rapid FRAP recovery suggests:","High lateral mobility",["No molecular movement","Complete protein degradation","Irreversible DNA damage"],"Fluorescence recovery depends on diffusion of unbleached molecules.","No movement would produce poor recovery."],
    ["C","Membrane biology","peripheral protein",3,"A membrane-associated protein removed by high salt is likely:","Peripheral membrane protein",["Integral transmembrane protein","Secreted hormone only","Chromosomal histone only"],"Peripheral proteins often bind membranes through ionic interactions.","Integral proteins usually require detergent for extraction."],
    ["C","Protein sorting","mannose-6-phosphate",3,"A lysosomal enzyme lacking mannose-6-phosphate is likely to be:","Missorted toward secretion",["Imported into nucleus","Targeted to mitochondria","Retained in cytosol forever"],"Mannose-6-phosphate targets soluble lysosomal enzymes to lysosomes.","Without it, enzymes can be secreted."],
    ["C","Photosynthesis","PSII inhibitor",3,"Blocking electron flow from photosystem II most directly reduces:","Oxygen evolution",["Nuclear import","Glycolytic pyruvate formation","Antibody class switching"],"Water splitting at PSII produces oxygen.","Glycolysis occurs in the cytosol."],
    ["C","Plant physiology","ABA insensitive mutant",3,"A plant insensitive to ABA during drought is expected to show:","Defective stomatal closure",["Excessive vernalization","Failure of meiosis only","Constitutive flowering in darkness only"],"ABA signaling closes stomata under water stress.","Vernalization is a cold response."],
    ["C","Plant physiology","phytochrome experiment",4,"Red light promotes germination and far-red reverses it. This supports:","Phytochrome interconversion",["Rubisco oxygenase activity","Auxin conjugation only","Ethylene biosynthesis only"],"Phytochrome responses are photoreversible with red and far-red light.","Rubisco is not a photoreversible photoreceptor."],
    ["C","Plant physiology","night break",2,"A long-day plant flowers when the night is interrupted by light. This shows the importance of:","Night length perception",["Soil potassium concentration only","Mitochondrial inheritance","Cellulose synthesis"],"Photoperiodic plants measure the dark period.","Soil potassium is not the timing cue here."],
    ["C","Plant physiology","leghemoglobin",3,"Leghemoglobin in root nodules helps nitrogen fixation by:","Buffering free oxygen concentration",["Producing nitrate directly","Breaking down cellulose","Inhibiting all respiration"],"It maintains low free oxygen while allowing respiration.","Nitrogenase is oxygen-sensitive."],
    ["C","Genetics","X-linked recessive",3,"An affected male transmits an X-linked recessive allele to:","All daughters but no sons",["All sons but no daughters","Half of sons only","All children equally as affected"],"Fathers pass their X chromosome to daughters and Y chromosome to sons.","Sons receive the father's Y chromosome."],
    ["C","Inheritance","maternal inheritance",2,"A trait following the maternal parent in reciprocal crosses suggests:","Cytoplasmic inheritance",["Autosomal recessive inheritance","Y-linked inheritance","Independent assortment only"],"Mitochondria and chloroplasts are often maternally inherited.","Autosomal inheritance usually gives reciprocal crosses the same outcome."],
    ["C","Genetics","dominant negative",3,"A dominant-negative allele interferes because the mutant protein:","Disrupts wild-type protein function",["Is never translated","Deletes the wild-type allele","Changes every codon"],"Dominant-negative products often poison multimeric complexes or compete with normal protein.","The allele need not delete the wild-type copy."],
    ["C","Ecology","mark recapture",2,"In mark-recapture, 100 animals are marked; later 80 are captured and 20 are marked. Estimate population size.","400",["200","800","1000"],"Use N = first marked x second captured / recaptured = 100 x 80 / 20.","The estimate increases when recaptured marked animals are a small fraction."],
    ["C","Ecology","trophic cascade",2,"Removal of top predators causing herbivore increase and vegetation decline is a:","Trophic cascade",["Hardy-Weinberg equilibrium","Founder effect","Synapomorphy"],"A trophic cascade is an indirect effect across feeding levels.","Hardy-Weinberg is a population-genetic model."],
    ["C","Evolution","stabilizing selection",3,"Selection against both extremes of a trait distribution is:","Stabilizing selection",["Disruptive selection","Directional selection","Genetic hitchhiking only"],"Stabilizing selection favors intermediate phenotypes.","Disruptive selection favors extremes."],
    ["C","Evolution","convergent evolution",3,"Similar forms evolving independently in similar habitats indicate:","Convergent evolution",["Genetic code degeneracy","Linkage mapping","Random mating"],"Convergence occurs when unrelated lineages adapt similarly.","Linkage mapping estimates distances between genes."],
    ["C","Evolution","synapomorphy",2,"A shared derived character used to define a clade is a:","Synapomorphy",["Homoplasy only","Anticodon","Restriction site always"],"Synapomorphies support common ancestry of clade members.","Homoplasy is similarity not due to shared ancestry."],
    ["C","Evolution","sympatric speciation",2,"Speciation without geographic separation is called:","Sympatric speciation",["Allopatric speciation","Genetic drift only","Hybrid vigor"],"Sympatric speciation occurs in the same geographic area.","Allopatric speciation requires geographic separation."],
    ["C","Neurobiology","synaptic ion channel",2,"Opening a ligand-gated cation channel at a synapse most immediately causes:","Membrane depolarization",["DNA replication","mRNA splicing","Histone methylation only"],"Cation influx makes the membrane potential less negative.","Gene expression changes are downstream and slower."],
    ["C","Endocrinology","steroid receptor",2,"A steroid hormone receptor often acts directly as a:","Transcription regulator",["Voltage-gated channel","Ribosomal RNA","Cell wall enzyme"],"Many steroid receptors bind DNA and regulate transcription after ligand binding.","Voltage-gated channels are membrane excitability proteins."],
    ["C","Development","stem cell potency",2,"A pluripotent stem cell can give rise to:","Most body cell types but not all extraembryonic tissues",["Only one terminal cell type","Only gametes","Only bacterial colonies"],"Pluripotent cells form derivatives of all three germ layers.","Totipotent cells can make embryonic and extraembryonic tissues."],
    ["C","Methods","reducing SDS-PAGE",2,"Beta-mercaptoethanol in SDS-PAGE mainly disrupts:","Disulfide bonds",["Peptide bonds","Glycosidic bonds in DNA","Hydrogen bonds in water only"],"Reducing agents break disulfide bonds between cysteines.","Peptide bonds remain intact during normal SDS-PAGE."]
  ];

  function q(stem, correct, distractors, explanation) {
    return { stem, correct, distractors, explanation };
  }

  function seeded(seed) {
    let x = seed % 2147483647;
    if (x <= 0) x += 2147483646;
    return function () {
      x = (x * 16807) % 2147483647;
      return (x - 1) / 2147483646;
    };
  }

  function shuffle(items, seed) {
    const rand = seeded(seed);
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function conceptStem(topic) {
    return topic.prompt;
  }

  function buildConceptQuestions(raw, section, offset) {
    return raw.flatMap((entry, topicIndex) => {
      const [sec, area, concept, repeat, prompt, correct, distractors, explanation, wrongWhy] = entry;
      const topic = { section: sec || section, area, concept, repeat, prompt, correct, distractors, explanation, wrongWhy };
      return Array.from({ length: 16 }, (_, variant) => makeQuestion(topic, topicIndex, variant, offset));
    });
  }

  function buildAptitudeQuestions() {
    return partAGenerators.flatMap((generator, topicIndex) =>
      Array.from({ length: 20 }, (_, variant) => {
        const built = generator.build(variant);
        const topic = {
          section: "A",
          area: "General aptitude",
          concept: generator.concept,
          repeat: generator.repeat,
          prompt: built.stem,
          correct: built.correct,
          distractors: built.distractors,
          explanation: built.explanation,
          wrongWhy: "This option does not follow the required calculation or definition."
        };
        return makeQuestion(topic, topicIndex, variant, 10000);
      })
    );
  }

  function makeQuestion(topic, topicIndex, variant, offset) {
    const seed = offset + topicIndex * 97 + variant * 13;
    const optionRecords = [
      { text: topic.correct, correct: true, why: topic.explanation },
      ...topic.distractors.map((text) => ({ text, correct: false, why: topic.wrongWhy }))
    ];
    const options = shuffle(optionRecords, seed);
    const answerIndex = options.findIndex((option) => option.correct);
    const answer = ["a", "b", "c", "d"][answerIndex];
    return {
      id: `${topic.section}-${slug(topic.concept)}-${variant + 1}`,
      section: topic.section,
      sectionName: sectionNames[topic.section],
      area: topic.area,
      concept: topic.concept,
      pyqRepeat: topic.repeat,
      stem: topic.section === "A" ? topic.prompt : conceptStem(topic, variant),
      options: options.map((option) => option.text),
      answer,
      explanation: topic.explanation,
      guide: explanationGuides[topic.concept] || null,
      feedback: options.map((option) => option.why)
    };
  }

  const bank = [
    ...buildAptitudeQuestions(),
    ...buildConceptQuestions(lifeTopics, "B", 20000),
    ...buildConceptQuestions(analysisTopics, "C", 50000)
  ];

  window.CSIRScoringRules = scoringRules;
  window.CSIRQuestionBank = bank;
})();
