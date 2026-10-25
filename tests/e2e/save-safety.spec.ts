import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

async function ready(page: Page) {
  await expect(page.locator(".studio-viewport")).toHaveAttribute("data-scene-ready", "true", {
    timeout: 30000,
  });
  await expect(page.locator(".viewport-scene-loading, .viewport-scene-error")).toHaveCount(0);
}
async function records(page: Page): Promise<{
  last: string;
  projects: Array<{ id: string; storageVersion: string; documentJson: string }>;
}> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("web3d-studio");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const tx = db.transaction(["projects", "settings"], "readonly");
      const read = <T>(request: IDBRequest<T>) =>
        new Promise<T>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      const [projects, setting] = await Promise.all([
        read(tx.objectStore("projects").getAll()),
        read(tx.objectStore("settings").get("last-project-id")),
      ]);
      return { projects, last: setting.value };
    } finally {
      db.close();
    }
  });
}
async function save(page: Page) {
  await page.getByRole("button", { name: "Save local project", exact: true }).click();
  await expect(page.getByTestId("save-state")).toHaveText("Saved locally");
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem("web3d.studio.locale", "en"));
});
test("new model import undo autosave redo export and reopen remain usable", async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await ready(page);
  const initial = await records(page);
  const initialDoc = JSON.parse(
    initial.projects.find((project) => project.id === initial.last)!.documentJson,
  );
  const count = await page.getByRole("treeitem").count();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await (
    await chooser
  ).setFiles(path.resolve("assets/free-home/source/kenney/loungeDesignSofa.glb"));
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByRole("button", { name: "Add to scene", exact: true }).click();
  await ready(page);
  await expect(page.getByRole("treeitem")).toHaveCount(count + 1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("treeitem")).toHaveCount(count);
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await records(page)).projects.find((project) => project.id === initial.last)!
            .documentJson,
        ).assets.length,
    )
    .toBe(initialDoc.assets.length);
  await save(page);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await ready(page);
  await save(page);
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await records(page)).projects.find((project) => project.id === initial.last)!
            .documentJson,
        ).assets.length,
    )
    .toBe(initialDoc.assets.length + 1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await (await download).saveAs(test.info().outputPath("redo.scene.zip"));
  await save(page);
  await expect(page.getByTestId("persistence-notice")).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(page.getByRole("treeitem", { name: "loungeDesignSofa", exact: true })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("import-redo-reloaded.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("two ordinary tabs preserve the winner and recover the fork through Save a copy", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await ready(page);
  const originalId = (await records(page)).last;
  const other = await context.newPage();
  other.on("pageerror", (error) => errors.push(error.message));
  await other.goto("/");
  await ready(other);
  await page
    .getByRole("treeitem", { name: "Living Room Sofa", exact: true })
    .locator(".tree-select")
    .click();
  await other
    .getByRole("treeitem", { name: "Living Room Sofa", exact: true })
    .locator(".tree-select")
    .click();
  const a = page.locator("#object-inspector-panel").getByLabel("Name", { exact: true });
  await a.fill("Winner Sofa");
  await a.press("Enter");
  await save(page);
  await expect
    .poll(async () =>
      JSON.parse(
        (await records(page)).projects.find((project) => project.id === originalId)!.documentJson,
      ).entities.some((entity: { name: string }) => entity.name === "Winner Sofa"),
    )
    .toBe(true);
  const b = other.locator("#object-inspector-panel").getByLabel("Name", { exact: true });
  await b.fill("Local Fork Sofa");
  await b.press("Enter");
  const saveButton = other.getByRole("button", { name: "Save local project", exact: true });
  if (await saveButton.isEnabled()) await saveButton.click();
  await expect(other.getByTestId("persistence-notice")).toContainText(
    "Another tab saved this project",
  );
  await expect(b).toHaveValue("Local Fork Sofa");
  await expect(saveButton).toBeDisabled();
  await other.screenshot({
    path: test.info().outputPath("conflict-local-copy-retained.png"),
    fullPage: true,
  });
  await other.getByRole("button", { name: "Save a copy", exact: true }).click();
  await expect(other.getByTestId("persistence-notice")).toContainText("A separate copy was saved");
  const state = await records(other);
  expect(state.last).not.toBe(originalId);
  const winner = JSON.parse(
    state.projects.find((project) => project.id === originalId)!.documentJson,
  );
  const copy = JSON.parse(
    state.projects.find((project) => project.id === state.last)!.documentJson,
  );
  expect(winner.entities.some((entity: { name: string }) => entity.name === "Winner Sofa")).toBe(
    true,
  );
  expect(copy.entities.some((entity: { name: string }) => entity.name === "Local Fork Sofa")).toBe(
    true,
  );
  expect(winner.revision).toBe(copy.revision);
  await other.reload();
  await ready(other);
  await expect(other.getByRole("treeitem", { name: "Local Fork Sofa", exact: true })).toBeVisible();
  await other.screenshot({
    path: test.info().outputPath("conflict-copy-reopened.png"),
    fullPage: true,
  });
  await other.close();
  expect(errors).toEqual([]);
});
