/**
 * Shared Recharts tooltip styling and copy for Summary priority / assignee bar charts
 * (Kanban ProjectSummary + Scrum ScrumSummaryView).
 */

export const SUMMARY_BAR_TOOLTIP_CONTENT_STYLE = {
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  fontSize: '13px',
};

/** e.g. "Low: 13 tasks (48%)" */
export function formatSummaryBarTooltipLine(categoryName, value, total) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const pct = total > 0 ? Math.round((safe / total) * 100) : 0;
  const label = categoryName != null ? String(categoryName) : '';
  return `${label}: ${safe} task${safe !== 1 ? 's' : ''} (${pct}%)`;
}

/**
 * @param {object} props
 * @param {boolean} props.active
 * @param {object[]} props.payload
 * @param {number} props.total - denominator for percentage (project or sprint task count)
 */
export function SummaryBarTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const line = formatSummaryBarTooltipLine(row?.payload?.name, row?.value, total);
  return (
    <div
      style={{
        ...SUMMARY_BAR_TOOLTIP_CONTENT_STYLE,
        backgroundColor: '#fff',
        padding: '10px 12px',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      }}
    >
      <p style={{ margin: 0, color: '#111827' }}>{line}</p>
    </div>
  );
}
