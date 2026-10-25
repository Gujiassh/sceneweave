import {
  Focus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import { useStudioI18n } from "../i18n/I18nProvider";
import { detectStudioPlatform, studioCommandShortcut } from "../session/shortcut-registry";
import type { AuthoringTool, StudioMode } from "../session/session-state";

interface ViewportCommandsProps {
  readonly mode: StudioMode;
  readonly tool: AuthoringTool;
  readonly selectionName: string | null;
  readonly selectionId: string | null;
  readonly selectionCount: number;
  readonly navigationOpen: boolean;
  readonly inspectorOpen: boolean;
  readonly onToggleNavigation: () => void;
  readonly onToggleInspector: () => void;
  readonly onFocus: () => void;
  readonly onClear: () => void;
}

export function ViewportCommands(props: ViewportCommandsProps) {
  const { t } = useStudioI18n();
  const copy = t.app.viewport;
  const focusShortcut = studioCommandShortcut(
    "view.focus",
    detectStudioPlatform(globalThis.navigator),
  );
  return (
    <div className="viewport-command-bar">
      <button
        type="button"
        className="viewport-panel-toggle"
        aria-controls="studio-navigation"
        aria-expanded={props.navigationOpen}
        aria-label={copy.toggleNavigation}
        title={copy.toggleNavigation}
        onClick={props.onToggleNavigation}
      >
        {props.navigationOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>
      <div className="viewport-context" data-testid="viewport-mode">
        <span className="viewport-mode-badge">{copy.modeStatus[props.mode]}</span>
        {" / "}
        <span className="viewport-tool-label">{copy.toolStatus[props.tool]}</span>
        {" / "}
        <strong title={props.selectionId ?? undefined} className="viewport-selection-name">
          {props.selectionName ?? copy.noSelection}
        </strong>
        {props.selectionCount > 1 && (
          <span className="viewport-selection-count">
            {copy.selectedCount(props.selectionCount)}
          </span>
        )}
      </div>
      <button
        type="button"
        className="viewport-action"
        disabled={props.selectionName === null}
        title={`${copy.focusSelection} (${focusShortcut})`}
        aria-label={copy.focusSelection}
        onClick={props.onFocus}
      >
        <Focus size={14} />
        <span>{copy.focusSelection}</span>
        <kbd>{focusShortcut}</kbd>
      </button>
      <button
        type="button"
        className="viewport-panel-toggle"
        disabled={props.selectionName === null}
        title={copy.clearSelection}
        aria-label={copy.clearSelection}
        onClick={props.onClear}
      >
        <X size={14} />
      </button>
      <button
        type="button"
        className="viewport-panel-toggle"
        aria-controls="studio-properties"
        aria-expanded={props.inspectorOpen}
        aria-label={copy.toggleInspector}
        title={copy.toggleInspector}
        onClick={props.onToggleInspector}
      >
        {props.inspectorOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
      </button>
    </div>
  );
}
