(function () {
  const state = {
    catalogue: [],
    paper: null,
    answers: new Map(),
    submitted: false
  };

  const els = {
    paperSelect: document.getElementById("paper-select"),
    paperSession: document.getElementById("paper-session"),
    paperDate: document.getElementById("paper-date"),
    paperCoverage: document.getElementById("paper-coverage"),
    paperSource: document.getElementById("paper-source"),
    keySource: document.getElementById("key-source"),
    sectionProgress: document.getElementById("section-progress"),
    attemptTotal: document.getElementById("attempt-total"),
    palette: document.getElementById("question-palette"),
    questionList: document.getElementById("question-list"),
    loading: document.getElementById("loading"),
    error: document.getElementById("error"),
    submitPanel: document.getElementById("submit-panel"),
    submitPaper: document.getElementById("submit-paper"),
    resetPaper: document.getElementById("reset-paper"),
    resultSummary: document.getElementById("result-summary")
  };

  const optionNames = ["Option 1", "Option 2", "Option 3", "Option 4"];

  function countsBySection() {
    const counts = { A: 0, B: 0, C: 0 };
    state.answers.forEach((_, number) => {
      const question = state.paper.questions[number - 1];
      counts[question.section] += 1;
    });
    return counts;
  }

  function totalLimit() {
    return Object.values(state.paper.attemptLimits).reduce((sum, value) => sum + value, 0);
  }

  function setLocation(paperId) {
    const url = new URL(window.location.href);
    url.searchParams.set("paper", paperId);
    window.history.replaceState({}, "", url);
  }

  function resultFor(question) {
    const selected = state.answers.get(question.number);
    if (!selected) return { status: "unanswered", marks: 0 };
    if (question.status === "dropped") {
      return { status: "dropped", marks: question.marks.correct };
    }
    if (question.correctOptions.includes(selected)) {
      return { status: "correct", marks: question.marks.correct };
    }
    return { status: "incorrect", marks: question.marks.incorrect };
  }

  function answerLabel(options) {
    if (!options.length) return "Dropped";
    return options.map((value) => optionNames[value - 1]).join(" or ");
  }

  function explanationFor(question) {
    if (question.explanation) return question.explanation;
    if (question.status === "dropped") {
      return "The official final key marks this question as dropped; the paper's positive marks are awarded when it was attempted.";
    }
    return `The official final answer key accepts ${answerLabel(question.correctOptions)} for Question ID ${question.questionId}.`;
  }

  function renderProgress() {
    if (!state.paper) return;
    const counts = countsBySection();
    els.sectionProgress.innerHTML = ["A", "B", "C"].map((section) => {
      const limit = state.paper.attemptLimits[section];
      const count = counts[section];
      return `<div class="section-row${count >= limit ? " full" : ""}">
        <strong>Part ${section}</strong>
        <div class="track"><span style="width:${Math.min(100, count / limit * 100)}%"></span></div>
        <span>${count}/${limit}</span>
      </div>`;
    }).join("");
    els.attemptTotal.textContent = `${state.answers.size} of ${totalLimit()} permitted answers selected`;
  }

  function renderPalette() {
    els.palette.innerHTML = state.paper.questions.map((question) => {
      const result = state.submitted ? resultFor(question).status : "";
      const answered = state.answers.has(question.number) ? " answered" : "";
      return `<button class="${answered} ${result}" type="button" data-jump="${question.number}" aria-label="Go to question ${question.number}">${question.number}</button>`;
    }).join("");
  }

  function renderQuestions() {
    const counts = countsBySection();
    els.questionList.innerHTML = state.paper.questions.map((question) => {
      const selected = state.answers.get(question.number);
      const atLimit = counts[question.section] >= state.paper.attemptLimits[question.section];
      const result = state.submitted ? resultFor(question) : null;
      const images = question.sourceImages || [question.sourceImage];
      const imageHtml = images.map((src, index) => (
        `<img src="${src}" loading="lazy" alt="Original source for Question ${question.number}${images.length > 1 ? `, segment ${index + 1}` : ""}">`
      )).join("");
      const optionHtml = optionNames.map((label, index) => {
        const value = index + 1;
        const isSelected = selected === value;
        const isCorrect = state.submitted && question.correctOptions.includes(value);
        const isWrong = state.submitted && isSelected && !isCorrect && question.status !== "dropped";
        const disabled = state.submitted || (!selected && atLimit);
        return `<button type="button" class="option${isSelected ? " selected" : ""}${isCorrect ? " correct" : ""}${isWrong ? " wrong" : ""}" data-question="${question.number}" data-option="${value}" aria-pressed="${isSelected}" ${disabled ? "disabled" : ""}>
          <span>${value}</span><strong>${label}</strong>
        </button>`;
      }).join("");
      const review = result ? `<div class="review ${result.status}">
        <strong>${result.status === "correct" ? "Correct" : result.status === "incorrect" ? "Incorrect" : result.status === "dropped" ? "Dropped question" : "Not answered"}</strong>
        <span>Correct answer: ${answerLabel(question.correctOptions)}</span>
        <p>${explanationFor(question)}</p>
      </div>` : "";
      return `<article class="question-card" id="question-${question.number}">
        <header><span>Question ${question.number}</span><span>Part ${question.section}</span><span>Source page ${question.sourcePage}</span></header>
        <div class="source-images">${imageHtml}</div>
        <div class="options" role="group" aria-label="Answer choices for Question ${question.number}">${optionHtml}</div>
        ${!state.submitted && atLimit && !selected ? `<p class="limit-note">Part ${question.section} attempt limit reached. Deselect another answer in this part to answer this question.</p>` : ""}
        ${review}
      </article>`;
    }).join("");
  }

  function renderSummary() {
    if (!state.submitted) {
      els.resultSummary.classList.add("hidden");
      els.resultSummary.innerHTML = "";
      return;
    }
    const section = { A: { score: 0, correct: 0, incorrect: 0, attempted: 0 }, B: { score: 0, correct: 0, incorrect: 0, attempted: 0 }, C: { score: 0, correct: 0, incorrect: 0, attempted: 0 } };
    state.paper.questions.forEach((question) => {
      const result = resultFor(question);
      const values = section[question.section];
      values.score += result.marks;
      if (result.status !== "unanswered") values.attempted += 1;
      if (result.status === "correct" || result.status === "dropped") values.correct += 1;
      if (result.status === "incorrect") values.incorrect += 1;
    });
    const score = Object.values(section).reduce((sum, value) => sum + value.score, 0);
    const correct = Object.values(section).reduce((sum, value) => sum + value.correct, 0);
    const incorrect = Object.values(section).reduce((sum, value) => sum + value.incorrect, 0);
    els.resultSummary.innerHTML = `<div class="score-heading"><span>Final score</span><strong>${score.toFixed(2)} / 200</strong></div>
      <div class="metrics"><div><span>Attempted</span><strong>${state.answers.size}</strong></div><div><span>Correct</span><strong>${correct}</strong></div><div><span>Incorrect</span><strong>${incorrect}</strong></div></div>
      <table><thead><tr><th>Part</th><th>Attempted</th><th>Correct</th><th>Incorrect</th><th>Marks</th></tr></thead><tbody>${["A", "B", "C"].map((name) => `<tr><td>${name}</td><td>${section[name].attempted}</td><td>${section[name].correct}</td><td>${section[name].incorrect}</td><td>${section[name].score.toFixed(2)}</td></tr>`).join("")}</tbody></table>`;
    els.resultSummary.classList.remove("hidden");
  }

  function renderAll() {
    renderProgress();
    renderPalette();
    renderQuestions();
    renderSummary();
  }

  function selectOption(number, value) {
    if (state.submitted) return;
    const question = state.paper.questions[number - 1];
    const current = state.answers.get(number);
    if (current === value) {
      state.answers.delete(number);
    } else {
      const counts = countsBySection();
      if (!current && counts[question.section] >= state.paper.attemptLimits[question.section]) return;
      state.answers.set(number, value);
    }
    renderAll();
    document.getElementById(`question-${number}`).scrollIntoView({ block: "nearest" });
  }

  async function loadPaper(paperId) {
    const item = state.catalogue.find((paper) => paper.id === paperId) || state.catalogue[0];
    els.loading.classList.remove("hidden");
    els.error.classList.add("hidden");
    els.submitPanel.classList.add("hidden");
    els.questionList.innerHTML = "";
    try {
      const response = await fetch(item.dataUrl);
      if (!response.ok) throw new Error(`Paper data returned ${response.status}`);
      const paper = await response.json();
      if (paper.questionCount !== 145 || paper.questions.length !== 145) throw new Error("Paper failed the 145-question integrity check");
      state.paper = paper;
      state.answers = new Map();
      state.submitted = false;
      els.paperSelect.value = item.id;
      els.paperSession.textContent = paper.session;
      els.paperDate.textContent = paper.examDate;
      els.paperCoverage.textContent = `${paper.questionCount} verified questions`;
      els.paperSource.href = paper.source.paperUrl;
      els.keySource.href = paper.source.answerKeyUrl;
      els.loading.classList.add("hidden");
      els.submitPanel.classList.remove("hidden");
      setLocation(item.id);
      renderAll();
    } catch (error) {
      els.loading.classList.add("hidden");
      els.error.textContent = `This paper could not be loaded: ${error.message}`;
      els.error.classList.remove("hidden");
    }
  }

  async function init() {
    try {
      const response = await fetch("data/papers.json");
      state.catalogue = await response.json();
      state.catalogue.forEach((paper) => {
        const option = document.createElement("option");
        option.value = paper.id;
        option.textContent = paper.label;
        els.paperSelect.append(option);
      });
      const requested = new URLSearchParams(window.location.search).get("paper");
      await loadPaper(requested);
    } catch (error) {
      els.loading.classList.add("hidden");
      els.error.textContent = `The paper catalogue could not be loaded: ${error.message}`;
      els.error.classList.remove("hidden");
    }
  }

  els.paperSelect.addEventListener("change", () => loadPaper(els.paperSelect.value));
  els.questionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-question]");
    if (button) selectOption(Number(button.dataset.question), Number(button.dataset.option));
  });
  els.palette.addEventListener("click", (event) => {
    const button = event.target.closest("[data-jump]");
    if (button) document.getElementById(`question-${button.dataset.jump}`).scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.submitPaper.addEventListener("click", () => {
    state.submitted = true;
    renderAll();
    els.resultSummary.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.resetPaper.addEventListener("click", () => {
    if (!state.paper) return;
    state.answers = new Map();
    state.submitted = false;
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  init();
})();
