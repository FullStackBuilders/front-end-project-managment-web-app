import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import ScrumBacklogView from "./ScrumBacklogView";
import ScrumBoardView from "./ScrumBoardView";
import ScrumListView from "./ScrumListView";
import ScrumCalendarView from "./ScrumCalendarView";
import ScrumSummaryView from "./ScrumSummaryView";
import ScrumMetricsView from "./ScrumMetricsView";
import PlutoMetricsInsightDrawer from "../PlutoMetricsInsightDrawer";
import PlutoPlanMyTaskDrawer from "../PlutoPlanMyTaskDrawer";
import { useActiveSprintSelection } from "@/hooks/useActiveSprintSelection";
import { selectAllIssuesRaw } from "../../store/issueSlice";
import ApiService from "../../services/ApiService";
import CustomApiError from "../../services/CustomApiError";
import { projectApi } from "../../services/projectApi";
import { buildScrumInsightsStaleKey } from "../../utils/scrumInsightsStaleKey";

const TABS = [
  { id: "backlog", label: "Backlog" },
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "calendar", label: "Calendar" },
  { id: "summary", label: "Summary" },
  { id: "metrics", label: "Metrics" },
];

function normalizeSprintId(sprintId) {
  const n = Number(sprintId);
  return Number.isFinite(n) ? n : null;
}

function issueInSprint(issue, sprintId) {
  return normalizeSprintId(issue?.sprintId) === normalizeSprintId(sprintId);
}

/**
 * Scrum manage-project lower section: Backlog + Board (multi–active-sprint Kanban, default "All").
 */
export default function ScrumProjectWorkspace({ projectId, projectName }) {
  const [activeTab, setActiveTab] = useState("backlog");
  const issues = useSelector(selectAllIssuesRaw);
  const sprintSelection = useActiveSprintSelection(projectId);
  const {
    reportSprints,
    selectedSprintId,
    setSelectedSprintId,
    loadingSprints,
    selectedSprint,
    sprintOptions,
    velocitySprints,
  } = sprintSelection;

  const [insightOpen, setInsightOpen] = useState(false);
  const [insightSections, setInsightSections] = useState(null);
  const [insightError, setInsightError] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const [planOpen, setPlanOpen] = useState(false);
  const [planSections, setPlanSections] = useState([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const planInFlight = useRef(false);

  const issuesInSelectedSprint = useMemo(
    () => issues.filter((i) => issueInSprint(i, selectedSprintId)),
    [issues, selectedSprintId]
  );

  const insightsStaleKey = useMemo(
    () =>
      buildScrumInsightsStaleKey({
        projectId,
        sprintId: selectedSprintId,
        issuesInSelectedSprint,
      }),
    [projectId, selectedSprintId, issuesInSelectedSprint]
  );

  const staleKeyRef = useRef(insightsStaleKey);
  const insightInFlight = useRef(false);
  const prevProjectIdRef = useRef(projectId);

  useEffect(() => {
    staleKeyRef.current = insightsStaleKey;
  }, [insightsStaleKey]);

  useEffect(() => {
    setInsightSections(null);
    setInsightError(null);
    setInsightLoading(false);
  }, [insightsStaleKey]);

  useEffect(() => {
    if (prevProjectIdRef.current !== projectId) {
      setInsightOpen(false);
      prevProjectIdRef.current = projectId;
    }
  }, [projectId]);

  useEffect(() => {
    setPlanOpen(false);
    setPlanSections([]);
    setPlanError(null);
    setPlanLoading(false);
  }, [projectId]);

  const fetchPlan = useCallback(async () => {
    if (!projectId || planInFlight.current) return;
    planInFlight.current = true;
    setPlanError(null);
    setPlanSections([]);
    setPlanLoading(true);
    setPlanOpen(true);
    try {
      const res = await projectApi.planMyTasks(projectId);
      const sections = res?.data?.parsedInsights?.sections;
      if (Array.isArray(sections) && sections.length > 0) {
        setPlanSections(sections);
      } else {
        setPlanError("No plan was returned. Please try again.");
      }
    } catch (e) {
      const msg =
        e instanceof CustomApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not generate task plan.";
      setPlanError(msg);
    } finally {
      planInFlight.current = false;
      setPlanLoading(false);
    }
  }, [projectId]);

  const requestInsights = useCallback(async () => {
    if (!projectId || !selectedSprintId || insightInFlight.current) return;
    insightInFlight.current = true;
    const keyAtStart = staleKeyRef.current;
    setInsightLoading(true);
    setInsightError(null);
    setInsightSections(null);
    try {
      const res = await ApiService.post("/api/ai/metrics-insights", {
        projectId: Number(projectId),
        framework: "SCRUM",
        sprintId: Number(selectedSprintId),
      });
      if (staleKeyRef.current !== keyAtStart) {
        return;
      }
      const parsed = res?.data?.parsedInsights?.sections;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setInsightSections(parsed);
      } else {
        setInsightError("No structured insights were returned. Try again.");
      }
    } catch (e) {
      if (staleKeyRef.current !== keyAtStart) {
        return;
      }
      const msg =
        e instanceof CustomApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not load insights.";
      const normalized = String(msg ?? "");
      const hasStructuredContractError =
        normalized.includes("Insights contract violation") ||
        normalized.includes("Failed to parse Gemini JSON response");
      setInsightError(
        hasStructuredContractError
          ? "AI insights returned an invalid response format. Please try again."
          : msg
      );
    } finally {
      insightInFlight.current = false;
      setInsightLoading(false);
    }
  }, [projectId, selectedSprintId]);

  const handleToolbarAiInsights = useCallback(() => {
    setInsightOpen(true);
    void requestInsights();
  }, [requestInsights]);

  const handleSprintStarted = useCallback(() => {
    setActiveTab("board");
  }, []);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 border-b border-gray-200">
        <div className="flex gap-1" role="tablist" aria-label="Scrum workspace">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              id={`scrum-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer
                ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "backlog" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-backlog">
          <ScrumBacklogView
            projectId={projectId}
            onSprintStarted={handleSprintStarted}
          />
        </div>
      )}

      {activeTab === "board" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-board">
          <ScrumBoardView
            projectId={projectId}
            onFetchPlan={fetchPlan}
            planLoading={planLoading}
          />
        </div>
      )}

      {activeTab === "list" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-list">
          <ScrumListView projectId={projectId} />
        </div>
      )}

      {activeTab === "calendar" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-calendar">
          <ScrumCalendarView projectId={projectId} />
        </div>
      )}

      {activeTab === "summary" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-summary">
          <ScrumSummaryView projectId={projectId} />
        </div>
      )}

      {activeTab === "metrics" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-metrics">
          <ScrumMetricsView
            projectId={projectId}
            reportSprints={reportSprints}
            selectedSprintId={selectedSprintId}
            setSelectedSprintId={setSelectedSprintId}
            loadingSprints={loadingSprints}
            selectedSprint={selectedSprint}
            sprintOptions={sprintOptions}
            velocitySprints={velocitySprints}
            onToolbarAiInsights={handleToolbarAiInsights}
          />
        </div>
      )}

      {projectId && (
        <PlutoMetricsInsightDrawer
          open={insightOpen}
          onOpenChange={setInsightOpen}
          projectId={projectId}
          projectName={projectName}
          sections={insightSections}
          loading={insightLoading}
          error={insightError}
          onRetry={requestInsights}
          showFab={activeTab === 'metrics'}
        />
      )}

      {projectId && (
        <PlutoPlanMyTaskDrawer
          open={planOpen}
          onOpenChange={setPlanOpen}
          projectId={projectId}
          projectName={projectName}
          sections={planSections}
          loading={planLoading}
          error={planError}
          onRetry={fetchPlan}
          showFab={activeTab === 'board'}
        />
      )}
    </div>
  );
}
