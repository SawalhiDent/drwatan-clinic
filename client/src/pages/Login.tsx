import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import logo from "@assets/pp_1770153797959.png";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-cairo" dir="rtl">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Logo" className="w-24 h-24 rounded-full bg-white p-1 shadow-lg" />
          </div>
          <CardTitle className="text-2xl font-tajawal text-slate-800">صوالحي دنت</CardTitle>
          <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-700 border border-sky-200">الفرع الثاني</span>
          <p className="text-sm text-slate-500 mt-1">تسجيل الدخول إلى النظام</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sky-700 font-bold text-sm">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoFocus
                className="bg-sky-50/60 border-sky-200 placeholder:text-sky-300 focus:border-sky-400 focus:ring-sky-400/20"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sky-700 font-bold text-sm">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="bg-sky-50/60 border-sky-200 placeholder:text-sky-300 focus:border-sky-400 focus:ring-sky-400/20"
                data-testid="input-password"
              />
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100" data-testid="text-login-error">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
              {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Lock className="w-4 h-4 ml-2" />}
              تسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
