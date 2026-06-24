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
        className="w-60 border-0 shadow-2xl rounded-xl p-1"
        style={{ background: "rgba(15,23,42,0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(100,116,139,0.4)" }}
      >
        <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5 flex items-center gap-1.5" style={{ color: "#34d399" }}>
          <MessageSquare className="w-3.5 h-3.5" />
          قوالب واتساب
        </DropdownMenuLabel>
        <DropdownMenuSeparator style={{ background: "rgba(100,116,139,0.35)", margin: "4px 0" }} />
        {templates && templates.length > 0 ? (
          templates.map((template) => {
            const Icon = ICON_MAP[template.iconName] || MessageCircle;
            const disabled = !!template.needsAppointment && !hasAppointmentContext;
            return (
              <DropdownMenuItem
                key={template.id}
                onClick={() => !disabled && handleSelect(template)}
                className={`cursor-pointer gap-2 rounded-lg px-2 py-2 text-sm font-medium ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                style={{ color: "#f1f5f9" }}
                disabled={disabled}
                data-testid={`whatsapp-template-${template.templateKey}`}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: "#34d399" }} />
                <span>{template.label}</span>
              </DropdownMenuItem>
            );
          })
        ) : (
          <DropdownMenuItem disabled className="text-center text-sm" style={{ color: "#64748b" }}>
            لا توجد قوالب
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
