import type { ReactNode } from "react";
import type { User } from "../../types/auth";
import { RedirectTo } from "./RedirectTo";

export function ProtectedRoute({
  children,
  isLoading,
  user
}: {
  children: ReactNode;
  isLoading: boolean;
  user: User | null;
}) {
  if (isLoading) {
    return (
      <main className="landing-shell">
        <section className="landing-panel">
          <p className="status-message">جاري التحقق من الجلسة...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <RedirectTo path="/login" />;
  }

  return <>{children}</>;
}
