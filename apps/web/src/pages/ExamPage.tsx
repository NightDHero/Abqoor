import { ExamMode } from "../features/exam/ExamMode";

export function ExamPage({ userEmail }: { userEmail?: string }) {
  return <ExamMode userEmail={userEmail} />;
}
