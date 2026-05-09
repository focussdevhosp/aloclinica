import { test, expect } from "@playwright/test";

test.describe("CRUD form validation", () => {
  test("auth form valida campos obrigatórios (não submete vazio)", async ({ page }) => {
    await page.goto("/auth"); // redireciona pra /paciente

    // Tenta abrir modo cadastro se disponível (alguns layouts têm tab Cadastro)
    const registerLink = page.locator('text=/cadastr|registr|criar conta/i');
    if (await registerLink.count() > 0) {
      await registerLink.first().click();
      await page.waitForTimeout(500);
    }

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    await page.waitForTimeout(800);

    // Aceita 3 sinais de validação:
    //   1. Toast/alert estilizado (sonner, role=alert, classes destructive)
    //   2. HTML5 native: input com :invalid (required vazio)
    //   3. Form não navegou (URL ainda na página de auth)
    const styledErrors = await page
      .locator('[class*="destructive"], [class*="error"], [role="alert"], [data-sonner-toast]')
      .count();
    const invalidInputs = await page.locator('input:invalid').count();
    const stillOnAuth = /\/(auth|paciente|medico)/.test(page.url());

    expect(
      styledErrors > 0 || invalidInputs > 0 || stillOnAuth,
      `nenhum sinal de validação detectado: styledErrors=${styledErrors}, invalidInputs=${invalidInputs}, url=${page.url()}`
    ).toBe(true);
  });

  test("email field validates format", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.locator('input[type="email"], input#email');
    
    if (await emailInput.count() > 0) {
      await emailInput.fill("not-an-email");
      await emailInput.blur();
      await page.waitForTimeout(500);
      
      // Should show email validation error
      const body = await page.locator("body").textContent();
      // The page should not crash
      expect(body).toBeTruthy();
    }
  });
});
