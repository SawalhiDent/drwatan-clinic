import { lazy, Suspense, Component, type ReactNode } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import { Loader2, RefreshCw } from "lucide-react";

function lazyRetry(factory: () => Promise<any>) {
  return lazy(() =>
    factory().catch(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(factory());
        }, 1500);
      });
    })
  );
}

const Booking = lazyRetry(() => import("@/pages/Booking"));
const Patients = lazyRetry(() => import("@/pages/Patients"));
const Dashboard = lazyRetry(() => import("@/pages/Dashboard"));
const Reports = lazyRetry(() => import("@/pages/Reports"));
const UsersPage = lazyRetry(() => import("@/pages/Users"));
const WhatsAppTemplatesPage = lazyRetry(() => import("@/pages/WhatsAppTemplates"));
const ExpensesPage = lazyRetry(() => import("@/pages/Expenses"));
const DailySchedulePage = lazyRetry(() => import("@/pages/DailySchedule"));
const NotFound = lazyRetry(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-[#0e8bab]" />
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
          <div className="text-center space-y-4 p-8">
            <p className="text-slate-600 text-lg font-tajawal">حدث خطأ في تحميل الصفحة</p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#0e8bab] text-white rounded-lg hover:bg-[#0c7a96] transition-colors"
              data-testid="button-retry"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRouter() {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/">
            <Redirect to="/booking" />
          </Route>
          {hasPermission("appointments") && <Route path="/booking" component={Booking} />}
          {hasPermission("patients_view") && <Route path="/patients" component={Patients} />}
          {hasPermission("appointments") && <Route path="/dashboard" component={Dashboard} />}
          {hasPermission("appointments") && <Route path="/daily-schedule" component={DailySchedulePage} />}
          {hasPermission("payments") && <Route path="/expenses" component={ExpensesPage} />}
          {hasPermission("reports") && <Route path="/reports" component={Reports} />}
          {hasPermission("user_management") && <Route path="/users" component={UsersPage} />}
          {hasPermission("appointments") && <Route path="/whatsapp-templates" component={WhatsAppTemplatesPage} />}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div dir="rtl">
            <ProtectedRouter />
            <Toaster />
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
