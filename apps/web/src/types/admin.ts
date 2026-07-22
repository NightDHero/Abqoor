export type ValidationSummary = {
  totalQuestions: number;
  importedQuestions: number;
  failedQuestions: number;
  missingCorrectAnswers: number;
  missingImages: number;
};

export type ValidationQuestion = {
  id: string;
  question_image_url: string;
  correct_answer: string;
  subject: string;
  topic: string;
  difficulty: number;
  pdfPageNumber: number | null;
  excelRowNumber: number | null;
  imageExists: boolean;
};

export type ImportMode = "preview" | "commit";

export type ImportManifestItem = {
  questionId: string;
  imageUrl: string;
  questionNumber: number;
  pageIndex: number;
  correctAnswer?: "A" | "B" | "C" | "D";
  subject?: "quantitative" | "verbal";
  topic?: string;
  difficulty?: number;
  status: "success" | "failed";
  error?: string;
};

export type ImportResponse = {
  importJob: {
    id: string;
    status: string;
    successCount: number;
    failureCount: number;
  };
  manifest: ImportManifestItem[];
  metadataErrors?: string[];
};
