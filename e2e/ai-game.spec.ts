import { expect, test } from "@playwright/test";

test("um visitante inicia uma partida contra a IA sem cadastro", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Jogar agora" }).click();
  await page.getByRole("link", { name: "Jogar contra IA" }).click();
  await page.getByRole("radio", { name: /Fácil/ }).check();
  await page.getByRole("button", { name: "Começar partida" }).click();
  await expect(page.getByRole("grid", { name: "Tabuleiro de Gomoku" })).toBeVisible();
  const center = page.getByRole("button", { name: "Jogar na linha 8, coluna 8" });
  await center.click();
  await expect(page.getByRole("button", { name: "Linha 8, coluna 8, ocupada por preto" })).toBeVisible();
});
