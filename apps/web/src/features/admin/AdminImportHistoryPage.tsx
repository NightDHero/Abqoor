import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { navigateTo } from "../../utils/router";
import type { ImportHistoryResponse } from "../../types/admin";
import { formatAdminDate, formatRelativeAdminDays, importStatusLabels } from "./adminUtils";
import { AdminShell } from "./AdminShell";

export function AdminImportHistoryPage() {
  const pageSize = 25;
  const initialCache = adminService.getCachedImportJobs(1, pageSize);
  const [history, setHistory] = useState<ImportHistoryResponse>(initialCache?.data ?? {
    jobs: [],
    pagination: { page: 1, pageSize, totalItems: 0, totalPages: 1 }
  });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(!initialCache);

  const loadHistory = (nextPage: number) => {
    const cached = adminService.getCachedImportJobs(nextPage, pageSize);
    if (cached) setHistory(cached.data);
    setIsLoading(!cached);
    setError("");
    void adminService
      .getImportJobs(nextPage, pageSize)
      .then(setHistory)
      .catch(() => setError("تعذر تحميل سجل الرفع."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadHistory(page);
  }, []);

  useEffect(() => {
    if (isLoading || page >= history.pagination.totalPages) return;
    void adminService.getImportJobs(page + 1, pageSize).catch(() => undefined);
  }, [history.pagination.totalPages, isLoading, page]);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    loadHistory(nextPage);
  };

  return (
    <AdminShell currentPath="/admin/imports" title="سجل الرفع">
      {error ? <p className="admin-alert error">{error} <button className="secondary" type="button" onClick={() => loadHistory(page)}>إعادة المحاولة</button></p> : null}
      {isLoading && history.jobs.length === 0 ? <p className="admin-empty">جاري تحميل السجل...</p> : null}
      {!isLoading && history.jobs.length === 0 ? <p className="admin-empty">لا توجد عمليات رفع بعد.</p> : null}
      <div className="admin-history-list full">
        {history.jobs.map((job) => (
          <button className="admin-history-row" data-prefetch-route={`/admin/imports/${job.id}`} key={job.id} type="button" onClick={() => navigateTo(`/admin/imports/${job.id}`)}>
            <span><strong>رفع #{job.id.slice(0, 8)}</strong><small><b>{formatRelativeAdminDays(job.createdAt)}</b> · {formatAdminDate(job.createdAt)} · {job.createdBy}</small></span>
            <span><b>{job.totalQuestions.toLocaleString("ar-SA")}</b><small>سؤال</small></span>
            <span><b>{job.createdCount.toLocaleString("ar-SA")}</b><small>جديد</small></span>
            <span><b>{job.replacedCount.toLocaleString("ar-SA")}</b><small>مستبدل</small></span>
            <span><b>{job.skippedCount.toLocaleString("ar-SA")}</b><small>متخطى</small></span>
            <b data-status={job.status}>{importStatusLabels[job.status]}</b>
          </button>
        ))}
      </div>
      {history.pagination.totalPages > 1 ? (
        <nav className="admin-pagination" aria-label="صفحات سجل الرفع">
          <button className="secondary" disabled={page <= 1 || isLoading} type="button" onClick={() => goToPage(page - 1)}>السابق</button>
          <span>{page.toLocaleString("ar-SA")} / {history.pagination.totalPages.toLocaleString("ar-SA")}</span>
          <button className="secondary" disabled={page >= history.pagination.totalPages || isLoading} type="button" onClick={() => goToPage(page + 1)}>التالي</button>
        </nav>
      ) : null}
    </AdminShell>
  );
}
