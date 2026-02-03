import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md mx-4 shadow-xl border-0">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 text-red-500 items-center justify-center">
            <AlertCircle className="h-12 w-12" />
          </div>

          <h1 className="text-3xl font-bold font-tajawal text-center text-slate-900 mb-2">404</h1>
          <p className="text-center text-slate-500 mb-6 font-cairo">
            عذراً، الصفحة التي تبحث عنها غير موجودة.
          </p>

          <div className="flex justify-center">
            <Link href="/">
              <a className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                العودة للرئيسية
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
