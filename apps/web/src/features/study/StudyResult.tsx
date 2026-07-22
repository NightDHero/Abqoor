import type { SessionResult } from "../../types/session";

export function StudyResult({
  onStartNextSession,
  result,
  weakTopics
}: {
  onStartNextSession: () => void;
  result: SessionResult;
  weakTopics: string[];
}) {
  return (
    <section className="study-panel" aria-labelledby="study-result-title">
      <p className="page-eyebrow">نتيجة جلسة الدراسة</p>
      <h1 className="page-title" id="study-result-title">
        انتهت الجلسة
      </h1>

      <dl className="result-list">
        <div>
          <dt>الأسئلة المعروضة</dt>
          <dd>{result.totalQuestions}</dd>
        </div>
        <div>
          <dt>الأسئلة المجابة</dt>
          <dd>{result.answeredQuestions}</dd>
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
          <dt>الأسئلة المتروكة</dt>
          <dd>{result.unansweredQuestions}</dd>
        </div>
        <div>
          <dt>الدقة</dt>
          <dd>{result.finalScorePercentage}%</dd>
        </div>
      </dl>

      <section className="study-panel">
        <h2>الموضوعات الضعيفة في هذه الجلسة</h2>
        {weakTopics.length > 0 ? (
          <ul className="simple-list">
            {weakTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        ) : (
          <p className="status-message">
            لم تظهر موضوعات ضعيفة من الأسئلة التي تمت الإجابة عنها.
          </p>
        )}
      </section>

      <section className="study-panel">
        <h2>الجلسة المقترحة التالية</h2>
        <p>
          ابدأ جلسة دراسة تكيفية جديدة. سيستخدم النظام سجل إجاباتك السابق
          والأسئلة الخاطئة وغير المجابة لاختيار المجموعة التالية.
        </p>
        <div className="action-row">
          <button type="button" onClick={onStartNextSession}>
            ابدأ جلسة جديدة
          </button>
        </div>
      </section>
    </section>
  );
}
