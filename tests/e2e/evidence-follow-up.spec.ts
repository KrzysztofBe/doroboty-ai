import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function openRecord(page: Page, employer: boolean) {
  await page.goto("/#/auth/sign-in");
  await page
    .getByRole("button", {
      name: employer ? "Wejdź jako Karolina Wiśniewska" : "Wejdź jako Marek Nowak",
    })
    .click();
  await expect(page).toHaveURL(/#\/app(?:\/|$)/);
  await page.goto(`/#/app/${employer ? "kandydaci" : "aplikacje"}/application-example`);
  await page.getByRole("tab", { name: employer ? "Karta dowodów" : "Pytania i zadania" }).click();
}

test("evidence decisions, candidate replies and ratings are independent per gap", async ({
  page,
}) => {
  await openRecord(page, true);
  await page.getByRole("button", { name: "Przygotuj pytanie" }).click();
  await page.getByRole("button", { name: "Odrzuć" }).click();
  await page.getByRole("tab", { name: "Wiarygodność wyniku 25%" }).click();
  await page.getByRole("button", { name: "Przygotuj zadanie" }).click();
  await page.getByRole("button", { name: "Akceptuj", exact: true }).click();
  await page.getByRole("button", { name: "Wyślij do Marka" }).click();
  await page.getByRole("tab", { name: "Samodzielna decyzja o zakresie" }).click();
  await page.getByRole("button", { name: "Przygotuj pytanie" }).click();
  await page.getByLabel("Propozycja pytania").fill("Za którą decyzję odpowiadałeś osobiście?");
  await page.getByRole("button", { name: "Akceptuj", exact: true }).click();
  await page.getByRole("button", { name: "Wyślij do Marka" }).click();

  await openRecord(page, false);
  await expect(page.getByRole("tab", { name: "Wpływ badań na decyzję" })).toHaveCount(0);
  await expect(page.locator('input[type="file"], video')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Wyślij odpowiedź" })).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Odpowiedź tekstowa" })
    .fill("Porównałem medianę: 40 i 30 minut.");
  await page.getByRole("button", { name: "Wyślij odpowiedź" }).click();
  await expect(page.getByRole("heading", { name: "Twoja wysłana odpowiedź" })).toBeVisible();
  await page.getByRole("tab", { name: "Samodzielna decyzja o zakresie" }).click();
  await expect(page.getByText("Za którą decyzję odpowiadałeś osobiście?")).toBeVisible();
  await page.getByRole("textbox", { name: "Odpowiedź tekstowa" }).fill("Ustaliłem zakres pilota.");
  await page.getByRole("button", { name: "Wyślij odpowiedź" }).click();
  await expect(page.getByRole("heading", { name: "Twoja wysłana odpowiedź" })).toBeVisible();

  await openRecord(page, true);
  await expect(page.getByText("Propozycja odrzucona.")).toBeVisible();
  await page.getByRole("tab", { name: "Wiarygodność wyniku 25%" }).click();
  await expect(page.getByText("Porównałem medianę: 40 i 30 minut.")).toBeVisible();
  await page.getByRole("radio", { name: "Przydatna", exact: true }).check();
  await page.getByRole("tab", { name: "Samodzielna decyzja o zakresie" }).click();
  await expect(page.getByText("Ustaliłem zakres pilota.")).toBeVisible();
  await expect(
    page
      .getByRole("tabpanel", { name: "Samodzielna decyzja o zakresie" })
      .getByRole("radio", { name: "Przydatna", exact: true }),
  ).not.toBeChecked();

  await page.goto("/#/app/settings");
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksportuj dane" }).click();
  const backup = await (await exported).path();
  await page.getByRole("button", { name: "Resetuj scenariusz", exact: true }).click();
  await page.getByRole("button", { name: "Resetuj", exact: true }).click();
  await openRecord(page, false);
  await expect(page.getByText("Nie masz jeszcze pytań ani zadań od pracodawcy.")).toBeVisible();
  await page.goto("/#/app/settings");
  await page.getByLabel("Importuj plik scenariusza").setInputFiles(backup);
  await page.getByRole("button", { name: "Importuj", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("doroboty.prototype.v1")))
    .toContain("Porównałem medianę: 40 i 30 minut.");
  await openRecord(page, true);
  await page.getByRole("tab", { name: "Wiarygodność wyniku 25%" }).click();
  await expect(page.getByText("Porównałem medianę: 40 i 30 minut.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Przydatna", exact: true })).toBeChecked();
});

test("an older tab keeps its edits available for export without overwriting a newer save", async ({
  page,
  context,
}) => {
  await openRecord(page, true);
  const older = await context.newPage();
  await older.goto("/#/app/kandydaci/application-example");
  await older.getByRole("tab", { name: "Karta dowodów" }).click();
  // Hold the same lock until both tabs have queued edits from the same snapshot.
  await page.evaluate(
    () =>
      new Promise<void>((ready) => {
        void navigator.locks.request("doroboty.prototype.v1", async () => {
          await new Promise<void>((release) => {
            window.addEventListener("release-test-scenario-lock", () => release(), { once: true });
            ready();
          });
        });
      }),
  );
  await page.getByRole("button", { name: "Przygotuj pytanie" }).click();
  await page.getByLabel("Propozycja pytania").fill("Nowsza propozycja");
  await older.getByRole("button", { name: "Przygotuj pytanie" }).click();
  await older.getByLabel("Propozycja pytania").fill("Zmiana w starszej karcie");
  await expect
    .poll(() => page.evaluate(async () => (await navigator.locks.query()).pending?.length))
    .toBeGreaterThanOrEqual(2);
  await page.evaluate(() => window.dispatchEvent(new Event("release-test-scenario-lock")));

  await expect(older.getByText(/Zapis zmienił się w innej karcie/)).toBeVisible();
  await older.goto("/#/app/settings");
  const download = older.waitForEvent("download");
  await older.getByRole("button", { name: "Eksportuj dane" }).click();
  expect(await readFile(await (await download).path(), "utf8")).toContain(
    "Zmiana w starszej karcie",
  );
  await page.reload();
  await page.getByRole("tab", { name: "Karta dowodów" }).click();
  await expect(page.getByLabel("Propozycja pytania")).toHaveValue("Nowsza propozycja");
});
