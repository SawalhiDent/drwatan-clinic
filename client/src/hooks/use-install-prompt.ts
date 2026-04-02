import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallPrompt(null);
        setIsInstalled(true);
      }
    } else {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        alert(
          'لتثبيت التطبيق على iPhone:\n1. اضغط على زر "مشاركة" ↑\n2. اختر "إضافة إلى الشاشة الرئيسية"\n3. اضغط "إضافة"'
        );
      } else {
        alert(
          'لتثبيت التطبيق:\n1. افتح قائمة المتصفح ⋮\n2. اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"'
        );
      }
    }
  };

  return { install, installPrompt, isInstalled };
}
