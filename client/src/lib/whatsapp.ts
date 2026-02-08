
export const WHATSAPP_TEMPLATES = [
  {
    id: "reminder",
    label: "تذكير بموعد",
    message: (name: string, date: string, time: string) => 
      `مرحباً سيد/ة ${name}، نذكرك بموعدك في عيادة الأسنان يوم ${date} الساعة ${time}. نتمنى لك دوام الصحة.`,
  },
  {
    id: "extraction",
    label: "تعليمات بعد الخلع",
    message: (name: string) => 
      `مرحباً ${name}، تعليمات بعد خلع السن: 1- العض على الشاش لمدة ساعة. 2- تجنب المشروبات الساخنة. 3- عدم المضمضة بقوة اليوم. نتمنى لك الشفاء العاجل.`,
  },
  {
    id: "implant",
    label: "تعليمات بعد الزراعة",
    message: (name: string) => 
      `مرحباً ${name}، تعليمات بعد زراعة الأسنان: 1- وضع كمادات باردة. 2- الالتزام بالأدوية الموصوفة. 3- تناول أطعمة لينة. نتمنى لك الشفاء العاجل.`,
  },
  {
    id: "general",
    label: "رسالة عامة",
    message: (name: string) => 
      `مرحباً ${name}، معك عيادة الأسنان، كيف يمكننا مساعدتك اليوم؟`,
  },
];

export function sendWhatsAppMessage(phone: string, message: string) {
  // Clean phone number: remove non-digits
  let cleanPhone = phone.replace(/\D/g, "");
  
  // If it starts with 05 or 0, assume local format and default to +972 (Israel/Palestine prefix)
  // as per the common usage in the region for both 05- prefix numbers
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "972" + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith("972") && !cleanPhone.startsWith("970")) {
    // If no prefix, default to 972
    cleanPhone = "972" + cleanPhone;
  }
  
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
