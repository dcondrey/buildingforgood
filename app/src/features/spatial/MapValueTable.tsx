import { useTranslation } from "../../i18n/context";

export function MapValueTable({
  caption,
  rows,
}: {
  caption: string;
  rows: Array<{ name: string; value: string; state: string }>;
}) {
  const { t } = useTranslation();
  return (
    <details className="data-table-disclosure map-table-disclosure">
      <summary>{t("table.viewAsTable")}</summary>
      <div aria-label={caption} className="table-scroll" role="region" tabIndex={0}>
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{t("table.thNeighborhood")}</th>
              <th scope="col">{t("table.thValue")}</th>
              <th scope="col">{t("table.thState")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td>{row.value}</td>
                <td>{row.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
