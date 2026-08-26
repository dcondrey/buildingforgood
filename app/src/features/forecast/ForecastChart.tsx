import { useState } from "react";
import type { DemoData, HistoryPoint } from "../../lib/demo";
import { useTranslation } from "../../i18n/context";

export function ForecastChart({
  history,
  data,
}: {
  history: HistoryPoint[];
  data: DemoData["forecast"];
}) {
  // Hover crosshair for sighted mouse users; index into history, or -1 for the
  // scenario point. Keyboard and screen-reader users get the same values from
  // the svg label and per-point titles, so nothing here is focusable.
  const { t, number: formatNumber } = useTranslation();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 760;
  const height = 300;
  const margin = { top: 24, right: 46, bottom: 54, left: 52 };
  const values = [
    ...history.flatMap((point) => (point.value === null ? [] : [point.value])),
    data.lower,
    data.upper,
    data.point,
  ];
  const maxValue = Math.max(10, Math.ceil(Math.max(...values) / 50) * 50);
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const totalPoints = history.length + 1;
  const x = (index: number) => margin.left + (index * chartWidth) / Math.max(1, totalPoints - 1);
  const y = (value: number) => margin.top + chartHeight - (value / maxValue) * chartHeight;

  const segments: Array<Array<{ index: number; value: number }>> = [];
  let current: Array<{ index: number; value: number }> = [];
  history.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push({ index, value: point.value });
    }
  });
  if (current.length) segments.push(current);
  const lastObservedIndex = history.findLastIndex((point) => point.value !== null);
  const lastObserved = history[lastObservedIndex]?.value;
  const forecastX = x(history.length);

  return (
    // Scrolls sideways below 46rem, so it needs a tab stop: a region only a
    // mouse can scroll is A-2 in the audit.
    <div aria-label={t("chart.scrollRegion")} className="chart-wrap" role="region" tabIndex={0}>
      <svg
        aria-label={t("chart.aria", {
          period: data.targetPeriod,
          point: formatNumber(data.point),
          lower: formatNumber(data.lower),
          upper: formatNumber(data.upper),
        })}
        className="forecast-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>{t("chart.title")}</title>
        <desc>{t("chart.desc")}</desc>
        {[0, maxValue / 2, maxValue].map((tick) => (
          <g key={tick}>
            <line
              className="chart-grid"
              x1={margin.left}
              x2={width - margin.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="chart-axis" x={margin.left - 12} y={y(tick) + 4} textAnchor="end">
              {formatNumber(tick)}
            </text>
          </g>
        ))}

        <rect
          className="forecast-band"
          height={Math.max(2, y(data.lower) - y(data.upper))}
          rx="8"
          width="54"
          x={forecastX - 27}
          y={y(data.upper)}
        />
        <line
          className="interval-boundary"
          x1={forecastX - 28}
          x2={forecastX + 28}
          y1={y(data.upper)}
          y2={y(data.upper)}
        />
        <line
          className="interval-boundary"
          x1={forecastX - 28}
          x2={forecastX + 28}
          y1={y(data.lower)}
          y2={y(data.lower)}
        />

        {segments.map((segment, segmentIndex) => (
          <path
            className="observed-line"
            d={segment
              .map(
                (point, pointIndex) =>
                  `${pointIndex === 0 ? "M" : "L"}${x(point.index)},${y(point.value)}`,
              )
              .join(" ")}
            key={segmentIndex}
          />
        ))}
        {typeof lastObserved === "number" && (
          <path
            className="forecast-line"
            d={`M${x(lastObservedIndex)},${y(lastObserved)} L${forecastX},${y(data.point)}`}
          />
        )}
        {history.map((point, index) =>
          point.value === null ? (
            <g key={point.period}>
              <circle className="missing-point" cx={x(index)} cy={y(0)} r="5" />
              <title>{t("chart.pointMissing", { period: point.period })}</title>
            </g>
          ) : (
            <circle
              className="observed-point"
              cx={x(index)}
              cy={y(point.value)}
              key={point.period}
              r="4"
            >
              <title>{t("chart.pointValue", { period: point.period, value: point.value })}</title>
            </circle>
          ),
        )}
        <circle className="forecast-point" cx={forecastX} cy={y(data.point)} r="6" />

        {(() => {
          const hovered =
            hoverIndex === null
              ? null
              : hoverIndex === -1
                ? {
                    px: forecastX,
                    py: y(data.point),
                    label: t("chart.scenarioLabel", { period: data.targetPeriod }),
                    value: t("chart.scenarioValue", {
                      point: formatNumber(data.point),
                      lower: formatNumber(data.lower),
                      upper: formatNumber(data.upper),
                    }),
                  }
                : history[hoverIndex].value === null
                  ? {
                      px: x(hoverIndex),
                      py: y(0),
                      label: history[hoverIndex].period,
                      value: t("chart.notReported"),
                    }
                  : {
                      px: x(hoverIndex),
                      py: y(history[hoverIndex].value),
                      label: history[hoverIndex].period,
                      value: formatNumber(history[hoverIndex].value),
                    };
          if (!hovered) return null;
          const boxWidth = Math.max(88, (hovered.label.length + hovered.value.length) * 5.4);
          const boxX = Math.min(
            width - margin.right - boxWidth,
            Math.max(margin.left, hovered.px - boxWidth / 2),
          );
          // Flip below the point when it sits near the top, so the box never
          // covers the interval label.
          const boxY = hovered.py < 96 ? hovered.py + 14 : hovered.py - 46;
          return (
            <g aria-hidden="true" className="chart-hover" pointerEvents="none">
              <line
                className="chart-crosshair"
                x1={hovered.px}
                x2={hovered.px}
                y1={margin.top}
                y2={margin.top + chartHeight}
              />
              <circle className="chart-hover-dot" cx={hovered.px} cy={hovered.py} r="7" />
              <rect
                className="chart-tooltip-box"
                height={34}
                rx={7}
                width={boxWidth}
                x={boxX}
                y={boxY}
              />
              <text className="chart-tooltip-label" x={boxX + 8} y={boxY + 14}>
                {hovered.label}
              </text>
              <text className="chart-tooltip-value" x={boxX + 8} y={boxY + 28}>
                {hovered.value}
              </text>
            </g>
          );
        })()}

        {history.map((point, index) => (
          <rect
            fill="transparent"
            height={chartHeight}
            key={`hit-${point.period}`}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            width={chartWidth / Math.max(1, totalPoints - 1)}
            x={x(index) - chartWidth / Math.max(1, totalPoints - 1) / 2}
            y={margin.top}
          />
        ))}
        <rect
          fill="transparent"
          height={chartHeight}
          onMouseEnter={() => setHoverIndex(-1)}
          onMouseLeave={() => setHoverIndex(null)}
          width={chartWidth / Math.max(1, totalPoints - 1)}
          x={forecastX - chartWidth / Math.max(1, totalPoints - 1) / 2}
          y={margin.top}
        />

        {history.map((point, index) => (
          <text
            className="chart-axis x-axis"
            key={point.period}
            x={x(index)}
            y={height - 22}
            textAnchor="middle"
          >
            {point.period.replace(/\s\d{4}$/, "")}
          </text>
        ))}
        {/* Its own row, below the months. It shares the forecast column's centre
            with December's tick, so at any legible size the two collide on a
            single baseline — "Dec" and "Jan scenario" were overlapping. The
            bottom margin is 54 units and the axis row uses 22 of them. */}
        <text
          className="chart-axis forecast-label"
          x={forecastX}
          y={height - 5}
          textAnchor="middle"
        >
          {t("chart.scenarioLabel", { period: data.targetPeriod.replace(/\s\d{4}$/, "") })}
        </text>
        <text
          className="interval-label"
          x={forecastX - 36}
          y={Math.max(14, y(data.upper) - 8)}
          textAnchor="end"
        >
          {t("chart.rangeLabel", {
            lower: formatNumber(data.lower),
            upper: formatNumber(data.upper),
          })}
        </text>
      </svg>
      <div aria-hidden="true" className="chart-legend">
        <span>
          <i className="legend-observed" />
          {t("chart.legendObserved")}
        </span>
        <span>
          <i className="legend-forecast" />
          {t("chart.legendForecast")}
        </span>
        <span>
          <i className="legend-range" />
          {t("chart.legendRange")}
        </span>
      </div>
    </div>
  );
}
