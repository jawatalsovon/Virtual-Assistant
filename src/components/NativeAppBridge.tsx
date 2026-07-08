"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShortcuts } from "@capawesome/capacitor-app-shortcuts";
import { Capacitor } from "@capacitor/core";

export default function NativeAppBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupShortcuts = async () => {
      try {
        await AppShortcuts.set({
          shortcuts: [
            {
              id: "quick_talk",
              title: "Quick Talk",
              description: "Talk to Nova immediately",
              icon: "ic_menu_mic", // standard android icon, or just leave it
            },
          ]
        });

        AppShortcuts.addListener("shortcutItem", (shortcut) => {
          if (shortcut.id === "quick_talk") {
            router.push("/widget?auto_record=true");
          }
        });
      } catch (err) {
        console.error("Failed to setup app shortcuts", err);
      }
    };

    setupShortcuts();

    return () => {
      if (Capacitor.isNativePlatform()) {
        AppShortcuts.removeAllListeners();
      }
    };
  }, [router]);

  return null;
}
