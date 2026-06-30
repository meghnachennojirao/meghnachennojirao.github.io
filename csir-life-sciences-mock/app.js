(function () {
  const bank = window.CSIRQuestionBank || [];
  const rules = window.CSIRScoringRules;
  const letters = ["a", "b", "c", "d"];

  const state = {
    paper: [],
    answers: new Map(),
    submitted: false,
    result: null
  };

  const els = {
    poolCount: document.getElementById("pool-count"),
    questionList: document.getElementById("question-list"),
    palette: document.getElementById("question-palette"),
    progressFill: document.getElementById("progress-fill"),
    progressText: document.getElementById("progress-text"),
    sectionProgress: document.getElementById("section-progress"),
    resultPanel: document.getElementById("result-panel"),
    newPaperTop: document.getElementById("new-paper-top"),
    submitTop: document.getElementById("submit-top")
  };

  function randomSeed() {
    const data = new Uint32Array(1);
    window.crypto.getRandomValues(data);
    return data[0] || Date.now();
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

  function sectionQuestions(section) {
    return bank.filter((question) => question.section === section);
  }

  function sampleSection(section, count, seed) {
    const shuffled = shuffle(sectionQuestions(section), seed);
    const chosen = [];
    const seenConcepts = new Set();

    for (const question of shuffled) {
      if (!seenConcepts.has(question.concept)) {
        chosen.push(question);
        seenConcepts.add(question.concept);
      }
      if (chosen.length === count) return chosen;
    }

    for (const question of shuffled) {
      if (!chosen.includes(question)) chosen.push(question);
      if (chosen.length === count) return chosen;
    }

    return chosen;
  }

  function newPaper() {
    const seed = randomSeed();
    state.paper = [
      ...sampleSection("A", rules.A.count, seed + 11),
      ...sampleSection("B", rules.B.count, seed + 23),
      ...sampleSection("C", rules.C.count, seed + 37)
    ];
    state.answers = new Map();
    state.submitted = false;
    state.result = null;
    els.resultPanel.classList.add("hidden");
    els.resultPanel.innerHTML = "";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function answerQuestion(index, letter) {
    if (state.submitted) return;
    state.answers.set(index, letter);
    updateQuestion(index);
    updateProgress();
    updatePalette();
  }

  function submitPaper() {
    if (state.submitted) return;
    state.submitted = true;
    state.result = scorePaper();
    render();
    els.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scorePaper() {
    const sectionAttemptOrder = { A: [], B: [], C: [] };
    state.paper.forEach((question, index) => {
      if (state.answers.has(index)) sectionAttemptOrder[question.section].push(index);
    });

    const scored = new Set();
    Object.entries(rules).forEach(([section, rule]) => {
      sectionAttemptOrder[section].slice(0, rule.attemptLimit).forEach((index) => scored.add(index));
    });

    const details = state.paper.map((question, index) => {
      const chosen = state.answers.get(index) || null;
      const isScored = chosen !== null && scored.has(index);
      const correct = chosen === question.answer;
      const rule = rules[question.section];
      const marks = !isScored ? 0 : correct ? rule.correct : rule.wrong;
      return { index, question, chosen, correct, isScored, marks };
    });

    const bySection = {};
    Object.keys(rules).forEach((section) => {
      const rows = details.filter((row) => row.question.section === section);
      bySection[section] = {
        attempted: rows.filter((row) => row.chosen).length,
        scored: rows.filter((row) => row.isScored).length,
        correct: rows.filter((row) => row.isScored && row.correct).length,
        wrong: rows.filter((row) => row.isScored && !row.correct).length,
        ignored: rows.filter((row) => row.chosen && !row.isScored).length,
        score: rows.reduce((sum, row) => sum + row.marks, 0)
      };
    });

    const score = details.reduce((sum, row) => sum + row.marks, 0);
    const scoredCount = details.filter((row) => row.isScored).length;
    const correct = details.filter((row) => row.isScored && row.correct).length;
    const wrong = details.filter((row) => row.isScored && !row.correct).length;
    const attempted = details.filter((row) => row.chosen).length;
    const accuracy = scoredCount ? Math.round((correct / scoredCount) * 100) : 0;

    return { score, scoredCount, correct, wrong, attempted, accuracy, bySection, details };
  }

  function updateQuestion(index) {
    const card = document.querySelector(`[data-question-index="${index}"]`);
    if (!card) return;
    const selected = state.answers.get(index);
    card.querySelectorAll(".option").forEach((button) => {
      button.classList.toggle("selected", button.dataset.option === selected);
    });
  }

  function updateProgress() {
    const answered = state.answers.size;
    const total = state.paper.length;
    els.progressFill.style.width = `${(answered / total) * 100}%`;
    els.progressText.textContent = `${answered} answered`;

    els.sectionProgress.innerHTML = Object.entries(rules).map(([section, rule]) => {
      const answeredInSection = state.paper.filter((question, index) => question.section === section && state.answers.has(index)).length;
      const pct = Math.min(100, (answeredInSection / rule.count) * 100);
      return `
        <div class="section-row">
          <span>${section}</span>
          <div class="mini-track"><div style="width:${pct}%"></div></div>
          <strong>${answeredInSection}/${rule.count}</strong>
        </div>
      `;
    }).join("");
  }

  function updatePalette() {
    els.palette.querySelectorAll("button").forEach((button) => {
      const index = Number(button.dataset.index);
      const answered = state.answers.has(index);
      button.className = answered ? "answered" : "";

      if (state.submitted && state.result) {
        const row = state.result.details[index];
        if (row.chosen && !row.isScored) button.className = "review-ignored";
        else if (row.correct && row.isScored) button.className = "review-good";
        else if (row.chosen && row.isScored && !row.correct) button.className = "review-bad";
      }
    });
  }

  function render() {
    els.poolCount.textContent = `${bank.length.toLocaleString()} questions`;
    renderQuestions();
    renderPalette();
    updateProgress();
    if (state.submitted) renderResults();
  }

  function renderPalette() {
    els.palette.innerHTML = state.paper.map((_, index) => `
      <button type="button" data-index="${index}" aria-label="Go to question ${index + 1}">${index + 1}</button>
    `).join("");

    els.palette.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector(`[data-question-index="${button.dataset.index}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    updatePalette();
  }

  function renderQuestions() {
    els.questionList.innerHTML = state.paper.map((question, index) => questionMarkup(question, index)).join("");
    els.questionList.querySelectorAll(".option").forEach((button) => {
      button.addEventListener("click", () => answerQuestion(Number(button.dataset.index), button.dataset.option));
    });
  }

  function questionMarkup(question, index) {
    const selected = state.answers.get(index);
    const review = state.submitted && state.result ? state.result.details[index] : null;
    const status = review ? reviewStatus(review) : "";

    return `
      <article class="question-card" data-question-index="${index}">
        <div class="question-meta">
          <span class="chip">${index + 1}</span>
          <span class="chip">${question.section}</span>
          <span class="chip">${question.area}</span>
          <span class="chip repeat">PYQ repeat: ${question.pyqRepeat}</span>
          ${status ? `<span class="chip">${status}</span>` : ""}
        </div>
        <h3>${escapeHtml(question.stem)}</h3>
        <div class="options">
          ${question.options.map((option, optionIndex) => optionMarkup(question, index, option, optionIndex, selected, review)).join("")}
        </div>
        ${review ? reviewMarkup(review) : ""}
      </article>
    `;
  }

  function optionMarkup(question, index, option, optionIndex, selected, review) {
    const letter = letters[optionIndex];
    let classes = "option";
    if (selected === letter) classes += " selected";
    if (review) {
      if (question.answer === letter) classes += " correct";
      if (review.chosen === letter && review.chosen !== question.answer) classes += " wrong";
    }
    return `
      <button class="${classes}" type="button" data-index="${index}" data-option="${letter}">
        <span class="letter">${letter}</span>
        <span>${escapeHtml(option)}</span>
      </button>
    `;
  }

  function reviewStatus(row) {
    if (!row.chosen) return "Unanswered";
    if (!row.isScored) return "Not scored";
    return row.correct ? `+${rules[row.question.section].correct}` : `${rules[row.question.section].wrong}`;
  }

  function reviewMarkup(row) {
    const chosenIndex = row.chosen ? letters.indexOf(row.chosen) : -1;
    const correctIndex = letters.indexOf(row.question.answer);
    const chosenText = row.chosen ? `${row.chosen}) ${row.question.options[chosenIndex]}` : "Not answered";
    const correctText = `${row.question.answer}) ${row.question.options[correctIndex]}`;
    const chosenFeedback = row.chosen && !row.correct ? `<p><strong>Your choice:</strong> ${escapeHtml(row.question.feedback[chosenIndex])}</p>` : "";
    const ignored = row.chosen && !row.isScored ? "<p><strong>Scoring:</strong> This response was above the CSIR attempt cap for its section, so it was reviewed but not counted.</p>" : "";

    return `
      <div class="review-box">
        <p><strong>Your answer:</strong> ${escapeHtml(chosenText)}</p>
        <p><strong>Correct answer:</strong> ${escapeHtml(correctText)}</p>
        <p><strong>Why:</strong> ${escapeHtml(row.question.explanation)}</p>
        ${chosenFeedback}
        ${ignored}
      </div>
    `;
  }

  function renderResults() {
    const result = state.result;
    els.resultPanel.classList.remove("hidden");
    els.resultPanel.innerHTML = `
      <div class="result-grid">
        <div class="metric"><span>Score</span><strong>${roundScore(result.score)} / 200</strong></div>
        <div class="metric"><span>Accuracy</span><strong>${result.accuracy}%</strong></div>
        <div class="metric"><span>Scored</span><strong>${result.scoredCount}</strong></div>
        <div class="metric"><span>Attempted</span><strong>${result.attempted}</strong></div>
      </div>
      <table class="section-table">
        <thead>
          <tr>
            <th>Part</th>
            <th>Attempted</th>
            <th>Scored</th>
            <th>Correct</th>
            <th>Wrong</th>
            <th>Ignored</th>
            <th>Marks</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(result.bySection).map(([section, row]) => `
            <tr>
              <td>${section}</td>
              <td>${row.attempted}</td>
              <td>${row.scored}</td>
              <td>${row.correct}</td>
              <td>${row.wrong}</td>
              <td>${row.ignored}</td>
              <td>${roundScore(row.score)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    updatePalette();
  }

  function roundScore(value) {
    return Number(value.toFixed(2)).toString();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  els.newPaperTop.addEventListener("click", newPaper);
  els.submitTop.addEventListener("click", submitPaper);

  newPaper();
})();
