import type { ReactNode } from "react";
import type { User } from "../../types/auth";
import { Navigation } from "./Navigation";

export function AppShell({
  children,
  currentPath,
  onLogout,
  user
}: {
  children: ReactNode;
  currentPath: string;
  onLogout: () => void;
  user: User | null;
}) {
  const isCareerExperience = currentPath === "/career";

  return (
    <div
      className={isCareerExperience ? "app-shell career-app-shell" : "app-shell"}
      dir="rtl"
    >
      <header className="app-header">
        <div className="brand-mark" aria-label="عبقور">
          <strong>عبقور</strong>
          <span>أساس الواجهة</span>
        </div>
        <Navigation className="desktop-nav" currentPath={currentPath} />
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
      <Navigation className="bottom-nav" currentPath={currentPath} />
    </div>
  );
}
