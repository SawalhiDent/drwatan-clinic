
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
