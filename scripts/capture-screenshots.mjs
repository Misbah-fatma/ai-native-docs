import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = process.env.SCREENSHOT_DIR || path.join(ROOT, "docs", "screenshots");
const BASE = process.env.APP_URL || "http://localhost:5173";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome 2.app/Contents/MacOS/Google Chrome";

async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: true,
  });
  console.log("wrote", name);
}

async function signInAs(page, name) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Ink" }).waitFor();
  await page.getByRole("button", { name }).click();
  await page.getByRole("heading", { name: "Your documents" }).waitFor();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--disable-gpu", "--hide-scrollbars"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Ink" }).waitFor();
  await shot(page, "01-sign-in.png");

  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByRole("heading", { name: "Create an account" }).waitFor();
  await shot(page, "02-create-account.png");

  await page.getByRole("button", { name: "Alex Rivera" }).click();
  await page.getByRole("heading", { name: "Your documents" }).waitFor();
  await shot(page, "03-dashboard.png");

  await page.getByRole("link", { name: /Q3 working notes/ }).click();
  await page.getByRole("heading", { name: "Q3 working notes" }).first().waitFor();
  await page.getByText("Saved").first().waitFor({ timeout: 8000 }).catch(() => {});

  const jordan = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await signInAs(jordan, "Jordan Chen");
  await jordan.getByRole("link", { name: /Q3 working notes/ }).click();
  await jordan.getByRole("heading", { name: "Q3 working notes" }).first().waitFor();
  await page.getByText(/Jordan Chen is viewing/).waitFor({ timeout: 12000 });
  await shot(page, "04-editor.png");
  await jordan.close();

  await page.getByRole("button", { name: "Rename document" }).click();
  await page.getByRole("heading", { name: "Rename document" }).waitFor();
  await shot(page, "05-rename.png");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("heading", { name: "Share" }).waitFor();
  await shot(page, "06-share.png");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: /Comments/ }).click();
  await page.getByRole("heading", { name: "Comments" }).waitFor();
  await shot(page, "07-comments.png");

  await page.getByRole("button", { name: /Suggest/ }).click();
  await page.getByRole("heading", { name: "Suggestions" }).waitFor();
  await shot(page, "08-suggestions.png");

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("heading", { name: "Version history" }).waitFor();
  await shot(page, "09-history.png");

  await page.getByRole("button", { name: "Files" }).click();
  await page.getByRole("heading", { name: "Files" }).waitFor();
  await shot(page, "10-files.png");

  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: "Markdown (.md)" }).waitFor();
  await shot(page, "11-export.png");

  await page.getByRole("link", { name: "All documents" }).click();
  await page.getByRole("heading", { name: "Your documents" }).waitFor();
  await page.getByRole("button", { name: "Delete" }).first().click();
  await page.getByRole("heading", { name: "Delete document" }).waitFor();
  await shot(page, "12-delete-confirm.png");
  await page.getByRole("button", { name: "Cancel" }).click();

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
