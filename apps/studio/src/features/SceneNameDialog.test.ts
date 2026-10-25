import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudioI18nProvider } from "../i18n/I18nProvider";
import { SceneNameDialog } from "./SceneNameDialog";

beforeEach(() => vi.stubGlobal("navigator", { languages: ["en"], language: "en" }));
afterEach(() => vi.unstubAllGlobals());

describe("SceneNameDialog", () => {
  it("renders the current name and accessible rename actions", () => {
    const html = renderToStaticMarkup(
      createElement(
        StudioI18nProvider,
        null,
        createElement(SceneNameDialog, {
          mode: "rename",
          initialName: "Line A",
          onCancel: () => undefined,
          onConfirm: () => true,
        }),
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Rename scene");
    expect(html).toContain('value="Line A"');
    expect(html).toContain("Scene name");
  });
});
