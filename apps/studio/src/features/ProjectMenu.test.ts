import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudioI18nProvider } from "../i18n/I18nProvider";
import { ProjectMenu } from "./ProjectMenu";

beforeEach(() => vi.stubGlobal("navigator", { languages: ["en"], language: "en" }));
afterEach(() => vi.unstubAllGlobals());

describe("ProjectMenu", () => {
  it("keeps project operations separate from global and scene settings", () => {
    const html = renderMenu(false);

    expect(html).not.toContain("Scene settings");
    expect(html).not.toContain("Settings");
    expect(html).toContain("New scene");
    expect(html).toContain("Export JSON");
  });
});

function renderMenu(canConfigureScene: boolean): string {
  return renderToStaticMarkup(
    createElement(
      StudioI18nProvider,
      null,
      createElement(ProjectMenu, {
        canRename: canConfigureScene,
        currentProjectId: "project",
        recent: [],
        onClose: () => undefined,
        onDelete: () => undefined,
        onExportJson: () => undefined,
        onImportArchive: () => undefined,
        onImportJson: () => undefined,
        onNew: () => undefined,
        onOpen: () => undefined,
        onRename: () => undefined,
      }),
    ),
  );
}
