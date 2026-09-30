export const bankConfig = Object.freeze({
  availableBankCount: 14,
  mathQuestionsPerBank: 55,
  verbalQuestionsPerBank: 65,
  studyPaceBanksPerDay: 1
});

export type StudyRestDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnly = (value: string) => {
  if (!datePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const calculateStudyPlan = (input: {
  bankCount: number;
  restDays: readonly StudyRestDay[];
  startDate: string;
}) => {
  if (!isDateOnly(input.startDate)) {
    throw new Error("Invalid study-plan start date.");
  }

  if (!Number.isInteger(input.bankCount) || input.bankCount < 1) {
    throw new Error("The study plan needs at least one bank.");
  }

  const uniqueRestDays = new Set(input.restDays);
  if (uniqueRestDays.size >= 7) {
    throw new Error("At least one study day is required each week.");
  }

  const [year, month, day] = input.startDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  let completedBanks = 0;
  let calendarDays = 0;

  while (completedBanks < input.bankCount) {
    calendarDays += 1;

    if (!uniqueRestDays.has(cursor.getUTCDay() as StudyRestDay)) {
      completedBanks += bankConfig.studyPaceBanksPerDay;
    }

    if (completedBanks < input.bankCount) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return {
    bankCount: input.bankCount,
    calendarDays,
    completionDate: cursor.toISOString().slice(0, 10),
    studyDays: input.bankCount
  };
};
