import type { ReactNode } from "react";
import { SystemIcon, type SystemIconName } from "../../components/ui/SystemIcon";
import { navigateTo } from "../../utils/router";

const adminDestinations = [
  { icon: "status", label: "نظرة عامة", route: "/admin" },
  { icon: "upload", label: "رفع الأسئلة", route: "/admin/import" },
  { icon: "bank", label: "بنك الأسئلة", route: "/admin/questions" },
  { icon: "history", label: "سجل الرفع", route: "/admin/imports" },
  { icon: "users", label: "إدارة المدراء", route: "/admin/accounts" }
] as const;

export function AdminShell({
  children,
  currentPath,
  description,
  title
}: {
  children: ReactNode;
  currentPath: string;
  description?: string;
  title: string;
}) {
  return (
    <section className="admin-workspace">
      <header className="admin-workspace-header">
        <div>
          <p>لوحة الإدارة</p>
          <h1>{title}</h1>
          {description ? <span>{description}</span> : null}
        </div>
        <button type="button" onClick={() => navigateTo("/career")}>
          العودة إلى عبقور
        </button>
      </header>

      <nav className="admin-section-nav" aria-label="أقسام لوحة الإدارة">
        {adminDestinations.map((destination) => {
          const isActive =
            destination.route === "/admin"
              ? currentPath === "/admin"
              : currentPath === destination.route ||
                currentPath.startsWith(`${destination.route}/`);
          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "active" : undefined}
              href={destination.route}
              key={destination.route}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(destination.route);
              }}
            >
              <SystemIcon name={destination.icon as SystemIconName} />
              {destination.label}
            </a>
          );
        })}
      </nav>

      <div className="admin-workspace-content">{children}</div>
    </section>
  );
}
