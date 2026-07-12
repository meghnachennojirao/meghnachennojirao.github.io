(function () {
  const papers = window.CSIROfficialPapers || [];
  const archiveUrl = "https://www.csirhrdg.res.in/Home/Index/1/Default/3456/81";

  const els = {
    paperSelect: document.getElementById("paper-select"),
    paperSession: document.getElementById("paper-session"),
    paperDate: document.getElementById("paper-date"),
    paperFormat: document.getElementById("paper-format"),
    paperSource: document.getElementById("paper-source"),
    paperFrame: document.getElementById("paper-frame"),
    openPaper: document.getElementById("open-paper"),
    openKey: document.getElementById("open-key"),
    officialArchive: document.getElementById("official-archive")
  };

  function paperFromLocation() {
    const selectedId = new URLSearchParams(window.location.search).get("paper");
    return papers.find((paper) => paper.id === selectedId) || papers[0];
  }

  function updateLocation(paper) {
    const url = new URL(window.location.href);
    url.searchParams.set("paper", paper.id);
    window.history.replaceState({}, "", url);
  }

  function showPaper(paper, syncLocation = true) {
    if (!paper) return;

    els.paperSelect.value = paper.id;
    els.paperSession.textContent = paper.session;
    els.paperDate.textContent = paper.examDate;
    els.paperFormat.textContent = paper.format;
    els.paperSource.textContent = paper.sourceLabel;
    els.paperFrame.title = `${paper.label} official question paper`;
    els.paperFrame.src = paper.previewUrl;
    els.openPaper.href = paper.paperUrl;
    els.openKey.href = paper.answerKeyUrl;
    document.title = `${paper.label} | CSIR-UGC NET Life Sciences`;

    if (syncLocation) updateLocation(paper);
  }

  function populateSelect() {
    papers.forEach((paper) => {
      const option = document.createElement("option");
      option.value = paper.id;
      option.textContent = paper.label;
      els.paperSelect.append(option);
    });
  }

  function init() {
    if (!papers.length) return;

    els.officialArchive.href = archiveUrl;
    populateSelect();
    showPaper(paperFromLocation(), false);

    els.paperSelect.addEventListener("change", () => {
      const paper = papers.find((item) => item.id === els.paperSelect.value);
      showPaper(paper);
    });
  }

  init();
})();
