import { Link } from "wouter";
import { Calendar, FileText, Activity } from "lucide-react";
import logo from "@assets/pp_1770153797959.png";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-10 right-10 w-96 h-96 bg-primary rounded-full blur-[100px]" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-accent rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 text-center mb-12"
      >
        <div className="w-40 h-40 bg-white rounded-full p-2 mx-auto mb-6 shadow-2xl shadow-primary/20 ring-4 ring-white/10">
          <img src={logo} alt="Clinic Logo" className="w-full h-full object-contain rounded-full" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white font-tajawal mb-4">
          صوالحي دنت
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto">
          إدارة المرضى والمواعيد
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl z-10 px-4">
        <Link href="/booking">
          <motion.div 
            whileHover={{ scale: 1.02, translateY: -5 }}
            whileTap={{ scale: 0.98 }}
            className="group cursor-pointer bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-tajawal">حجز موعد جديد</h2>
            <p className="text-slate-400">جدولة موعد لمريض جديد أو حالي في الأيام المتاحة.</p>
          </motion.div>
        </Link>

        <Link href="/patients">
          <motion.div 
            whileHover={{ scale: 1.02, translateY: -5 }}
            whileTap={{ scale: 0.98 }}
            className="group cursor-pointer bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-300"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-tajawal">ملف المريض</h2>
            <p className="text-slate-400">إدارة ملفات المرضى، السجل الطبي، والبيانات الشخصية.</p>
          </motion.div>
        </Link>
      </div>

      <div className="mt-12 z-10">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-6 py-2 rounded-full hover:bg-white/5">
            <Activity className="w-5 h-5" />
            <span>الذهاب إلى لوحة التحكم</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
