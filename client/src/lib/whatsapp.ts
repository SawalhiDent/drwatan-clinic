
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
  if (!messageBody) return "";
  try {
    let msg = String(messageBody);
    msg = msg.replace(/\{name\}/g, ctx.name || "");
    msg = msg.replace(/\{date\}/g, ctx.date || "");
    msg = msg.replace(/\{time\}/g, ctx.time || "");
    msg = msg.replace(/\{service\}/g, ctx.service || "");
    msg = msg.replace(/\{total_paid\}/g, String(ctx.totalPaid ?? 0));
    msg = msg.replace(/\{currency\}/g, ctx.currency ?? "₪");

    if (ctx.payments && ctx.payments.length > 0) {
      const methodLabel = (m: string) =>
        m === "check" ? "شيك" : m === "visa" ? "فيزا" : m === "bpay" ? "بييت" : "نقد";
      const list = ctx.payments
        .map((p, i) => `${i + 1}. ${p.date} - ${p.amount} ${p.currency} (${methodLabel(p.method)})`)
        .join("\n");
      msg = msg.replace(/\{payments_list\}/g, list);
    } else {
      msg = msg.replace(/\{payments_list\}/g, "لا توجد مدفوعات مسجلة");
    }

    return msg;
  } catch {
    return messageBody || "";
  }
}

export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return "";
  try {
    let cleanPhone = String(phone).replace(/[\s\-\(\)]/g, "");

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
  } catch {
    return "";
  }
}

export function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    if (!cleanPhone) return;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = url;
    }
  } catch {
  }
}
