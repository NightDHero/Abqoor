import type { ReactNode } from "react";
import { navigateTo } from "../../utils/router";

const adminDestinations = [
  { label: "نظرة عامة", route: "/admin" },
  { label: "استيراد الأسئلة", route: "/admin/import" },
  { label: "بنك الأسئلة", route: "/admin/questions" },
  { label: "سجل الاستيراد", route: "/admin/imports" },
  { label: "إدارة المدراء", route: "/admin/accounts" }
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
              {destination.label}
            </a>
          );
        })}
      </nav>

      <div className="admin-workspace-content">{children}</div>
    </section>
  );
}
