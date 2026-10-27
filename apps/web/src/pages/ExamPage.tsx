import { AppShell } from "../components/layout/AppShell";
import { ExamEntryDialog } from "../features/exam/ExamEntryDialog";
import { ExamMode } from "../features/exam/ExamMode";
import { useExamMode } from "../features/exam/useExamMode";
import type { User } from "../types/auth";
import { navigateTo } from "../utils/router";

export function ExamPage({
  onExit,
  user
}: {
  onExit: () => void;
  user: User;
}) {
  const exam = useExamMode();

  if (exam.isLoadingSavedExam) {
    return (
      <AppShell currentPath="/exam" user={user}>
        <div className="route-loading-state" role="status">
          <span aria-hidden="true" />
          <p className="status-message">جاري استعادة الاختبار...</p>
        </div>
      </AppShell>
    );
  }

  if (exam.exam || exam.result) {
    return <ExamMode exam={exam} onExit={onExit} userEmail={user.email} />;
  }

  return (
    <AppShell currentPath="/exam" user={user}>
      {exam.error ? (
        <section className="exam-start-card" aria-labelledby="exam-start-error-title">
          <p className="page-eyebrow">وضع الاختبار</p>
          <h1 className="page-title" id="exam-start-error-title">
            تعذر تجهيز الاختبار
          </h1>
          <p className="error-message" role="alert">{exam.error}</p>
          <div className="action-row">
            <button
              type="button"
              disabled={exam.isStarting}
              onClick={() => void exam.startExam()}
            >
              {exam.isStarting ? "جاري المحاولة..." : "إعادة المحاولة"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => navigateTo("/career")}
            >
              العودة إلى المركز
            </button>
          </div>
        </section>
      ) : (
        <ExamEntryDialog displayMode="page" onStart={exam.startExam} />
      )}
    </AppShell>
  );
}
