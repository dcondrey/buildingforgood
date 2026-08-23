export function MapValueTable({
  caption,
  rows,
}: {
  caption: string;
  rows: Array<{ name: string; value: string; state: string }>;
}) {
  return (
    <details className="data-table-disclosure map-table-disclosure">
      <summary>View map values as a table</summary>
      <div className="table-scroll">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Neighborhood</th>
              <th>Value</th>
              <th>State</th>
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
