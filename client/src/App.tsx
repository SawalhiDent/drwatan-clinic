import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";

const Booking = lazy(() => import("@/pages/Booking"));
const Patients = lazy(() => import("@/pages/Patients"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Reports = lazy(() => import("@/pages/Reports"));
const UsersPage = lazy(() => import("@/pages/Users"));
const WhatsAppTemplatesPage = lazy(() => import("@/pages/WhatsAppTemplates"));
const ExpensesPage = lazy(() => import("@/pages/Expenses"));
const DailySchedulePage = lazy(() => import("@/pages/DailySchedule"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-[#0e8bab]" />
    </div>
  );
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
