
export interface WhatsAppTemplateContext {
  name: string;
  date?: string;
  time?: string;
  service?: string;
  totalPaid?: number;
  currency?: string;
  payments?: { amount: number; date: string; method: string; currency: string }[];
}

export const WHATSAPP_TEMPLATES = [
  {
    id: "reminder",
    label: "تذكير بموعد",
    iconName: "Clock" as const,
    needsAppointment: true,
    message: (ctx: WhatsAppTemplateContext) => {
      let msg = `السلام عليكم ${ctx.name}،\n`;
      msg += `نذكرك بموعدك في عيادة *صوالحي دنت*\n`;
      if (ctx.date) msg += `التاريخ: ${ctx.date}\n`;
      if (ctx.time) msg += `الساعة: ${ctx.time}\n`;
      if (ctx.service) msg += `الخدمة: ${ctx.service}\n`;
      msg += `\nنرجو الحضور في الموعد المحدد.\nنتمنى لك دوام الصحة والعافية.`;
      return msg;
    },
  },
  {
    id: "invoice",
    label: "إرسال فاتورة",
    iconName: "Receipt" as const,
    needsAppointment: false,
    message: (ctx: WhatsAppTemplateContext) => {
      let msg = `السلام عليكم ${ctx.name}،\n`;
      msg += `فاتورة من عيادة *صوالحي دنت*\n`;
      msg += `━━━━━━━━━━━━━━━\n`;
      if (ctx.payments && ctx.payments.length > 0) {
        ctx.payments.forEach((p, i) => {
          msg += `${i + 1}. ${p.date} - ${p.amount} ${p.currency} (${p.method === "cash" ? "نقد" : "شيك"})\n`;
        });
        msg += `━━━━━━━━━━━━━━━\n`;
      }
      const total = ctx.totalPaid ?? 0;
      const cur = ctx.currency ?? "₪";
      msg += `المبلغ الإجمالي المدفوع: *${total} ${cur}*\n`;
      msg += `\nشكراً لثقتكم بعيادة صوالحي دنت.`;
      return msg;
    },
  },
  {
    id: "extraction",
    label: "تعليمات بعد الخلع",
    iconName: "Syringe" as const,
    needsAppointment: false,
    message: (ctx: WhatsAppTemplateContext) =>
      `السلام عليكم ${ctx.name}،\n` +
      `تعليمات مهمة بعد *خلع السن* من عيادة صوالحي دنت:\n\n` +
      `1- العض على الشاش لمدة *ساعة كاملة* وعدم إزالته.\n` +
      `2- *تجنب* المشروبات والأطعمة الساخنة لمدة 24 ساعة.\n` +
      `3- *عدم المضمضة* بقوة في نفس اليوم.\n` +
      `4- *عدم استخدام* القشة (الشلمون) للشرب.\n` +
      `5- تجنب التدخين لمدة *48 ساعة* على الأقل.\n` +
      `6- وضع *كمادات باردة* على الخد من الخارج (20 دقيقة تشغيل / 20 دقيقة إيقاف).\n` +
      `7- تناول الأدوية الموصوفة *بانتظام*.\n` +
      `8- تناول أطعمة *لينة وباردة* في اليوم الأول.\n` +
      `9- النوم مع *رفع الرأس* قليلاً.\n\n` +
      `في حال استمرار النزيف أو حدوث ألم شديد، تواصل معنا فوراً.\n` +
      `نتمنى لك الشفاء العاجل.`,
  },
  {
    id: "implant",
    label: "تعليمات بعد الزراعة",
    iconName: "Wrench" as const,
    needsAppointment: false,
    message: (ctx: WhatsAppTemplateContext) =>
      `السلام عليكم ${ctx.name}،\n` +
      `تعليمات مهمة بعد *زراعة الأسنان* من عيادة صوالحي دنت:\n\n` +
      `1- وضع *كمادات باردة* على الخد (20 دقيقة تشغيل / 20 دقيقة إيقاف) خلال أول 48 ساعة.\n` +
      `2- الالتزام بالأدوية الموصوفة (*المضاد الحيوي + مسكن الألم*).\n` +
      `3- تناول أطعمة *لينة فقط* لمدة أسبوع.\n` +
      `4- *تجنب المضغ* على منطقة الزراعة.\n` +
      `5- تنظيف الأسنان *بلطف شديد* وتجنب منطقة الزراعة.\n` +
      `6- *تجنب التدخين* تماماً لمدة أسبوعين على الأقل.\n` +
      `7- *عدم ممارسة* الرياضة الشاقة لمدة أسبوع.\n` +
      `8- استخدام *غسول الفم* الموصوف بعد 24 ساعة من العملية.\n` +
      `9- الحضور لموعد *المتابعة* بعد أسبوع.\n\n` +
      `في حال حدوث تورم شديد أو نزيف مستمر أو ارتفاع في الحرارة، تواصل معنا فوراً.\n` +
      `نتمنى لك الشفاء العاجل.`,
  },
  {
    id: "filling",
    label: "تعليمات بعد الحشوة",
    iconName: "Sparkles" as const,
    needsAppointment: false,
    message: (ctx: WhatsAppTemplateContext) =>
      `السلام عليكم ${ctx.name}،\n` +
      `تعليمات بعد *حشوة الأسنان* من عيادة صوالحي دنت:\n\n` +
      `1- *تجنب الأكل والشرب* لمدة ساعتين بعد الحشوة.\n` +
      `2- تجنب الأطعمة *القاسية والصلبة* لمدة 24 ساعة.\n` +
      `3- إذا شعرت بأن *الإطباق مرتفع*، راجعنا لتعديله.\n` +
      `4- من الطبيعي الشعور بـ *حساسية خفيفة* لبضعة أيام.\n` +
      `5- استمر في تنظيف أسنانك *بشكل طبيعي*.\n\n` +
      `نتمنى لك دوام الصحة.`,
  },
  {
    id: "scaling",
    label: "تعليمات بعد التنظيف",
    iconName: "Brush" as const,
    needsAppointment: false,
    message: (ctx: WhatsAppTemplateContext) =>
      `السلام عليكم ${ctx.name}،\n` +
      `تعليمات بعد *تنظيف الأسنان* من عيادة صوالحي دنت:\n\n` +
      `1- تجنب الأطعمة والمشروبات *الملونة* (شاي، قهوة، كولا) لمدة 48 ساعة.\n` +
      `2- من الطبيعي حدوث *حساسية خفيفة* في اللثة لبضعة أيام.\n` +
      `3- استخدم فرشاة أسنان *ناعمة* ومعجون أسنان *للحساسية*.\n` +
      `4- استخدم *خيط الأسنان* يومياً.\n` +
      `5- يُنصح بإجراء تنظيف *كل 6 أشهر*.\n\n` +
      `نتمنى لك دوام الصحة.`,
  },
  {
    id: "general",
    label: "رسالة عامة",
    iconName: "MessageCircle" as const,
    needsAppointment: false,
    message: (ctx: WhatsAppTemplateContext) =>
      `السلام عليكم ${ctx.name}،\n` +
      `معك عيادة *صوالحي دنت*\n` +
      `كيف يمكننا مساعدتك اليوم؟\n` +
      `نتمنى لك دوام الصحة والعافية.`,
  },
];

export function sendWhatsAppMessage(phone: string, message: string) {
  let cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.startsWith("0")) {
    cleanPhone = "972" + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith("972") && !cleanPhone.startsWith("970")) {
    cleanPhone = "972" + cleanPhone;
  }

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
