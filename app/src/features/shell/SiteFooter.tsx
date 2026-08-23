import { useTranslation } from "../../i18n/context";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <div>
        <strong>Still Here SD</strong>
        <span>{t("footer.tagline")}</span>
      </div>
      <p>{t("footer.principles")}</p>
    </footer>
  );
}
