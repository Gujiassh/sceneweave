import { useStudioI18n } from "../i18n/I18nProvider";
import "./persistence-notice.css";

export function PersistenceNotice(props: {
  readonly conflict: string | null;
  readonly copying: boolean;
  readonly copySaved: boolean;
  readonly onSaveCopy: () => void;
  readonly onRenameCopy: () => void;
}) {
  const { t } = useStudioI18n();
  if (props.conflict === null && !props.copySaved) return null;
  return (
    <section
      className="persistence-notice"
      role={props.conflict === null ? "status" : "alert"}
      data-testid="persistence-notice"
    >
      <span>{props.conflict ?? t.app.persistence.copySaved}</span>
      {props.conflict !== null ? (
        <button
          type="button"
          className="secondary-command"
          disabled={props.copying}
          onClick={props.onSaveCopy}
        >
          {props.copying ? t.app.persistence.copying : t.app.persistence.saveCopy}
        </button>
      ) : (
        <button type="button" className="secondary-command" onClick={props.onRenameCopy}>
          {t.app.persistence.renameCopy}
        </button>
      )}
    </section>
  );
}
