
export interface WhatsAppTemplateContext {
  name: string;
  date?: string;
  time?: string;
  service?: string;
  totalPaid?: number;
  currency?: string;
  payments?: { amount: number; date: string; method: string; currency: string }[];
}

export function renderTemplate(messageBody: string, ctx: WhatsAppTemplateContext): string {
  let msg = messageBody;
  msg = msg.replace(/\{name\}/g, ctx.name || "");
  msg = msg.replace(/\{date\}/g, ctx.date || "");
  msg = msg.replace(/\{time\}/g, ctx.time || "");
  msg = msg.replace(/\{service\}/g, ctx.service || "");
  msg = msg.replace(/\{total_paid\}/g, String(ctx.totalPaid ?? 0));
  msg = msg.replace(/\{currency\}/g, ctx.currency ?? "₪");

  if (ctx.payments && ctx.payments.length > 0) {
    const list = ctx.payments
      .map((p, i) => `${i + 1}. ${p.date} - ${p.amount} ${p.currency} (${p.method === "cash" ? "نقد" : "شيك"})`)
      .join("\n");
    msg = msg.replace(/\{payments_list\}/g, list);
  } else {
    msg = msg.replace(/\{payments_list\}/g, "لا توجد مدفوعات مسجلة");
  }

  return msg;
}

export function formatPhoneForWhatsApp(phone: string): string {
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

  if (cleanPhone.startsWith("+")) {
    cleanPhone = cleanPhone.substring(1);
  }

  if (cleanPhone.startsWith("00")) {
    cleanPhone = cleanPhone.substring(2);
  }

  cleanPhone = cleanPhone.replace(/\D/g, "");

  if (cleanPhone.startsWith("972") || cleanPhone.startsWith("970")) {
    return cleanPhone;
  }

  if (cleanPhone.startsWith("0")) {
    return "972" + cleanPhone.substring(1);
  }

  if (cleanPhone.length > 0 && cleanPhone.length <= 10) {
    return "972" + cleanPhone;
  }

  return cleanPhone;
}

export function sendWhatsAppMessage(phone: string, message: string) {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
