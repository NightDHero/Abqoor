export const getQuestionBankPageCount = (total: number, pageSize: number) =>
  Math.max(1, Math.ceil(total / pageSize));

export const shouldShowQuestionBankEmptyState = (input: {
  error: string;
  isLoading: boolean;
  questionCount: number;
}) => !input.isLoading && !input.error && input.questionCount === 0;
