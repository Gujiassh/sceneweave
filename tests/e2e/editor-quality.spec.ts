import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { PNG } from "pngjs";
import { readFile } from "node:fs/promises";
import { importSceneArchive, type SceneDocument } from "../../packages/document/src/index.js";

const evidence = (name: string) => path.resolve("artifacts/e2e", name);

for (const setting of [
  { width: 1280, height: 720, locale: "zh-CN", theme: "dark" },
  { width: 1440, height: 900, locale: "en", theme: "light" },
] as const) {
  test(`default home editor journey ${setting.width} ${setting.locale}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(setting);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem("web3d.studio.locale", locale);
      localStorage.setItem("web3d.studio.theme", theme);
    }, setting);
    await page.goto("/");
    await ready(page);
    const canvas = page.locator('canvas[data-web3d-viewer="true"]');
    await canvas.evaluate((element) => element.setAttribute("data-preserved-canvas", "yes"));
    const before = await persistedDocument(page);
    const sofa = page.getByRole("treeitem", { name: "Living Room Sofa", exact: true });
    const sofaId = await sofa.getAttribute("data-entity-id");
    await sofa.locator(".tree-select").click();
    await expect(page.getByTestId("viewport-mode")).toContainText("Living Room Sofa");
    const focus = page.getByRole("button", {
      name: setting.locale === "en" ? "Focus selection" : "聚焦所选",
      exact: true,
    });
    await focus.click();
    const navigation = page.getByRole("button", {
      name: setting.locale === "en" ? "Toggle scene navigation" : "显示或隐藏场景导航",
      exact: true,
    });
    const properties = page.getByRole("button", {
      name: setting.locale === "en" ? "Toggle properties" : "显示或隐藏属性",
      exact: true,
    });
    const originalWidth = (await canvas.boundingBox())!.width;
    await navigation.click();
    await properties.click();
    await expect(navigation).toHaveAttribute("aria-expanded", "false");
    expect((await canvas.boundingBox())!.width).toBeGreaterThan(originalWidth + 400);
    await expect(canvas).toHaveAttribute("data-preserved-canvas", "yes");
    expect((await persistedDocument(page)).revision).toBe(before.revision);
    await page.screenshot({
      path: evidence(`editor-focus-${setting.width}-${setting.locale}.png`),
    });
    await navigation.press("Enter");
    await properties.press("Enter");
    const name = page
      .locator("#object-inspector-panel")
      .getByLabel(setting.locale === "en" ? "Name" : "名称", { exact: true });
    await name.fill("Living Room Sofa · QA");
    await name.press("Enter");
    await expect(page.getByTestId("viewport-mode")).toContainText("Living Room Sofa · QA");
    await page
      .getByRole("button", { name: setting.locale === "en" ? "Undo" : "撤销", exact: true })
      .click();
    await expect(name).toHaveValue("Living Room Sofa");
    await page
      .getByRole("button", { name: setting.locale === "en" ? "Redo" : "重做", exact: true })
      .click();
    await expect(name).toHaveValue("Living Room Sofa · QA");
    const originalPosition = (await persistedDocument(page)).entities.find(
      (entity) => entity.id === sofaId,
    )!.transform.position;
    await page.keyboard.press("w");
    await expect(page.getByTestId("viewport-mode")).toContainText(
      setting.locale === "en" ? "TRANSLATE" : "平移",
    );
    const image = PNG.sync.read(await stableCanvas(page));
    const red: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < image.height; y++)
      for (let x = 0; x < image.width; x++) {
        const offset = (y * image.width + x) * 4;
        if (
          image.data[offset]! > 190 &&
          image.data[offset + 1]! < 70 &&
          image.data[offset + 2]! < 70
        )
          red.push({ x, y });
      }
    expect(red.length).toBeGreaterThan(10);
    const rightmost = Math.max(...red.map((point) => point.x));
    const arrow = red.filter((point) => point.x > rightmost - 8);
    const rect = (await canvas.boundingBox())!;
    const x =
      rect.x +
      ((arrow.reduce((sum, point) => sum + point.x, 0) / arrow.length) * rect.width) / image.width;
    const y =
      rect.y +
      ((arrow.reduce((sum, point) => sum + point.y, 0) / arrow.length) * rect.height) /
        image.height;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 50, y + 28, { steps: 12 });
    await page.mouse.up();
    await expect
      .poll(
        async () =>
          (await persistedDocument(page)).entities.find((entity) => entity.id === sofaId)!.transform
            .position,
      )
      .not.toEqual(originalPosition);
    const movedPosition = (await persistedDocument(page)).entities.find(
      (entity) => entity.id === sofaId,
    )!.transform.position;
    await page
      .getByRole("button", { name: setting.locale === "en" ? "Undo" : "撤销", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await persistedDocument(page)).entities.find((entity) => entity.id === sofaId)!.transform
            .position,
      )
      .toEqual(originalPosition);
    await page
      .getByRole("button", { name: setting.locale === "en" ? "Redo" : "重做", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await persistedDocument(page)).entities.find((entity) => entity.id === sofaId)!.transform
            .position,
      )
      .toEqual(movedPosition);
    await ready(page);
    await page.keyboard.press("Control+s");
    await expect(page.getByTestId("save-state")).toContainText(
      setting.locale === "en" ? "Saved" : "已保存",
    );
    await page.reload();
    await ready(page);
    await expect(
      page.getByRole("treeitem").filter({ hasText: "Living Room Sofa · QA" }).first(),
    ).toBeVisible();
    expect((await persistedDocument(page)).revision).toBeGreaterThan(before.revision);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: evidence(`editor-saved-${setting.width}-${setting.locale}.png`),
    });
    const authored = await persistedDocument(page);
    expect(authored.entities.find((entity) => entity.id === sofaId)?.transform.position).toEqual(
      movedPosition,
    );
    await page
      .getByRole("button", { name: setting.locale === "en" ? "Run" : "运行", exact: true })
      .click();
    await expect(page.locator(".runtime-status.status-online")).toBeVisible();
    await expect(page.locator(".runtime-value")).toHaveCount(
      authored.bindings.filter((binding) => binding.enabled).length,
    );
    await page.screenshot({ path: evidence(`editor-run-${setting.width}-${setting.locale}.png`) });
    await page
      .getByRole("button", { name: setting.locale === "en" ? "Edit" : "编辑", exact: true })
      .click();
    expect(await persistedDocument(page)).toEqual(authored);
    await page
      .getByRole("button", {
        name: setting.locale === "en" ? "Open project menu" : "打开项目菜单",
        exact: true,
      })
      .click();
    const jsonPending = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: setting.locale === "en" ? "Export JSON" : "导出 JSON",
        exact: true,
      })
      .click();
    const jsonDownload = await jsonPending;
    const jsonPath = test.info().outputPath("home.scene.json");
    await jsonDownload.saveAs(jsonPath);
    const exported = JSON.parse(await readFile(jsonPath, "utf8"));
    expect(exported).toEqual(authored);
    const zipPending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: setting.locale === "en" ? "Export" : "导出", exact: true })
      .click();
    const zipDownload = await zipPending;
    const zipPath = test.info().outputPath("home.scene.zip");
    await zipDownload.saveAs(zipPath);
    const archived = await importSceneArchive(new Uint8Array(await readFile(zipPath)));
    expect(archived.document).toEqual(authored);
    expect(archived.assets).toHaveLength(authored.assets.length);
    await expect(page.getByTestId("export-state")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("default starter failure is localized and Retry recovers without a partial project", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("web3d.studio.locale", "en"));
  await page.route("**/starter/descriptor.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  const failure = page.getByTestId("starter-bootstrap-error");
  await expect(failure).toContainText("Could not open your local project");
  await expect(page.getByTestId("save-state")).toHaveText("Project unavailable");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.screenshot({ path: evidence("editor-startup-recovery.png") });
  await page.unroute("**/starter/descriptor.json");
  await failure.getByRole("button", { name: "Retry", exact: true }).click();
  await ready(page);
  await expect(
    page.getByRole("treeitem").filter({ hasText: "Living Room Sofa" }).first(),
  ).toBeVisible();
});

async function ready(page: Page): Promise<void> {
  await expect(page.locator('canvas[data-web3d-viewer="true"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("project-loading")).toHaveCount(0);
  await expect(page.locator(".studio-viewport")).toHaveAttribute("data-scene-ready", "true", {
    timeout: 30_000,
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByTestId("save-state")).toContainText(/Saved|已保存/);
}
async function persistedDocument(page: Page): Promise<SceneDocument> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("web3d-studio");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<SceneDocument>((resolve, reject) => {
        const request = db.transaction("projects").objectStore("projects").getAll();
        request.onsuccess = () => resolve(JSON.parse(request.result[0].documentJson));
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

async function stableCanvas(page: Page): Promise<Buffer> {
  let previous: Buffer = Buffer.alloc(0);
  let stable = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const frame = await page.locator('canvas[data-web3d-viewer="true"]').screenshot();
    stable = frame.equals(previous) ? stable + 1 : 0;
    previous = frame;
    if (stable >= 3) return frame;
  }
  throw new Error("Canvas did not settle before the gizmo interaction.");
}
