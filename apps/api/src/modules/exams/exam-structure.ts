export const TOTAL_SECTIONS = 5;
export const MATH_PER_SECTION = 11;
export const ARABIC_PER_SECTION = 13;
export const QUESTIONS_PER_SECTION = MATH_PER_SECTION + ARABIC_PER_SECTION;
export const TOTAL_MATH = TOTAL_SECTIONS * MATH_PER_SECTION;
export const TOTAL_ARABIC = TOTAL_SECTIONS * ARABIC_PER_SECTION;
export const TOTAL_QUESTIONS = TOTAL_MATH + TOTAL_ARABIC;
export const SECTION_DURATION_SECONDS = 30 * 60;

export const officialExamStructure = Object.freeze({
  totalSections: TOTAL_SECTIONS,
  mathPerSection: MATH_PER_SECTION,
  arabicPerSection: ARABIC_PER_SECTION,
  questionsPerSection: QUESTIONS_PER_SECTION,
  totalMath: TOTAL_MATH,
  totalArabic: TOTAL_ARABIC,
  totalQuestions: TOTAL_QUESTIONS,
  sectionDurationSeconds: SECTION_DURATION_SECONDS
});

export type OfficialExamStructure = typeof officialExamStructure;
