import { useState, type ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { RedirectTo } from "./components/routing/RedirectTo";
import { AdminAccountsPage } from "./features/admin/AdminAccountsPage";
import { AdminImportPage } from "./features/admin/AdminImportPage";
import { AdminImportDetailPage } from "./features/admin/AdminImportDetailPage";
import { AdminImportHistoryPage } from "./features/admin/AdminImportHistoryPage";
import { AdminOverviewPage } from "./features/admin/AdminOverviewPage";
import { AdminQuestionBankPage } from "./features/admin/AdminQuestionBankPage";
import { AdminValidationPage } from "./features/admin/AdminValidationPage";
import { AuthPage } from "./features/auth/AuthPage";
import { ExamEntryDialog } from "./features/exam/ExamEntryDialog";
import { useAuth } from "./hooks/useAuth";
import { useRouter } from "./hooks/useRouter";
import { useTheme } from "./hooks/useTheme";
import { BrowsePage } from "./pages/BrowsePage";
import { CareerPage } from "./pages/CareerPage";
import { ExamPage } from "./pages/ExamPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReviewPage } from "./pages/ReviewPage";
import { SetupProfilePage } from "./pages/SetupProfilePage";
import { StudyPage } from "./pages/StudyPage";
import { TopicWorldPage } from "./pages/TopicWorldPage";
import {
  getBrowseRouteValue,
  getPracticeRouteValue,
  getTopicRouteValue,
  navigateTo
} from "./utils/router";

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
    return (
      <AuthPage
        mode="login"
        onAuthenticated={(user) => {
          auth.setUser(user);
          navigateTo(user.profileCompleted ? "/career" : "/setup-profile");
        }}
      />
    );
  }

  if (path === "/register") {
    return (
      <AuthPage
        mode="register"
        onAuthenticated={(user) => {
          auth.setUser(user);
          navigateTo(user.profileCompleted ? "/career" : "/setup-profile");
        }}
      />
    );
  }

  if (path === "/") {
    return <LandingPage user={auth.user} isLoadingUser={auth.isLoading} />;
  }

  if (path === "/setup-profile") {
    return (
      <ProtectedRoute isLoading={auth.isLoading} user={auth.user}>
        {auth.user?.profileCompleted ? (
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
      {auth.user && !auth.user.profileCompleted ? (
        <RedirectTo path="/setup-profile" />
      ) : (
        <AppShell
          currentPath={path}
          user={auth.user}
        >
          {children}
        </AppShell>
      )}
    </ProtectedRoute>
  );

  const renderProtectedExamPage = (children: ReactNode) => (
    <ProtectedRoute isLoading={auth.isLoading} user={auth.user}>
      {auth.user && !auth.user.profileCompleted ? (
        <RedirectTo path="/setup-profile" />
      ) : (
        children
      )}
    </ProtectedRoute>
  );

  const renderAdminPage = (children: ReactNode) =>
    renderProtectedPage(auth.user?.isAdmin ? children : <NotFoundPage />);

  if (path === "/career") {
    return renderProtectedPage(
      <CareerPage onLogout={auth.logout} user={auth.user} />
    );
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
          onThemeChange={theme.setTheme}
          onProfileSaved={(user) => auth.setUser(user)}
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
