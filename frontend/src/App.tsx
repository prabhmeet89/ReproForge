import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { BugReportsPage } from "./pages/BugReportsPage";
import { CreateBugReportPage } from "./pages/CreateBugReportPage";
import { BugReportDetailPage } from "./pages/BugReportDetailPage";
import { InvestigationPage } from "./pages/InvestigationPage";
import { TestRunsPage } from "./pages/TestRunsPage";
import { TestRunDetailPage } from "./pages/TestRunDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/ProtectedRoute";
import { AuthLayout } from "./components/auth/AuthLayout";

function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication — a logged-in user is bounced back to the console. */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
      </Route>

      {/* Developer Console Layout — every route here needs a session. */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<CreateProjectPage />} />
        <Route path="bug-reports" element={<BugReportsPage />} />
        <Route path="bug-reports/new" element={<CreateBugReportPage />} />
        <Route path="bug-reports/:id" element={<BugReportDetailPage />} />
        <Route path="bug-reports/:id/investigation" element={<InvestigationPage />} />
        <Route path="test-runs" element={<TestRunsPage />} />
        <Route path="test-runs/:id" element={<TestRunDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Global 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
