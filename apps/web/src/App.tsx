import type { ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { PageContainer } from "./components/layout/PageContainer";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { RedirectTo } from "./components/routing/RedirectTo";
import { AdminImportPage } from "./features/admin/AdminImportPage";
import { AdminValidationPage } from "./features/admin/AdminValidationPage";
import { AuthPage } from "./features/auth/AuthPage";
import { useAuth } from "./hooks/useAuth";
import { useRouter } from "./hooks/useRouter";
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
  const browseValue = getBrowseRouteValue(path);
  const practiceValue = getPracticeRouteValue(path);
  const topicRouteValue = getTopicRouteValue(path);

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
        <AppShell user={auth.user} currentPath={path} onLogout={auth.logout}>
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

  if (path === "/career") {
    return renderProtectedPage(<CareerPage />);
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
    return renderProtectedExamPage(<ExamPage userEmail={auth.user?.email} />);
  }

  if (path === "/review") {
    return renderProtectedPage(<ReviewPage />);
  }

  if (path === "/profile") {
    return renderProtectedPage(
      auth.user ? (
        <ProfilePage
          user={auth.user}
          onProfileSaved={(user) => auth.setUser(user)}
        />
      ) : null
    );
  }

  if (path === "/admin/validation") {
    return renderProtectedPage(<AdminValidationPage />);
  }

  if (path === "/admin/import") {
    return renderProtectedPage(<AdminImportPage />);
  }

  if (path.startsWith("/admin")) {
    return renderProtectedPage(
      <PageContainer
        eyebrow="أدوات الإدارة"
        title="صفحة إدارية"
        description="هذا مسار إداري محفوظ. لوحة التحقق والاستيراد متاحتان من الروابط الإدارية."
      >
        <div className="action-row">
          <button type="button" onClick={() => navigateTo("/admin/validation")}>
            لوحة التحقق
          </button>
          <button type="button" onClick={() => navigateTo("/admin/import")}>
            الاستيراد
          </button>
        </div>
      </PageContainer>
    );
  }

  return <NotFoundPage />;
}
