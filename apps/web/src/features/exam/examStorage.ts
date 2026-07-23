export const activeExamStorageKey = "abqoor.exam.activeAttemptId";

export const getSavedActiveExamId = () => {
  return window.localStorage.getItem(activeExamStorageKey);
};

export const saveActiveExamId = (examId: string) => {
  window.localStorage.setItem(activeExamStorageKey, examId);
};

export const clearSavedActiveExamId = () => {
  window.localStorage.removeItem(activeExamStorageKey);
};
