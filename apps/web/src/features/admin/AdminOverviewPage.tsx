import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { navigateTo } from "../../utils/router";
import type { ImportJob } from "../../types/admin";
import { AdminShell } from "./AdminShell";
import { formatAdminDate, importStatusLabels } from "./adminUtils";

export function AdminOverviewPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminService.getImportJobs(),
      adminService.getQuestionBank({ page: 1, pageSize: 1 })
    ])
      .then(([history, bank]) => {
        setJobs(history.jobs);
        setQuestionCount(bank.total);
      })
      .catch(() => setError("تعذر تحميل ملخص لوحة الإدارة."));
  }, []);

  const completed = jobs.filter((job) => job.status === "completed").length;

  return (
    <AdminShell currentPath="/admin" title="نظرة عامة">
      {error ? <p className="admin-alert error">{error}</p> : null}
      <section className="admin-overview-grid" aria-label="ملخص بنك الأسئلة">
        <article>
          <span>الأسئلة الحالية</span>
          <strong>{questionCount.toLocaleString("ar-SA")}</strong>
        </article>
        <article>
          <span>عمليات الاستيراد</span>
          <strong>{jobs.length.toLocaleString("ar-SA")}</strong>
        </article>
        <article>
          <span>عمليات مكتملة</span>
          <strong>{completed.toLocaleString("ar-SA")}</strong>
        </article>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-heading">
          <div>
            <h2>إدارة بنك الأسئلة</h2>
            <p>حلّل الدفعة كاملة، راجع ما سيتغير، ثم أكّد الاستيراد.</p>
          </div>
          <button type="button" onClick={() => navigateTo("/admin/import")}>
            استيراد أسئلة
          </button>
        </header>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-heading">
          <h2>أحدث عمليات الاستيراد</h2>
          <button className="secondary" type="button" onClick={() => navigateTo("/admin/imports")}>
            عرض السجل
          </button>
        </header>
        {jobs.length === 0 ? (
          <p className="admin-empty">لا توجد عمليات استيراد بعد.</p>
        ) : (
          <div className="admin-history-list">
            {jobs.slice(0, 5).map((job) => (
              <button
                className="admin-history-row"
                key={job.id}
                type="button"
                onClick={() => navigateTo(`/admin/imports/${job.id}`)}
              >
                <span>
                  <strong>استيراد #{job.id.slice(0, 8)}</strong>
                  <small>{formatAdminDate(job.createdAt)}</small>
                </span>
                <span>{job.totalQuestions.toLocaleString("ar-SA")} سؤال</span>
                <b data-status={job.status}>{importStatusLabels[job.status]}</b>
              </button>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
