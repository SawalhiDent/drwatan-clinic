import { Link, useLocation } from "wouter";
import { Calendar, Users, ClipboardList, Receipt, BarChart3, LogOut, Settings, MessageSquare, UserCircle2, ChevronDown, Menu, X, Stethoscope, Download, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import logo from "@assets/pp_1770153797959.png";
import type { Permission } from "@shared/schema";
import { useState, useEffect } from "react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  doctor: "طبيب",
  assistant: "مساعد",
};

type NavItem = { href: string; label: string; icon: any; permission?: Permission };

const mainNavItems: NavItem[] = [
  { href: "/booking", label: "حجز موعد", icon: Calendar, permission: "appointments" },
  { href: "/daily-schedule", label: "الجدول اليومي", icon: ClipboardList, permission: "appointments" },
  { href: "/patients", label: "ملفات المرضى", icon: Users, permission: "patients_view" },
];

const controlPanelItems: NavItem[] = [
  { href: "/users", label: "المستخدمين", icon: Settings, permission: "user_management" },
  { href: "/expenses", label: "المصروفات", icon: Receipt, permission: "payments" },
  { href: "/whatsapp-templates", label: "قوالب واتساب", icon: MessageSquare, permission: "appointments" },
  { href: "/reports", label: "التقارير", icon: BarChart3, permission: "reports" },
  { href: "/doctor-report", label: "جرد الأطباء والمساعدين", icon: Stethoscope, permission: "reports" },
];

function NavLink({ item, location }: { item: NavItem; location: string }) {
  return (
    <Link href={item.href}>
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
          ${location === item.href
            ? "bg-primary text-white shadow-lg shadow-primary/25 translate-x-1"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }
        `}
        data-testid={`link-nav-${item.href.replace("/", "") || "home"}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { install, isInstalled } = useInstallPrompt();
  const [controlPanelOpen, setControlPanelOpen] = useState(() => {
    return controlPanelItems.some((item) => location === item.href);
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const visibleMainItems = mainNavItems.filter((item) => !item.permission || hasPermission(item.permission));
  const visibleControlItems = controlPanelItems.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-cairo">
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl h-screen sticky top-0">
        <div className="p-6 flex flex-col items-center border-b border-slate-800">
          <img src={logo} alt="Clinic Logo" className="w-20 h-20 rounded-full mb-3 bg-white p-1" />
          <h1 className="text-xl font-bold font-tajawal text-center">صوالحي دنت</h1>
          <p className="text-xs text-slate-400 mt-1">إدارة المرضى والمواعيد</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleMainItems.map((item) => (
            <NavLink key={item.href} item={item} location={location} />
          ))}

          {visibleControlItems.length > 0 && (
            <div className="pt-4">
              <button
                onClick={() => setControlPanelOpen(!controlPanelOpen)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
                data-testid="button-control-panel-toggle"
              >
                <span className="font-medium text-sm">لوحة التحكم</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${controlPanelOpen ? "rotate-180" : ""}`} />
              </button>
              <div className={`space-y-1 overflow-hidden transition-all duration-300 ${controlPanelOpen ? "max-h-96 mt-1 pr-2" : "max-h-0"}`}>
                {visibleControlItems.map((item) => (
                  <NavLink key={item.href} item={item} location={location} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {!isInstalled && (
          <div className="px-4 pb-2">
            <button
              onClick={install}
              data-testid="button-install-sidebar"
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all duration-200 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              تحميل التطبيق
            </button>
          </div>
        )}
        {isInstalled && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 px-4 py-2 text-emerald-400 text-xs">
              <CheckCircle className="w-3.5 h-3.5" />
              التطبيق مثبّت
            </div>
          </div>
        )}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <UserCircle2 className="w-8 h-8" />
            <div className="flex flex-col flex-1">
              <span className="text-sm font-bold text-white">{user?.displayName || "المستخدم"}</span>
              <span className="text-xs">{ROLE_LABELS[user?.role || ""] || user?.role}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="md:hidden bg-slate-900 text-white p-3 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="w-9 h-9 rounded-full bg-white p-0.5" />
          <h1 className="font-bold font-tajawal text-sm">صوالحي دنت</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-300 hover:text-white transition-colors"
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="bg-slate-900 text-white w-64 h-full p-4 space-y-1 overflow-y-auto shadow-xl animate-in slide-in-from-right-full duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {visibleMainItems.map((item) => (
              <NavLink key={item.href} item={item} location={location} />
            ))}

            {visibleControlItems.length > 0 && (
              <div className="pt-4 border-t border-slate-800 mt-4">
                <p className="px-4 py-2 text-xs text-slate-500 font-medium">لوحة التحكم</p>
                {visibleControlItems.map((item) => (
                  <NavLink key={item.href} item={item} location={location} />
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 mt-4">
              {!isInstalled && (
                <button
                  onClick={install}
                  data-testid="button-install-mobile"
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-primary/20 text-primary mb-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span className="font-medium">تحميل التطبيق</span>
                </button>
              )}
              {isInstalled && (
                <div className="flex items-center gap-3 px-4 py-2 text-emerald-400 text-sm mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>التطبيق مثبّت</span>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
                <UserCircle2 className="w-6 h-6" />
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-bold text-white">{user?.displayName}</span>
                  <span className="text-xs">{ROLE_LABELS[user?.role || ""] || user?.role}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-slate-800 transition-colors"
                data-testid="button-logout-mobile"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">تسجيل الخروج</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 p-3 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
