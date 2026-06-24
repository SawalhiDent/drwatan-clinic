import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Clock, Receipt, Syringe, Wrench, Sparkles, Brush, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { renderTemplate, sendWhatsAppMessage, type WhatsAppTemplateContext } from "@/lib/whatsapp";
import { api } from "@shared/routes";
import type { WhatsappTemplate } from "@shared/schema";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  Receipt,
  Syringe,
  Wrench,
  Sparkles,
  Brush,
  MessageCircle,
  MessageSquare,
};

interface WhatsAppTemplatePickerProps {
  phone: string;
  context: WhatsAppTemplateContext;
  size?: "icon" | "sm" | "default";
  showLabel?: boolean;
}

export function WhatsAppTemplatePicker({
  phone,
  context,
  size = "icon",
  showLabel = false,
}: WhatsAppTemplatePickerProps) {
  const { data: templates } = useQuery<WhatsappTemplate[]>({
    queryKey: [api.whatsappTemplates.list.path],
    throwOnError: false,
  });

  const handleSelect = (template: WhatsappTemplate) => {
    try {
      const message = renderTemplate(template.messageBody || "", context);
      sendWhatsAppMessage(phone, message);
    } catch {
    }
  };

  const hasAppointmentContext = !!(context.date && context.time);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size}
          className="text-green-600"
          data-testid="button-whatsapp-menu"
        >
          <MessageSquare className="w-4 h-4" />
          {showLabel && <span className="mr-1">واتساب</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 bg-slate-900/96 backdrop-blur-md border border-slate-700/70 shadow-2xl rounded-xl p-1"
      >
        <DropdownMenuLabel className="text-xs text-emerald-400/80 font-semibold px-2 py-1.5 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          قوالب واتساب
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700/60 my-1" />
        {templates && templates.length > 0 ? (
          templates.map((template) => {
            const Icon = ICON_MAP[template.iconName] || MessageCircle;
            const disabled = !!template.needsAppointment && !hasAppointmentContext;
            return (
              <DropdownMenuItem
                key={template.id}
                onClick={() => !disabled && handleSelect(template)}
                className={`cursor-pointer gap-2 text-slate-200 hover:text-white hover:bg-emerald-600/25 focus:bg-emerald-600/25 focus:text-white rounded-lg px-2 py-2 text-sm ${disabled ? "opacity-35 cursor-not-allowed" : ""}`}
                disabled={disabled}
                data-testid={`whatsapp-template-${template.templateKey}`}
              >
                <Icon className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{template.label}</span>
              </DropdownMenuItem>
            );
          })
        ) : (
          <DropdownMenuItem disabled className="text-slate-500 text-center text-sm">
            لا توجد قوالب
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
