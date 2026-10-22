import { lazy, Suspense, useState, type ComponentType, type ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { RedirectTo } from "./components/routing/RedirectTo";
import { AuthPage } from "./features/auth/AuthPage";
import { PasswordRecoveryPage } from "./features/auth/PasswordRecoveryPage";
import { ForcedPasswordChangePage } from "./features/auth/ForcedPasswordChangePage";
import { useAuth } from "./hooks/useAuth";
import { useRouter } from "./hooks/useRouter";
import { useTheme } from "./hooks/useTheme";
import type { User } from "./types/auth";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SetupProfilePage } from "./pages/SetupProfilePage";
import {
  getBrowseRouteValue,
  getPracticeRouteValue,
  getTopicRouteValue,
  navigateTo
} from "./utils/router";

const lazyNamed = <T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K
) => lazy(async () => ({ default: (await loader())[name] as ComponentType<any> }));

const AdminAccountsPage = lazyNamed(() => import("./features/admin/AdminAccountsPage"), "AdminAccountsPage");
const AdminImportPage = lazyNamed(() => import("./features/admin/AdminImportPage"), "AdminImportPage");
const AdminImportDetailPage = lazyNamed(() => import("./features/admin/AdminImportDetailPage"), "AdminImportDetailPage");
const AdminImportHistoryPage = lazyNamed(() => import("./features/admin/AdminImportHistoryPage"), "AdminImportHistoryPage");
const AdminOverviewPage = lazyNamed(() => import("./features/admin/AdminOverviewPage"), "AdminOverviewPage");
const AdminQuestionBankPage = lazyNamed(() => import("./features/admin/AdminQuestionBankPage"), "AdminQuestionBankPage");
const AdminValidationPage = lazyNamed(() => import("./features/admin/AdminValidationPage"), "AdminValidationPage");
const BrowsePage = lazyNamed(() => import("./pages/BrowsePage"), "BrowsePage");
const CareerPage = lazyNamed(() => import("./pages/CareerPage"), "CareerPage");
const ExamPage = lazyNamed(() => import("./pages/ExamPage"), "ExamPage");
const ProfilePage = lazyNamed(() => import("./pages/ProfilePage"), "ProfilePage");
const ReviewPage = lazyNamed(() => import("./pages/ReviewPage"), "ReviewPage");
const StudyPage = lazyNamed(() => import("./pages/StudyPage"), "StudyPage");
const TopicWorldPage = lazyNamed(() => import("./pages/TopicWorldPage"), "TopicWorldPage");
const ExamEntryDialog = lazyNamed(() => import("./features/exam/ExamEntryDialog"), "ExamEntryDialog");

const pageFallback = <p className="status-message">جاري تجهيز الصفحة...</p>;

export default function App() {
  const { path } = useRouter();
  const auth = useAuth();
  const theme = useTheme();
  const [isExamRuntimeActive, setIsExamRuntimeActive] = useState(false);
  const [shouldAutoStartExam, setShouldAutoStartExam] = useState(false);
  const browseValue = getBrowseRouteValue(path);
  const practiceValue = getPracticeRouteValue(path);
  const topicRouteValue = getTopicRouteValue(path);

  const launchExam = () => {
    setIsExamRuntimeActive(true);
    setShouldAutoStartExam(true);
    navigateTo("/exam");
  };

  if (path === "/login") {
    if (!auth.isLoading && auth.user) {
      return <RedirectTo path={auth.user.mustChangePassword ? "/change-password" : auth.user.profileCompleted ? "/career" : "/setup-profile"} />;
    }
    return (
      <AuthPage
        mode="login"
        onAuthenticated={(user) => {
          auth.setUser(user);
          navigateTo(user.mustChangePassword ? "/change-password" : user.profileCompleted ? "/career" : "/setup-profile");
        }}
      />
    );
  }

  if (path === "/register") {
    if (!auth.isLoading && auth.user) {
      return <RedirectTo path={auth.user.mustChangePassword ? "/change-password" : auth.user.profileCompleted ? "/career" : "/setup-profile"} />;
    }
    return (
      <AuthPage
        mode="register"
        onAuthenticated={(user) => {
          auth.setUser(user);
          navigateTo(user.mustChangePassword ? "/change-password" : user.profileCompleted ? "/career" : "/setup-profile");
        }}
      />
    );
  }

  if (path === "/forgot-password") {
    return <PasswordRecoveryPage mode="request" />;
  }

  if (path === "/reset-password") {
    return <PasswordRecoveryPage mode="reset" />;
  }

  if (path === "/change-password") {
    return (
      <ProtectedRoute isLoading={auth.isLoading} user={auth.user}>
        {auth.user?.mustChangePassword
          ? <ForcedPasswordChangePage />
          : <RedirectTo path={auth.user?.profileCompleted ? "/career" : "/setup-profile"} />}
      </ProtectedRoute>
    );
  }

  if (path === "/") {
    return <LandingPage user={auth.user} />;
  }

  if (path === "/setup-profile") {
    return (
      <ProtectedRoute isLoading={auth.isLoading} user={auth.user}>
        {auth.user?.mustChangePassword ? (
          <RedirectTo path="/change-password" />
        ) : auth.user?.profileCompleted ? (
          <RedirectTo path="/career" />
        ) : auth.user ? (
          <SetupProfilePage
            user={auth.user}
            onProfileCompleted={(user) => auth.setUser(user)}
          />
        ) : null}
      </ProtectedRoute>
    );
  }

  const renderProtectedPage = (children: ReactNode) => (
    <ProtectedRoute isLoading={auth.isLoading} user={auth.user}>
      {auth.user?.mustChangePassword ? (
        <RedirectTo path="/change-password" />
      ) : auth.user && !auth.user.profileCompleted ? (
        <RedirectTo path="/setup-profile" />
      ) : (
        <AppShell
          currentPath={path}
          user={auth.user}
        >
          <Suspense fallback={pageFallback}>{children}</Suspense>
        </AppShell>
      )}
    </ProtectedRoute>
  );

  const renderProtectedExamPage = (children: ReactNode) => (
    <ProtectedRoute isLoading={auth.isLoading} user={auth.user}>
      {auth.user?.mustChangePassword ? (
        <RedirectTo path="/change-password" />
      ) : auth.user && !auth.user.profileCompleted ? (
        <RedirectTo path="/setup-profile" />
      ) : (
        <Suspense fallback={pageFallback}>{children}</Suspense>
      )}
    </ProtectedRoute>
  );

  const renderAdminPage = (children: ReactNode) =>
    renderProtectedPage(auth.user?.isAdmin ? children : <NotFoundPage />);

  if (path === "/career") {
    return renderProtectedPage(auth.user ? (
      <CareerPage key={auth.user.id} userId={auth.user.id} username={auth.user.username} />
    ) : null);
  }

  if (topicRouteValue) {
    return renderProtectedPage(
      <TopicWorldPage
        subjectSlug={topicRouteValue.subject}
        topicSlug={topicRouteValue.topic}
      />
    );
  }

  if (browseValue) {
    return renderProtectedPage(
      <BrowsePage
        subjectSlug={browseValue.subject}
        subtopicSlug={browseValue.subtopic}
        topicSlug={browseValue.topic}
      />
    );
  }

  if (practiceValue) {
    const browsePath = practiceValue.subtopic
      ? `/browse/${practiceValue.subject}/${practiceValue.topic}/${practiceValue.subtopic}`
      : `/browse/${practiceValue.subject}/${practiceValue.topic}`;

    return renderProtectedPage(<RedirectTo path={browsePath} />);
  }

  if (path === "/study") {
    return renderProtectedPage(<StudyPage />);
  }

  if (path === "/exam") {
    if (isExamRuntimeActive) {
      return renderProtectedExamPage(
        <ExamPage
          autoStart={shouldAutoStartExam}
          onAutoStartConsumed={() => setShouldAutoStartExam(false)}
          onExit={() => {
            setIsExamRuntimeActive(false);
            setShouldAutoStartExam(false);
            navigateTo("/career");
          }}
          userEmail={auth.user?.email}
        />
      );
    }

    return renderProtectedPage(
      <ExamEntryDialog displayMode="page" onStart={launchExam} />
    );
  }

  if (path === "/review") {
    return renderProtectedPage(<ReviewPage />);
  }

  if (path === "/profile") {
    return renderProtectedPage(
      auth.user ? (
        <ProfilePage
          activeTheme={theme.theme}
          user={auth.user}
          onLogout={auth.logout}
          onThemeChange={theme.setTheme}
          onProfileSaved={(user: User) => auth.setUser(user)}
        />
      ) : null
    );
  }

  if (path === "/admin/validation") {
    return renderAdminPage(<AdminValidationPage />);
  }

  if (path === "/admin/import") {
    return renderAdminPage(<AdminImportPage />);
  }

  if (path === "/admin/questions") {
    return renderAdminPage(<AdminQuestionBankPage />);
  }

  if (path === "/admin/imports") {
    return renderAdminPage(<AdminImportHistoryPage />);
  }

  if (path === "/admin/accounts") {
    return renderAdminPage(<AdminAccountsPage />);
  }

  const adminImportDetailMatch = /^\/admin\/imports\/([A-Za-z0-9-]+)$/.exec(path);
  if (adminImportDetailMatch) {
    return renderAdminPage(
      <AdminImportDetailPage jobId={adminImportDetailMatch[1]} />
    );
  }

  if (path === "/admin") {
    return renderAdminPage(<AdminOverviewPage />);
  }

  if (path.startsWith("/admin")) {
    return renderAdminPage(<NotFoundPage />);
  }

  return <NotFoundPage />;
}
