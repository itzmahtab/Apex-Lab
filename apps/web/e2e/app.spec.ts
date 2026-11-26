import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DEMO = "/compare?session=demo-qualifying&a=demo-driver-a&la=2&b=demo-driver-b&lb=3";

test.describe("compare journey", () => {
  test("renders a full comparison with demo labelling", async ({ page }) => {
    await page.goto(DEMO);
    await expect(page.getByTestId("takeaway")).toContainText("DRB (lap 3) was 1.066 s faster than DRA (lap 2)");
    await expect(page.getByText("Demo data.", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Speed" })).toBeVisible();
    await expect(page.getByText("−1.066 s").first()).toBeVisible();
  });

  test("a partial URL is completed with each driver's fastest lap", async ({ page }) => {
    await page.goto("/compare?session=demo-qualifying&a=demo-driver-a&b=demo-driver-b");
    await expect(page).toHaveURL(/la=3&b=demo-driver-b&lb=5/);
    await expect(page.getByTestId("takeaway")).toBeVisible();
  });

  test("changing a lap updates the URL and the result", async ({ page }) => {
    await page.goto(DEMO);
    await page.locator("#lap-b").selectOption("4");
    await expect(page).toHaveURL(/lb=4/);
    await expect(page.getByTestId("takeaway")).toContainText("DRB (lap 4)");
  });

  test("swap exchanges drivers A and B", async ({ page }) => {
    await page.goto(DEMO);
    await page.getByRole("button", { name: "Swap driver A and driver B" }).click();
    await expect(page).toHaveURL(/a=demo-driver-b&la=3&b=demo-driver-a&lb=2/);
  });

  test("laps without telemetry show times only", async ({ page }) => {
    await page.goto("/compare?session=demo-qualifying&a=demo-driver-a&la=1&b=demo-driver-b&lb=1");
    await expect(page.getByText("No telemetry for this selection")).toBeVisible();
    await expect(page.getByTestId("takeaway")).toBeVisible();
  });

  test("invalid selections show a friendly error, not a crash", async ({ page }) => {
    await page.goto("/compare?session=demo-qualifying&a=demo-driver-a&la=99&b=demo-driver-b&lb=3");
    await expect(page.getByRole("alert").filter({ hasText: "can't be shown" })).toContainText("Lap 99 does not exist");
  });
});

test.describe("API", () => {
  test("validates input with stable error codes", async ({ request }) => {
    const bad = await request.get("/api/comparisons/data?session=../etc&a=x&la=1&b=y&lb=1");
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.code).toBe("VALIDATION_ERROR");
    const ok = await request.get(`/api/comparisons/data?${DEMO.split("?")[1]}`);
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.lapDeltaMs).toBe(-1066);
    expect(body.points.at(-1).deltaS).toBeCloseTo(-1.066, 2);
  });

  test("share card is a PNG", async ({ request }) => {
    const r = await request.get(`/api/share-card?${DEMO.split("?")[1]}`);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toBe("image/png");
  });
});

test.describe("season hub", () => {
  test("home renders the globe hero and degrades gracefully offline", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("One planet");
    await expect(page.getByRole("navigation", { name: "Rounds" })).toBeVisible();
    await expect(page.getByText("Live season data (calendar, results and standings) is unavailable")).toBeVisible();
    // picking a round from the accessible list updates the detail card with a live local clock
    await page.getByRole("navigation", { name: "Rounds" }).getByRole("button").filter({ hasText: "Monte Carlo" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Monte Carlo" })).toBeVisible();
    await expect(page.getByText(/UTC\+[12]/).first()).toBeVisible();
  });

  test("live dashboard explains when no timing is available", async ({ page }) => {
    await page.goto("/live");
    await expect(page.getByRole("status").filter({ hasText: "No timing data" })).toBeVisible();
  });

  test("circuit-track API validates input", async ({ request }) => {
    expect((await request.get("/api/circuit-track?season=abc&round=1")).status()).toBe(400);
    const ok = await request.get("/api/circuit-track?season=2026&round=1");
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toBeNull(); // fixture mode: no network
  });
});

test.describe("quality", () => {
  test("no horizontal scroll and keyboard reachable controls", async ({ page }) => {
    await page.goto(DEMO);
    await expect(page.getByTestId("takeaway")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Tab");
    await expect(page.getByText("Skip to content")).toBeFocused();
  });

  for (const path of ["/", "/live", "/methodology", DEMO]) {
    test(`no serious accessibility violations on ${path.split("?")[0]}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }
});
