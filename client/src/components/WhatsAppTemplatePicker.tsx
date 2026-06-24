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
          variant="ghost"
          size={size}
          className="text-green-600"
          data-testid="button-whatsapp-menu"
        >
          <MessageSquare className="w-4 h-4" />
          {showLabel && <span className="mr-1">واتساب</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          قوالب رسائل واتساب
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates && templates.length > 0 ? (
          templates.map((template) => {
            const Icon = ICON_MAP[template.iconName] || MessageCircle;
            const disabled = !!template.needsAppointment && !hasAppointmentContext;
            return (
              <DropdownMenuItem
                key={template.id}
                onClick={() => !disabled && handleSelect(template)}
                className={`cursor-pointer gap-2 ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                disabled={disabled}
                data-testid={`whatsapp-template-${template.templateKey}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{template.label}</span>
              </DropdownMenuItem>
            );
          })
        ) : (
          <DropdownMenuItem disabled className="text-muted-foreground text-center">
            لا توجد قوالب
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
