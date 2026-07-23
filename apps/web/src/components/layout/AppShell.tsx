import type { ReactNode } from "react";
import type { User } from "../../types/auth";
import { Navigation } from "./Navigation";

export function AppShell({
  children,
  currentPath,
  onLogout,
  onNavigate,
  user
}: {
  children: ReactNode;
  currentPath: string;
  onLogout: () => void;
  onNavigate?: () => void;
  user: User | null;
}) {
  const isCareerExperience = currentPath === "/career";
  const isExamExperience = currentPath === "/exam";
  const shellClassName = [
    "app-shell",
    isCareerExperience ? "career-app-shell" : "",
    !isCareerExperience && !isExamExperience ? "product-app-shell" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} dir="rtl">
      <header className="app-header">
        <div className="brand-mark" aria-label="عبقور">
          <strong>عبقور</strong>
          <span>أساس الواجهة</span>
        </div>
        <Navigation
          className="desktop-nav"
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
        <div className="header-actions">
          {user ? <span className="user-chip">{user.email}</span> : null}
          <button className="secondary" type="button" onClick={onLogout}>
            خروج
          </button>
        </div>
      </header>

      <main className={isCareerExperience ? "app-main career-app-main" : "app-main"}>
        {children}
      </main>
      <Navigation
        className="bottom-nav"
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
    </div>
  );
}
