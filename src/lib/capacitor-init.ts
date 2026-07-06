/**
 * Bootstrap nativo Capacitor (iOS/Android).
 *
 * Só executa em build nativa (Capacitor.isNativePlatform()). No web (PWA/Lovable
 * preview) o import é seguro mas todas as ações viram no-op.
 *
 * Responsabilidades:
 *  - Ajusta StatusBar (cor da marca) e esconde o SplashScreen.
 *  - Registra push notifications e persiste o token FCM/APNs na tabela
 *    `push_subscriptions` do Supabase, reutilizando a estrutura existente
 *    (endpoint = "fcm:<token>" ou "apns:<token>").
 *  - Deep links: `appUrlOpen` -> router.navigate para o caminho recebido.
 *  - Hardware back button (Android): fecha app na raiz, senão history.back().
 */
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

let initialized = false;

export async function initCapacitor() {
  if (initialized) return;
  initialized = true;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  // StatusBar + SplashScreen
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#1a6fc4" });
    }
  } catch (e) { logError("[capacitor] StatusBar", e); }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) { logError("[capacitor] SplashScreen", e); }

  // Deep links (aloclinica.com.br/... e scheme aloclinica://)
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", ({ url }) => {
      try {
        const u = new URL(url);
        const path = u.pathname + u.search + u.hash;
        if (path && path !== "/") window.history.pushState({}, "", path);
        // Dispara popstate para o React Router reagir
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (e) { logError("[capacitor] deep link parse", e); }
    });

    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (e) { logError("[capacitor] App plugin", e); }

  // Push notifications (FCM Android / APNs iOS)
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (granted) {
      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return; // aguarda login para persistir
          const platform = (await import("@capacitor/core")).Capacitor.getPlatform();
          const endpoint = `${platform === "ios" ? "apns" : "fcm"}:${token.value}`;
          await supabase.from("push_subscriptions").upsert(
            { user_id: user.id, endpoint },
            { onConflict: "endpoint" },
          );
        } catch (e) { logError("[capacitor] push token save", e); }
      });

      PushNotifications.addListener("registrationError", (err) => {
        logError("[capacitor] push registration error", err);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const path = (notification.data?.url || notification.data?.path) as string | undefined;
        if (path) {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      });
    }
  } catch (e) { logError("[capacitor] PushNotifications", e); }
}