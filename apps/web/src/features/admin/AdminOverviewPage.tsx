import { useEffect, useMemo, useState } from "react";
import { SystemIcon, type SystemIconName } from "../../components/ui/SystemIcon";
import { adminService } from "../../services/adminService";
import { bankService } from "../../services/bankService";
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

type AdminOverviewLoaders = {
  accounts: typeof adminService.getAdminAccounts;
  bankConfig: typeof bankService.getConfig;
  history: typeof adminService.getImportJobs;
  questionBank: () => ReturnType<typeof adminService.getQuestionBank>;
};

type AdminOverviewSnapshot = {
  adminCount?: number;
  bankCount?: number;
  failed: Array<keyof AdminOverviewLoaders>;
  jobs?: ImportJob[];
  questionCount?: number;
};

const defaultLoaders: AdminOverviewLoaders = {
  accounts: adminService.getAdminAccounts,
  bankConfig: bankService.getConfig,
  history: adminService.getImportJobs,
  questionBank: () => adminService.getQuestionBank({ page: 1, pageSize: 1 })
};

export const loadAdminOverviewSnapshot = async (
  loaders: AdminOverviewLoaders = defaultLoaders
): Promise<AdminOverviewSnapshot> => {
  const keys = ["history", "questionBank", "accounts", "bankConfig"] as const;
  const results = await Promise.allSettled([
    loaders.history(),
    loaders.questionBank(),
    loaders.accounts(),
    loaders.bankConfig()
  ]);
  const failed = results.flatMap((result, index) =>
    result.status === "rejected" ? [keys[index]] : []
  );
  const [history, questionBank, accounts, bankConfig] = results;

  return {
    adminCount: accounts.status === "fulfilled"
      ? accounts.value.admins.length
      : undefined,
    bankCount: bankConfig.status === "fulfilled"
      ? bankConfig.value.config.availableBankCount
      : undefined,
    failed,
    jobs: history.status === "fulfilled" ? history.value.jobs : undefined,
    questionCount: questionBank.status === "fulfilled"
      ? questionBank.value.total
      : undefined
  };
};

const activeUploadStatuses: ImportJobStatus[] = [
  "analyzing",
  "ready",
  "importing"
];

const toArabicNumber = (value: number) => value.toLocaleString("ar-SA");

export function AdminOverviewPage() {
  const cachedHistory = adminService.getCachedImportJobs();
  const cachedQuestionBank = adminService.getCachedQuestionBank({ page: 1, pageSize: 1 });
  const cachedAccounts = adminService.getCachedAdminAccounts();
  const cachedBankConfig = bankService.getCachedConfig();
  const [jobs, setJobs] = useState<ImportJob[] | null>(cachedHistory?.data.jobs ?? null);
  const [questionCount, setQuestionCount] = useState<number | null>(cachedQuestionBank?.data.total ?? null);
  const [adminCount, setAdminCount] = useState<number | null>(cachedAccounts?.data.admins.length ?? null);
  const [bankCount, setBankCount] = useState<number | null>(cachedBankConfig?.data.config.availableBankCount ?? null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsRefreshing(true);
    setError("");

    void loadAdminOverviewSnapshot()
      .then((snapshot) => {
        if (!isMounted) return;
        if (snapshot.jobs) setJobs(snapshot.jobs);
        if (snapshot.questionCount !== undefined) setQuestionCount(snapshot.questionCount);
        if (snapshot.adminCount !== undefined) setAdminCount(snapshot.adminCount);
        if (snapshot.bankCount !== undefined) setBankCount(snapshot.bankCount);
        if (snapshot.failed.length > 0) {
          setError("تعذر تحديث بعض بيانات الملخص. بقيت البيانات المتاحة ظاهرة ويمكن إعادة المحاولة.");
        }
      })
      .finally(() => {
        if (isMounted) setIsRefreshing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reloadVersion]);

  const overview = useMemo(() => {
    const resolvedJobs = jobs ?? [];
    const activeUploads = resolvedJobs.filter((job) =>
      activeUploadStatuses.includes(job.status)
    ).length;
    const failedUploads = resolvedJobs.filter((job) => job.status === "failed").length;
    const completedUploads = resolvedJobs.filter(
      (job) => job.status === "completed"
    ).length;

    const entries: OverviewEntry[] = [
      {
        action: "فتح",
        icon: "bank",
        label: "بنك الأسئلة",
        meta: "سؤال داخل النظام",
        route: "/admin/questions",
        value: questionCount === null ? "—" : toArabicNumber(questionCount)
      },
      {
        action: "رفع",
        icon: "upload",
        label: "رفع الأسئلة",
        meta: activeUploads > 0 ? "دفعات تحتاج متابعة" : "جاهز لدفعة جديدة",
        route: "/admin/import",
        value: jobs === null ? "—" : activeUploads > 0 ? toArabicNumber(activeUploads) : "جاهز"
      },
      {
        action: "السجل",
        icon: "history",
        label: "سجل الرفع",
        meta: `${toArabicNumber(completedUploads)} مكتملة`,
        route: "/admin/imports",
        value: jobs === null ? "—" : toArabicNumber(jobs.length)
      },
      {
        action: "إدارة",
        icon: "users",
        label: "إدارة المدراء",
        meta: "حسابات بصلاحية الإدارة",
        route: "/admin/accounts",
        value: adminCount === null ? "—" : toArabicNumber(adminCount)
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
      {error ? (
        <p className="admin-alert error" role="alert">
          {error}{" "}
          <button
            className="secondary"
            disabled={isRefreshing}
            type="button"
            onClick={() => setReloadVersion((current) => current + 1)}
          >
            {isRefreshing ? "جاري التحديث..." : "إعادة المحاولة"}
          </button>
        </p>
      ) : null}

      <section className="admin-overview-entry-grid" aria-label="أقسام الإدارة">
        {overview.entries.map((entry) => (
          <button
            className="admin-overview-entry"
            data-prefetch-route={entry.route}
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
          <SystemIcon name="bank" />
          <strong>{bankCount === null ? "—" : toArabicNumber(bankCount)}</strong>
          <small>قسم متاح · ٥٥ كمي أو ٦٥ لفظي</small>
        </span>
        <span>
          <SystemIcon name="status" />
          <strong>{jobs === null ? "—" : toArabicNumber(overview.activeUploads)}</strong>
          <small>قيد الرفع أو المراجعة</small>
        </span>
        <span>
          <SystemIcon name="check" />
          <strong>{jobs === null ? "—" : toArabicNumber(overview.completedUploads)}</strong>
          <small>دفعات مكتملة</small>
        </span>
        <span data-tone={overview.failedUploads > 0 ? "warning" : "neutral"}>
          <SystemIcon name="history" />
          <strong>{jobs === null ? "—" : toArabicNumber(overview.failedUploads)}</strong>
          <small>دفعات فشلت</small>
        </span>
      </section>
    </AdminShell>
  );
}
