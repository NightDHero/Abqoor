import {
  createElement,
  Suspense,
  useLayoutEffect,
  type ComponentType,
  type ReactNode
} from "react";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { RedirectTo } from "./components/routing/RedirectTo";
import { AuthPage } from "./features/auth/AuthPage";
import { PasswordRecoveryPage } from "./features/auth/PasswordRecoveryPage";
import { ForcedPasswordChangePage } from "./features/auth/ForcedPasswordChangePage";
import { useAuth } from "./hooks/useAuth";
import { useRoutePreloading } from "./hooks/useRoutePreloading";
import { useRouter } from "./hooks/useRouter";
import { useTheme } from "./hooks/useTheme";
import {
  preloadRoute,
  routeModules,
  type PreparedRouteModule
} from "./services/routePreload";
import {
  markPerformanceStage,
  recordPerformanceLoadingState
} from "./services/performanceTelemetry";
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

const preparedNamed = (
  moduleResource: PreparedRouteModule,
  name: string
) => function PreparedRouteComponent(props: Record<string, unknown>) {
  const Component = moduleResource.read()[name] as ComponentType<any>;
  useLayoutEffect(() => {
    markPerformanceStage("route-component-mounted");
  }, []);
  return createElement(Component, props);
};

const AdminAccountsPage = preparedNamed(routeModules.adminAccounts, "AdminAccountsPage");
const AdminImportPage = preparedNamed(routeModules.adminImport, "AdminImportPage");
const AdminImportDetailPage = preparedNamed(routeModules.adminImportDetail, "AdminImportDetailPage");
const AdminImportHistoryPage = preparedNamed(routeModules.adminImportHistory, "AdminImportHistoryPage");
const AdminOverviewPage = preparedNamed(routeModules.adminOverview, "AdminOverviewPage");
const AdminQuestionBankPage = preparedNamed(routeModules.adminQuestionBank, "AdminQuestionBankPage");
const AdminValidationPage = preparedNamed(routeModules.adminValidation, "AdminValidationPage");
const BrowsePage = preparedNamed(routeModules.browse, "BrowsePage");
const CareerPage = preparedNamed(routeModules.career, "CareerPage");
const ExamPage = preparedNamed(routeModules.exam, "ExamPage");
const ProfilePage = preparedNamed(routeModules.profile, "ProfilePage");
const ReviewPage = preparedNamed(routeModules.review, "ReviewPage");
const StudyPage = preparedNamed(routeModules.study, "StudyPage");
const TopicWorldPage = preparedNamed(routeModules.topicWorld, "TopicWorldPage");

const PageFallback = () => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const currentCount = Number(root.dataset.routeFallbackCount ?? "0");
    root.dataset.routeFallbackCount = String(currentCount + 1);
    recordPerformanceLoadingState("route-fallback");
  }, []);

  return (
    <div className="route-loading-state" role="status">
      <span aria-hidden="true" />
      <p className="status-message">جاري تجهيز الصفحة...</p>
    </div>
  );
};

export default function App() {
  const { path } = useRouter();
  const auth = useAuth();
  const theme = useTheme();
  useRoutePreloading({ currentPath: path, user: auth.user });
  useLayoutEffect(() => {
    markPerformanceStage("route-visible");
    const root = document.documentElement;
    const navigationPath = root.dataset.navigationPath;
    const navigationStartedAt = Number(root.dataset.navigationStartedAt);
    if (
      navigationPath === path.split(/[?#]/, 1)[0] &&
      Number.isFinite(navigationStartedAt)
    ) {
      root.dataset.navigationContentDurationMs = (
        performance.now() - navigationStartedAt
      ).toFixed(1);
    }
  }, [path]);
  const browseValue = getBrowseRouteValue(path);
  const practiceValue = getPracticeRouteValue(path);
  const topicRouteValue = getTopicRouteValue(path);
  const finishAuthentication = (user: User) => {
    const destination = user.mustChangePassword
      ? "/change-password"
      : user.profileCompleted
        ? "/career"
        : "/setup-profile";
    auth.setUser(user);
    void preloadRoute(destination, user).catch(() => undefined);
    navigateTo(destination);
  };

  if (path === "/login") {
    if (!auth.isLoading && auth.user) {
      return <RedirectTo path={auth.user.mustChangePassword ? "/change-password" : auth.user.profileCompleted ? "/career" : "/setup-profile"} />;
    }
    return (
      <AuthPage
        mode="login"
        onAuthenticated={finishAuthentication}
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
        onAuthenticated={finishAuthentication}
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
          <Suspense fallback={<PageFallback />}>{children}</Suspense>
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
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
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
    return renderProtectedExamPage(
      auth.user ? (
        <ExamPage
          onExit={() => navigateTo("/career")}
          user={auth.user}
        />
      ) : null
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
