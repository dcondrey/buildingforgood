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
      <div className="table-scroll">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>{t("table.thNeighborhood")}</th>
              <th>{t("table.thValue")}</th>
              <th>{t("table.thState")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th>{row.name}</th>
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
