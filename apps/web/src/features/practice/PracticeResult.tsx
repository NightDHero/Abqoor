import type { SessionResult } from "../../types/session";
import { navigateTo } from "../../utils/router";

export function PracticeResult({ result }: { result: SessionResult }) {
  return (
    <section className="practice-panel" aria-labelledby="practice-result-title">
      <p className="page-eyebrow">نتيجة التدريب</p>
      <h1 className="page-title" id="practice-result-title">
        انتهت الجلسة
      </h1>

      <dl className="result-list">
        <div>
          <dt>إجمالي الأسئلة</dt>
          <dd>{result.totalQuestions}</dd>
        </div>
        <div>
          <dt>الإجابات الصحيحة</dt>
          <dd>{result.correctAnswers}</dd>
        </div>
        <div>
          <dt>الإجابات غير الصحيحة</dt>
          <dd>{result.incorrectAnswers}</dd>
        </div>
        <div>
          <dt>الدقة</dt>
          <dd>{result.finalScorePercentage}%</dd>
        </div>
      </dl>

      <div className="action-row">
        <button type="button" onClick={() => navigateTo("/career")}>
          العودة إلى المسار
        </button>
      </div>
    </section>
  );
}
