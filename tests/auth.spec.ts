import { test, expect } from "@playwright/test";

test.describe("Authentication flows", () => {
  test("accessing /dashboard without login redirects to login page", async ({ page }) => {
    await page.goto("/dashboard");
    // ProtectedRoute sem requiredRole redireciona para /paciente.
    // Aceita também /auth (compat) e qualquer rota de login.
    await page.waitForURL(/\/(auth|paciente|medico|admin)/);
    expect(page.url()).toMatch(/\/(auth|paciente|medico|admin)/);
  });

  test("auth page (/auth) renderiza cards de seleção de perfil", async ({ page }) => {
    await page.goto("/auth");
    // Pós-redesign: cards "Sou paciente" e "Sou médico" são o estado inicial
    await expect(page.getByText("Sou paciente")).toBeVisible();
    await expect(page.getByText("Sou médico")).toBeVisible();
  });

  test("login rápido revela email e senha após clicar em 'fazer login rápido'", async ({ page }) => {
    await page.goto("/auth");

    // Login fica oculto por padrão; clica para revelar
    await page.getByText(/fazer login rápido/i).click();

    // Agora os campos devem estar visíveis
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login com credenciais inválidas mostra erro", async ({ page }) => {
    await page.goto("/auth");
    await page.getByText(/fazer login rápido/i).click();
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.locator('button[type="submit"]').click();
    // Espera o toast de erro aparecer (sonner)
    await page.waitForSelector(
      '[data-sonner-toast], [role="alert"], [class*="destructive"]',
      { timeout: 10000 }
    );
  });

  test("404 aparece para rotas desconhecidas", async ({ page }) => {
    await page.goto("/some-nonexistent-route-xyz");
    await expect(page.locator("body")).toContainText(/404|não encontrada|not found/i);
  });
});
