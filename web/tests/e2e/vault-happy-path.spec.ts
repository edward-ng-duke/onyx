import { expect, test } from "@playwright/test";
import path from "node:path";

test("vault happy path: create -> upload -> indexed -> chat -> delete", async ({
  page,
}) => {
  // Login
  await page.goto("http://localhost:3000/auth/login");
  await page.fill('[name="email"]', "a@example.com");
  await page.fill('[name="password"]', "a");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app/);

  // Open Vaults
  await page.click("text=Knowledge Vaults");
  await expect(page).toHaveURL(/\/app\/vaults/);

  // Create vault
  await page.click("text=New Vault");
  const vaultName = `E2E ${Date.now()}`;
  await page.fill('input[placeholder="Vault name"]', vaultName);
  await page.click('button:has-text("Create")');
  await expect(page.locator(`text=${vaultName}`)).toBeVisible();

  // Enter vault -> docs tab
  await page.click(`text=${vaultName}`);
  await page.click("text=Documents");

  // Upload sample. VaultDocumentsView creates the file <input> dynamically on
  // click (see web/src/sections/vault/VaultDocumentsView.tsx) - so we listen
  // for the "filechooser" event the browser fires when the synthetic input is
  // clicked, rather than trying to query a static <input type="file"> in the
  // DOM (it never exists outside that click handler).
  const sample = path.join(__dirname, "fixtures/test.pdf");
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    // Click the dropzone area - it fires the click handler that creates+clicks
    // the hidden file input.
    page.locator('text=/drop|upload|drag/i').first().click(),
  ]);
  await fileChooser.setFiles(sample);

  // Wait for indexed status (poll up to 5 min)
  await expect(page.locator("text=Indexed")).toBeVisible({
    timeout: 300_000,
  });

  // Switch to chat tab and ask a question
  await page.click("text=Chat");
  await page.fill("textarea", "What is in this document?");
  await page.click('button[type="submit"]');

  // Wait for assistant message + at least one citation
  await expect(page.locator("text=Sources").first()).toBeVisible({
    timeout: 60_000,
  });

  // Delete vault
  await page.click("text=Delete");
  await page.click('button:has-text("Delete forever")');
  await expect(page).toHaveURL(/\/app\/vaults$/);
});
