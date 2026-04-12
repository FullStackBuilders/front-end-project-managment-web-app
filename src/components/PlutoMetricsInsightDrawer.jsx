import { useEffect, useState, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { renderInsightContentWithHighlights } from '../utils/plutoInsightHighlight';

const INTRO_TEXT = 'Hi! I am Pluto';

/** Shared gradient orb — FAB, thinking state, header. */
export function PlutoOrb({ size = 'md', animatePing = false, className = '' }) {
  const dim =
    size === 'sm' ? 'h-11 w-11' : size === 'lg' ? 'h-16 w-16' : 'h-14 w-14';
  return (
    <div className={`relative shrink-0 ${dim} ${className}`} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 shadow-lg shadow-indigo-500/30" />
      {animatePing ? (
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 opacity-40 animate-ping" />
      ) : null}
    </div>
  );
}

function PlutoThinkingState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="relative mb-5">
        <PlutoOrb size="lg" animatePing />
      </div>
      <p className="text-sm font-medium text-gray-800">Thinking...</p>
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      <div className="mt-8 w-full max-w-xs space-y-2.5 px-2">
        {[100, 88, 76].map((w, i) => (
          <div
            key={i}
            className="h-2.5 rounded-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-pulse"
            style={{ width: `${w}%`, marginLeft: i % 2 === 1 ? 'auto' : 0 }}
          />
        ))}
      </div>
    </div>
  );
}

function InsightsBody({ loading, error, sections, projectName, onRetry, showEmptyCta }) {
  if (loading) {
    return <PlutoThinkingState />;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-4 text-sm text-red-800">
        <p className="font-medium">Something went wrong</p>
        <p className="mt-1 text-red-700/90">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-red-900 underline underline-offset-2 hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!sections?.length) {
    if (showEmptyCta) {
      return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-4 text-sm text-gray-700">
          <p className="font-medium text-gray-800">No insights yet</p>
          <p className="mt-2 leading-relaxed">
            Use the <span className="font-semibold text-indigo-700">AI Insights</span> button in the toolbar
            above to generate insights from your current metrics.
          </p>
        </div>
      );
    }
    return null;
  }
  return (
    <div className="space-y-6 pb-4">
      {sections.map((section) => {
        const isOverview = section.key === 'overview';
        return (
          <section
            key={section.key}
            className="scroll-mt-4"
            aria-label={isOverview ? 'Introduction' : undefined}
          >
            {!isOverview && (
              <h3 className="mb-2 text-sm font-bold tracking-tight text-gray-900">{section.title}</h3>
            )}
            <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {renderInsightContentWithHighlights(section.content, projectName)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Bottom-right Pluto launcher + anchored insight panel (Kanban metrics).
 * Fetching is owned by the parent; opening from the orb does not load data.
 */
export default function PlutoMetricsInsightDrawer({
  open,
  onOpenChange,
  projectId,
  projectName,
  sections,
  loading,
  error,
  onRetry,
}) {
  const [typedIntro, setTypedIntro] = useState('');
  const [introComplete, setIntroComplete] = useState(false);
  const panelRef = useRef(null);

  const subtitle = projectName?.trim() ? projectName : 'Kanban metrics';

  useEffect(() => {
    let i = 0;
    let id;
    const tick = () => {
      i += 1;
      setTypedIntro(INTRO_TEXT.slice(0, i));
      if (i >= INTRO_TEXT.length) {
        if (id != null) window.clearInterval(id);
        setIntroComplete(true);
      }
    };
    id = window.setInterval(tick, 42);
    tick();
    return () => {
      if (id != null) window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const showFab = projectId && !open;

  return (
    <>
      {showFab && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[90] flex max-w-[min(calc(100vw-3rem),20rem)] flex-row items-center justify-end gap-3">
          <p
            className="pointer-events-none select-none rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-gray-700 shadow-md border border-gray-100"
            aria-hidden
          >
            {typedIntro}
            {!introComplete ? (
              <span className="ml-0.5 inline-block w-2 animate-pulse text-indigo-600">|</span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(true)}
            className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full p-0.5 shadow-lg ring-2 ring-white transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            aria-label="Open AI Insights panel"
          >
            <PlutoOrb size="sm" />
          </button>
        </div>
      )}

      {open && projectId ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] cursor-default bg-black/20"
            aria-label="Close AI Insights"
            onClick={() => onOpenChange(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-insights-title"
            tabIndex={-1}
            className="fixed bottom-6 right-6 z-[101] flex w-[min(calc(100vw-1.5rem),26rem)] max-h-[min(72vh,36rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none"
          >
            <h2 id="ai-insights-title" className="sr-only">
              AI Insights
            </h2>
            <p className="sr-only">
              Kanban metrics insights generated from your project data. Use the toolbar AI Insights
              control to refresh after metrics change.
            </p>

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                  <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">AI Insights</p>
                  <p className="truncate text-xs text-gray-500">{subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <InsightsBody
                loading={loading}
                error={error}
                sections={sections}
                projectName={projectName}
                onRetry={onRetry}
                showEmptyCta={open}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
