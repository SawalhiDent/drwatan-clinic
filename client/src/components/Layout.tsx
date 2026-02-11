import { Link, useLocation } from "wouter";
import { Home, Calendar, Users, LayoutDashboard, UserCircle2, BarChart3 } from "lucide-react";
import logo from "@assets/pp_1770153797959.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/booking", label: "حجز موعد", icon: Calendar },
    { href: "/patients", label: "المرضى", icon: Users },
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/reports", label: "التقارير", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-cairo">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl h-screen sticky top-0">
        <div className="p-6 flex flex-col items-center border-b border-slate-800">
          <img src={logo} alt="Clinic Logo" className="w-20 h-20 rounded-full mb-3 bg-white p-1" />
          <h1 className="text-xl font-bold font-tajawal text-center">عيادة الأسنان</h1>
          <p className="text-xs text-slate-400 mt-1">نظام الإدارة المتكامل</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div 
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
                  ${location === item.href 
                    ? "bg-primary text-white shadow-lg shadow-primary/25 translate-x-1" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <UserCircle2 className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">المسؤول</span>
              <span className="text-xs">تسجيل خروج</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="w-10 h-10 rounded-full bg-white p-0.5" />
          <h1 className="font-bold font-tajawal">عيادة الأسنان</h1>
        </div>
        <nav className="flex gap-4">
           {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`p-2 rounded-full ${location === item.href ? "bg-primary text-white" : "text-slate-300"}`}>
                <item.icon className="w-6 h-6" />
              </div>
            </Link>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
