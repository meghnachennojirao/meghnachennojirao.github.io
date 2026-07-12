(function () {
  const archive = "https://www.csirhrdg.res.in/SiteContent/ManagedContent/ContentFiles/";
  const driveView = (id) => `https://drive.google.com/file/d/${id}/view?usp=drive_link`;
  const drivePreview = (id) => `https://drive.google.com/file/d/${id}/preview`;

  function legacyPaper(id, label, session, examDate, paperPath, keyPath) {
    return {
      id,
      label,
      session,
      examDate,
      format: "Original official PDF, Set A",
      sourceLabel: "CSIR-HRDG official question paper",
      paperUrl: `${archive}${paperPath}`,
      previewUrl: `${archive}${paperPath}`,
      answerKeyUrl: `${archive}${keyPath}`
    };
  }

  function shiftedPaper(id, label, session, examDate, shift, driveId, answerKeyPath) {
    return {
      id,
      label,
      session,
      examDate,
      format: `Original official PDF, ${shift}`,
      sourceLabel: "CSIR-HRDG official question paper",
      paperUrl: driveView(driveId),
      previewUrl: drivePreview(driveId),
      answerKeyUrl: `${archive}${answerKeyPath}`
    };
  }

  window.CSIROfficialPapers = [
    shiftedPaper(
      "december-2024-shift-1",
      "December 2024 - Shift 1",
      "December 2024 session",
      "Exam held 1 March 2025",
      "Life Sciences Shift 1",
      "1q-pwTmINJX0uvuMgdTObh5phAi5NC3aT",
      "20251007153254514Final_Answer_Keys_All_Subjects_Dec-2024_07Oct2025.pdf"
    ),
    shiftedPaper(
      "december-2024-shift-2",
      "December 2024 - Shift 2",
      "December 2024 session",
      "Exam held 1 March 2025",
      "Life Sciences Shift 2",
      "1AycPmSFeGJWTtnKF2ZE9Oahf9_17xiGY",
      "20251007153254514Final_Answer_Keys_All_Subjects_Dec-2024_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2024-shift-1",
      "June 2024 - Shift 1",
      "June 2024 session",
      "Exam held 26 July 2024",
      "Life Sciences Shift 1",
      "1tVxTLanuPnenvIVIZHMn0fcCXzRxlO_m",
      "20251007135218286Final_Answer_Keys_All_Subjects_June-2024_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2024-shift-2",
      "June 2024 - Shift 2",
      "June 2024 session",
      "Exam held 26 July 2024",
      "Life Sciences Shift 2",
      "1h-2z0dtrkap_-kv1UIcMTft5RP_l4PRi",
      "20251007135218286Final_Answer_Keys_All_Subjects_June-2024_07Oct2025.pdf"
    ),
    shiftedPaper(
      "december-2023-shift-1",
      "December 2023 - Shift 1",
      "December 2023 session",
      "Exam held 26 December 2023",
      "Life Sciences Shift 1",
      "1JB6sJUXp0T4T09MkBHx5UViVDPx4K9Sz",
      "20251007153221671Final_Answer_Keys_All_Subjects_Dec-2023_07Oct2025.pdf"
    ),
    shiftedPaper(
      "december-2023-shift-2",
      "December 2023 - Shift 2",
      "December 2023 session",
      "Exam held 26 December 2023",
      "Life Sciences Shift 2",
      "1ku_7VST4O1WiXnNUcCsUiLDoYatWvLSE",
      "20251007153221671Final_Answer_Keys_All_Subjects_Dec-2023_07Oct2025.pdf"
    ),
    shiftedPaper(
      "december-2022-june-2023-shift-1",
      "December 2022/June 2023 - Shift 1",
      "Merged December 2022/June 2023 session",
      "Exam held 6 June 2023",
      "Life Sciences Shift 1",
      "1fIT9y5BEOjNBQ1H0BTa2KXg_G2n_vROO",
      "20251007135952022Final_Answer_Keys_All_Subjects_Dec-2022_June-2023_07Oct2025.pdf"
    ),
    shiftedPaper(
      "december-2022-june-2023-shift-2",
      "December 2022/June 2023 - Shift 2",
      "Merged December 2022/June 2023 session",
      "Exam held 6 June 2023",
      "Life Sciences Shift 2",
      "17JWaywnDwCB2m7BFd5DkZVFcU4HmqDop",
      "20251007135952022Final_Answer_Keys_All_Subjects_Dec-2022_June-2023_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2022-shift-1",
      "June 2022 - Shift 1",
      "June 2022 session",
      "Exam held 17 September 2022",
      "Life Sciences Shift 1",
      "1u2Sc_K666lF7Ce1M0AIrmuVrzunpx9aO",
      "20251007134531584Final_Answer_Keys_All_Subjects_June-2022_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2022-shift-2",
      "June 2022 - Shift 2",
      "June 2022 session",
      "Exam held 17 September 2022",
      "Life Sciences Shift 2",
      "1_CTVZDr-z_T2JM1H0XhqWtS0j1a1xyyJ",
      "20251007134531584Final_Answer_Keys_All_Subjects_June-2022_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2021-shift-1",
      "June 2021 - Shift 1",
      "June 2021 session",
      "Exam held 17 February 2022",
      "Life Sciences Shift 1",
      "1zw5Gasw5soineUsZoEyFzRCZo8Ew_MmF",
      "20251007132201193Final_Answer_Keys_All_Subjects_June-2021_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2021-shift-2",
      "June 2021 - Shift 2",
      "June 2021 session",
      "Exam held 17 February 2022",
      "Life Sciences Shift 2",
      "1vvDvV9oeHSPk4bSCClP3SLCZDvD5vjkI",
      "20251007132201193Final_Answer_Keys_All_Subjects_June-2021_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2020-shift-1",
      "June 2020 - Shift 1",
      "June 2020 session",
      "Exam held 21 November 2020",
      "Life Sciences Shift 1",
      "1jpPH779TN2OOovFTY8oizR81OPNNFeH4",
      "20251007131754959Final_Answer_Keys_All_Subjects_June-2020_07Oct2025.pdf"
    ),
    shiftedPaper(
      "june-2020-shift-2",
      "June 2020 - Shift 2",
      "June 2020 session",
      "Exam held 21 November 2020",
      "Life Sciences Shift 2",
      "1UXpHO6du6NzooZDqzX-Sp7BsGpDS3Zpk",
      "20251007131754959Final_Answer_Keys_All_Subjects_June-2020_07Oct2025.pdf"
    ),
    legacyPaper(
      "june-2019-set-a",
      "June 2019 - Set A",
      "June 2019 session",
      "Exam held 16 June 2019",
      "20210702125505787Life_sciences_A.pdf",
      "20210702130831426FINAL_KEYS_JUNE_2019_Life_Sciences.pdf"
    ),
    legacyPaper(
      "december-2018-set-a",
      "December 2018 - Set A",
      "December 2018 session",
      "December 2018",
      "20190705141845233lifeA_Dec2018-.pdf",
      "20190705125604916LifekeyFinal_Dec2018.pdf"
    ),
    legacyPaper(
      "june-2018-set-a",
      "June 2018 - Set A",
      "June 2018 session",
      "June 2018",
      "20190925153323298lifeA_June2018.pdf",
      "20190705150942857Lifekey_June2018.pdf"
    ),
    legacyPaper(
      "december-2017-set-a",
      "December 2017 - Set A",
      "December 2017 session",
      "December 2017",
      "20190710103450301lifeA_Dec2017.pdf",
      "20190710101246498Lifekey_Dec2017.pdf"
    ),
    legacyPaper(
      "june-2017-set-a",
      "June 2017 - Set A",
      "June 2017 session",
      "June 2017",
      "20190925151545554lifeA_June2017.pdf",
      "20190710104014799Lifekey_June2017.pdf"
    ),
    legacyPaper(
      "december-2016-set-a",
      "December 2016 - Set A",
      "December 2016 session",
      "December 2016",
      "20190715141349435lifeA_Dec2016.pdf",
      "20190715143449295Lifekey_Dec2016.pdf"
    ),
    legacyPaper(
      "june-2016-set-a",
      "June 2016 - Set A",
      "June 2016 session",
      "June 2016",
      "20190715144728757lifeA_June2016.pdf",
      "20190715144125116Lifekey_June2016.pdf"
    ),
    legacyPaper(
      "december-2015-set-a",
      "December 2015 - Set A",
      "December 2015 session",
      "December 2015",
      "20190716100009030lifeA_Dec2015.pdf",
      "20190716094620801lifekey_Dec2015.pdf"
    ),
    legacyPaper(
      "june-2015-set-a",
      "June 2015 - Set A",
      "June 2015 session",
      "June 2015",
      "20190925153606290lifeA_June2015.pdf",
      "20190715154136219lifekey_June2015.pdf"
    )
  ];
})();
