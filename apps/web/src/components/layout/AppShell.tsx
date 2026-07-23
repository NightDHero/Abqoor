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
  const isLearningWorldExperience = currentPath.startsWith("/topic/");
  const shellClassName = [
    "app-shell",
    isCareerExperience ? "career-app-shell" : "",
    isExamExperience ? "exam-entry-app-shell" : "",
    isLearningWorldExperience ? "learning-world-app-shell" : "",
    !isCareerExperience && !isExamExperience && !isLearningWorldExperience
      ? "product-app-shell"
      : ""
  ]
    .filter(Boolean)
    .join(" ");
  const mainClassName = [
    "app-main",
    isCareerExperience ? "career-app-main" : "",
    isLearningWorldExperience ? "learning-world-app-main" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} dir="rtl">
      <header className="app-header">
        <div className="brand-mark" aria-label="عبقور">
          <strong>عبقور</strong>
          <span>ابنِ إتقانك</span>
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

      <main className={mainClassName}>{children}</main>
      <Navigation
        className="bottom-nav"
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
    </div>
  );
}
