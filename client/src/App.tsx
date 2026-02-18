import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Home from "@/pages/Home";
import Booking from "@/pages/Booking";
import Patients from "@/pages/Patients";
import Dashboard from "@/pages/Dashboard";
import Reports from "@/pages/Reports";
import UsersPage from "@/pages/Users";
import WhatsAppTemplatesPage from "@/pages/WhatsAppTemplates";
import ExpensesPage from "@/pages/Expenses";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function ProtectedRouter() {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      {hasPermission("appointments") && <Route path="/booking" component={Booking} />}
      {hasPermission("patients_view") && <Route path="/patients" component={Patients} />}
      {hasPermission("appointments") && <Route path="/dashboard" component={Dashboard} />}
      {hasPermission("payments") && <Route path="/expenses" component={ExpensesPage} />}
      {hasPermission("reports") && <Route path="/reports" component={Reports} />}
      {hasPermission("user_management") && <Route path="/users" component={UsersPage} />}
      {hasPermission("appointments") && <Route path="/whatsapp-templates" component={WhatsAppTemplatesPage} />}
      <Route component={NotFound} />
    </Switch>
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
