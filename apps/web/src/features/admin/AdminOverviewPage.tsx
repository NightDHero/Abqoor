import { useEffect, useMemo, useState } from "react";
import { SystemIcon, type SystemIconName } from "../../components/ui/SystemIcon";
import { adminService } from "../../services/adminService";
import { navigateTo } from "../../utils/router";
import type { ImportJob, ImportJobStatus } from "../../types/admin";
import { AdminShell } from "./AdminShell";

type OverviewEntry = {
  action: string;
  icon: SystemIconName;
  label: string;
  meta: string;
  route: string;
  value: string;
};

const activeUploadStatuses: ImportJobStatus[] = [
  "analyzing",
  "ready",
  "importing"
];

const toArabicNumber = (value: number) => value.toLocaleString("ar-SA");

export function AdminOverviewPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminService.getImportJobs(),
      adminService.getQuestionBank({ page: 1, pageSize: 1 }),
      adminService.getAdminAccounts()
    ])
      .then(([history, bank, accounts]) => {
        setJobs(history.jobs);
        setQuestionCount(bank.total);
        setAdminCount(accounts.admins.length);
      })
      .catch(() => setError("تعذر تحميل ملخص لوحة الإدارة."));
  }, []);

  const overview = useMemo(() => {
    const activeUploads = jobs.filter((job) =>
      activeUploadStatuses.includes(job.status)
    ).length;
    const failedUploads = jobs.filter((job) => job.status === "failed").length;
    const completedUploads = jobs.filter(
      (job) => job.status === "completed"
    ).length;

    const entries: OverviewEntry[] = [
      {
        action: "فتح",
        icon: "bank",
        label: "بنك الأسئلة",
        meta: "سؤال داخل النظام",
        route: "/admin/questions",
        value: toArabicNumber(questionCount)
      },
      {
        action: "رفع",
        icon: "upload",
        label: "رفع الأسئلة",
        meta: activeUploads > 0 ? "دفعات تحتاج متابعة" : "جاهز لدفعة جديدة",
        route: "/admin/import",
        value: activeUploads > 0 ? toArabicNumber(activeUploads) : "جاهز"
      },
      {
        action: "السجل",
        icon: "history",
        label: "سجل الرفع",
        meta: `${toArabicNumber(completedUploads)} مكتملة`,
        route: "/admin/imports",
        value: toArabicNumber(jobs.length)
      },
      {
        action: "إدارة",
        icon: "users",
        label: "إدارة المدراء",
        meta: "حسابات بصلاحية الإدارة",
        route: "/admin/accounts",
        value: toArabicNumber(adminCount)
      }
    ];

    return {
      activeUploads,
      completedUploads,
      entries,
      failedUploads
    };
  }, [adminCount, jobs, questionCount]);

  return (
    <AdminShell currentPath="/admin" title="نظرة عامة">
      {error ? <p className="admin-alert error">{error}</p> : null}

      <section className="admin-overview-entry-grid" aria-label="أقسام الإدارة">
        {overview.entries.map((entry) => (
          <button
            className="admin-overview-entry"
            key={entry.route}
            type="button"
            onClick={() => navigateTo(entry.route)}
          >
            <span className="admin-overview-entry-icon">
              <SystemIcon name={entry.icon} />
            </span>
            <span>
              <strong>{entry.label}</strong>
              <small>{entry.meta}</small>
            </span>
            <b>{entry.value}</b>
            <em>{entry.action}</em>
          </button>
        ))}
      </section>

      <section className="admin-overview-signal-strip" aria-label="حالة النظام">
        <span>
          <SystemIcon name="status" />
          <strong>{toArabicNumber(overview.activeUploads)}</strong>
          <small>قيد الرفع أو المراجعة</small>
        </span>
        <span>
          <SystemIcon name="check" />
          <strong>{toArabicNumber(overview.completedUploads)}</strong>
          <small>دفعات مكتملة</small>
        </span>
        <span data-tone={overview.failedUploads > 0 ? "warning" : "neutral"}>
          <SystemIcon name="history" />
          <strong>{toArabicNumber(overview.failedUploads)}</strong>
          <small>دفعات فشلت</small>
        </span>
      </section>
    </AdminShell>
  );
}
