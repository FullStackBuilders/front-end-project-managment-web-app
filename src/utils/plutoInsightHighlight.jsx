/** Longest first so shorter subphrases do not steal matches (e.g. "Lead Time" vs "Avg Lead Time"). */
const STATIC_PHRASES = [
  'Avg Cycle Time',
  'Avg Lead Time',
  'Cycle Time',
  'Lead Time',
  'Work In Progress',
  'waiting time',
  'Waiting Time',
  'Throughput',
  'TeamBoard',
  'WIP',
];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHighlightRegex(projectName) {
  const phrases = [...STATIC_PHRASES];
  const trimmed = projectName?.trim();
  if (trimmed) {
    phrases.push(trimmed);
  }
  phrases.sort((a, b) => b.length - a.length);
  const phrasePart =
    phrases.length > 0 ? phrases.map((p) => escapeRegExp(p)).join('|') : null;

  const numberWithUnit = String.raw`\d+(?:\.\d+)?\s*(?:days?|d\b)`;
  const numberDecimal = String.raw`\d+(?:\.\d+)?`;

  const parts = [];
  if (phrasePart) {
    parts.push(`(?:${phrasePart})`);
  }
  parts.push(String.raw`\bPluto\b`);
  parts.push(`(?:${numberWithUnit})`);
  parts.push(`(?:${numberDecimal})`);

  return new RegExp(`(${parts.join('|')})`, 'gi');
}

/**
 * Splits plain-text insight copy into fragments with metric names, Pluto, project name, and numbers emphasized.
 */
export function renderInsightContentWithHighlights(text, projectName) {
  if (text == null || text === '') {
    return null;
  }
  const re = buildHighlightRegex(projectName);
  const out = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    out.push(
      <strong key={`pluto-hl-${key++}`} className="font-semibold text-gray-900">
        {match[0]}
      </strong>
    );
    lastIndex = re.lastIndex;
    if (match[0].length === 0) {
      re.lastIndex += 1;
    }
  }
  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }
  return out.length > 0 ? out : text;
}
