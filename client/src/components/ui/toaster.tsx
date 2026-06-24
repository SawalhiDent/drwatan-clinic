import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"

function ToastIcon({ variant }: { variant?: string }) {
  if (variant === "destructive") {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 shrink-0">
        <XCircle className="w-5 h-5 text-red-600" />
      </div>
    );
  }
  if (variant === "success") {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 shrink-0">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      </div>
    );
  }
  if (variant === "warning") {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 shrink-0">
        <AlertCircle className="w-5 h-5 text-amber-600" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 shrink-0">
      <Info className="w-5 h-5 text-blue-600" />
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={4000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = (props as any).variant;
        return (
          <Toast key={id} {...props}>
            <ToastIcon variant={variant} />
            <div className="grid gap-0.5 flex-1 min-w-0">
              {title && <ToastTitle className="text-[15px] font-bold leading-snug">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-sm opacity-85 leading-snug">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
