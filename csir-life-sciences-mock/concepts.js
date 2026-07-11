(function () {
  const bank = window.CSIRQuestionBank || [];
  const rules = window.CSIRScoringRules || {};

  const els = {
    summary: document.getElementById("concept-summary"),
    themes: document.getElementById("priority-themes"),
    pathways: document.getElementById("signal-pathways"),
    coverage: document.getElementById("area-coverage")
  };

  const uniqueConcepts = new Map();
  bank.forEach((question) => {
    if (!uniqueConcepts.has(question.concept)) {
      uniqueConcepts.set(question.concept, {
        concept: question.concept,
        area: question.area,
        section: question.section,
        guide: question.guide,
        variants: 0
      });
    }
    uniqueConcepts.get(question.concept).variants += 1;
  });

  const conceptRows = Array.from(uniqueConcepts.values());
  const guidedCount = conceptRows.filter((row) => row.guide).length;
  const paperSize = Object.values(rules).reduce((sum, rule) => sum + (rule.count || 0), 0);
  const allowedSize = Object.values(rules).reduce((sum, rule) => sum + (rule.attemptLimit || 0), 0);

  const priorityThemes = [
    {
      title: "Population Genetics",
      concepts: "Hardy-Weinberg, allele frequency, heterozygote/carrier calculation, founder effect, drift, bottleneck.",
      revise: "Write p + q = 1 and p^2 + 2pq + q^2 = 1 before solving. For recessive traits, take the square root of q^2 before calculating 2pq."
    },
    {
      title: "Enzyme Kinetics",
      concepts: "Km, Vmax, competitive inhibition, allostery, activity versus abundance.",
      revise: "Use Km/Vmax shifts to classify inhibition. Competitive inhibition raises apparent Km but leaves Vmax recoverable at high substrate."
    },
    {
      title: "Gene Regulation",
      concepts: "lac operon, CAP-cAMP, cis/trans tests, promoter mutation, enhancer orientation.",
      revise: "Separate DNA elements that act only on the same molecule from proteins or RNAs that diffuse and act in trans."
    },
    {
      title: "Molecular Methods",
      concepts: "PCR controls, western blot, ELISA, ChIP-seq, RNA-seq, ATAC-seq, FRAP, SDS-PAGE.",
      revise: "Start by asking what the assay directly measures. Many traps confuse abundance, activity, localization, and sequence."
    },
    {
      title: "Cell Signaling",
      concepts: "RTK phosphorylation, GPCR-cAMP-PKA, JAK-STAT docking, ABA signaling, phytochrome photoreversibility.",
      revise: "Track the signal from ligand or stimulus to receptor, second messenger, effector protein, and final cellular response."
    },
    {
      title: "Inheritance Patterns",
      concepts: "X-linked recessive transmission, maternal inheritance, complementation, epistasis, dominant negative alleles.",
      revise: "Use reciprocal crosses and parent-of-origin clues before assuming autosomal Mendelian inheritance."
    }
  ];

  const signalPathways = [
    {
      name: "GPCR -> G alpha s -> adenylyl cyclase -> cAMP -> PKA",
      status: "Represented now",
      note: "Use when G alpha s is GTP-bound or when cAMP output is asked."
    },
    {
      name: "RTK -> autophosphorylation -> adaptor docking -> Ras/MAPK or PI3K branches",
      status: "Represented now",
      note: "Kinase-dead receptors can bind ligand but fail to create phosphotyrosine docking sites."
    },
    {
      name: "Cytokine receptor -> JAK -> STAT docking/dimerization -> transcription",
      status: "Represented now",
      note: "If STAT cannot dock on phosphorylated receptor tails, STAT activation is blocked."
    },
    {
      name: "ABA -> guard-cell ion flux -> stomatal closure",
      status: "Represented now",
      note: "Use for drought-response questions in plant physiology."
    },
    {
      name: "TGF-beta/SMAD, Wnt/beta-catenin, Notch, Hedgehog, NF-kB, Ca2+/calmodulin",
      status: "Tag during verified import",
      note: "These should be tracked explicitly when exact previous-paper questions are imported."
    }
  ];

  function renderSummary() {
    els.summary.innerHTML = `
      <div class="mini-metric"><span>Catalogue</span><strong>${bank.length.toLocaleString()}</strong><em>authored variants</em></div>
      <div class="mini-metric"><span>Concepts</span><strong>${conceptRows.length}</strong><em>unique labels</em></div>
      <div class="mini-metric"><span>Paper</span><strong>${paperSize}</strong><em>${allowedSize} answer limit</em></div>
      <div class="mini-metric"><span>Explanations</span><strong>${guidedCount}</strong><em>formula/pathway guides</em></div>
    `;
  }

  function renderThemes() {
    els.themes.innerHTML = priorityThemes.map((theme) => `
      <article class="theme-card">
        <h3>${escapeHtml(theme.title)}</h3>
        <p><strong>Revise:</strong> ${escapeHtml(theme.concepts)}</p>
        <p>${escapeHtml(theme.revise)}</p>
      </article>
    `).join("");
  }

  function renderPathways() {
    els.pathways.innerHTML = signalPathways.map((pathway) => `
      <article class="pathway-row">
        <div>
          <h3>${escapeHtml(pathway.name)}</h3>
          <p>${escapeHtml(pathway.note)}</p>
        </div>
        <span>${escapeHtml(pathway.status)}</span>
      </article>
    `).join("");
  }

  function renderCoverage() {
    const areas = new Map();
    conceptRows.forEach((row) => {
      if (!areas.has(row.area)) areas.set(row.area, []);
      areas.get(row.area).push(row);
    });

    const rows = Array.from(areas.entries())
      .map(([area, concepts]) => ({ area, concepts: concepts.sort((a, b) => a.concept.localeCompare(b.concept)) }))
      .sort((a, b) => b.concepts.length - a.concepts.length);

    els.coverage.innerHTML = rows.map((row) => `
      <article class="coverage-row">
        <div>
          <h3>${escapeHtml(row.area)}</h3>
          <p>${row.concepts.map((item) => escapeHtml(item.concept)).join(", ")}</p>
        </div>
        <strong>${row.concepts.length}</strong>
      </article>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  renderSummary();
  renderThemes();
  renderPathways();
  renderCoverage();
})();
