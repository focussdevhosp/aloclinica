import { test, expect } from "@playwright/test";

/**
 * E2E auth flows.
 *
 * Notas de roteamento:
 * - `/auth` redireciona para `/paciente` (definido em App.tsx).
 * - A página /paciente é `AuthPaciente.tsx` — tem email/senha visíveis por padrão
 *   e placeholder `seu@email.com`.
 * - O componente `Auth.tsx` (cards "Sou paciente" / "Sou médico" + login rápido)
 *   está prefetched mas não montado em rota direta.
 */

test.describe("Authentication flows", () => {
  test("acesso a /dashboard sem login redireciona para tela de login", async ({ page }) => {
    await page.goto("/dashboard");
    // ProtectedRoute sem requiredRole vai para /paciente
    await page.waitForURL(/\/(auth|paciente|medico|admin)/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/(auth|paciente|medico|admin)/);
  });

  test("/auth redireciona para /paciente", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForURL(/\/paciente/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/paciente/);
  });

  test("página de login do paciente exibe email e senha", async ({ page }) => {
    await page.goto("/paciente");
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("login com credenciais inválidas mostra erro", async ({ page }) => {
    await page.goto("/paciente");
    await page.locator('input[type="email"]').first().fill("invalid@test.com");
    await page.locator('input[type="password"]').first().fill("wrongpassword123");
    await page.locator('button[type="submit"]').first().click();
    // Aguarda algum sinal de erro: toast Sonner, alert role, ou algum container destrutivo
    await page.waitForSelector(
      '[data-sonner-toast], [role="alert"], [class*="destructive"]',
      { timeout: 15000 }
    );
  });

  test("404 aparece para rotas desconhecidas", async ({ page }) => {
    await page.goto("/some-nonexistent-route-xyz");
    // Espera o NotFound montar (a página tem '404' visível)
    await expect(page.locator("body")).toContainText(/404|não encontrada|not found/i, { timeout: 10000 });
  });
});
