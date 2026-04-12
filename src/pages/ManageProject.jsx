import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../components/Header';
import ProjectDetailsCard from '../components/ProjectDetailsCard';
import ChatBox from '../components/ChatBox';
import KanbanBoard from '../components/KanbanBoard';
import IssueListView from '../components/IssueListView';
import CalendarView from '../components/CalendarView';
import ProjectSummary from '../components/ProjectSummary';
import KanbanMetrics from '../components/KanbanMetrics';
import ScrumProjectWorkspace from '../components/scrum/ScrumProjectWorkspace';
import { fetchProjectById } from '../store/projectSlice';
import { fetchIssuesByProject, clearIssues, selectAllIssuesRaw } from '../store/issueSlice';
import { fetchChatMessages } from '../store/chatSlice';
import ApiService from '../services/ApiService';
import CustomApiError from '../services/CustomApiError';
import { buildKanbanInsightsStaleKey } from '../utils/kanbanInsightsStaleKey';

const KANBAN_WORKSPACE_TABS = [
  { id: 'board', label: 'Board' },
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'summary', label: 'Summary' },
  { id: 'metrics', label: 'Metrics' },
];

export default function ManageProject() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('board');
  const { currentProject, loading: projectLoading, error: projectError } = useSelector(state => state.project);
  const { loading: issuesLoading, error: issuesError, currentProjectId } = useSelector(state => state.issues);
  const { loading: chatLoading } = useSelector(state => state.chat);
  const issues = useSelector(selectAllIssuesRaw);

  const [kanbanMetricsTimeRange, setKanbanMetricsTimeRange] = useState('LAST_7_DAYS');
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightSections, setInsightSections] = useState(null);
  const [insightError, setInsightError] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const insightsStaleKey = useMemo(
    () =>
      buildKanbanInsightsStaleKey({
        projectId,
        timeRange: kanbanMetricsTimeRange,
        issues,
      }),
    [projectId, kanbanMetricsTimeRange, issues]
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

  const requestInsights = useCallback(async () => {
    if (!projectId || insightInFlight.current) return;
    insightInFlight.current = true;
    const keyAtStart = staleKeyRef.current;
    setInsightLoading(true);
    setInsightError(null);
    setInsightSections(null);
    try {
      const res = await ApiService.post('/api/ai/metrics-insights', {
        projectId: Number(projectId),
        framework: 'KANBAN',
        timeRange: kanbanMetricsTimeRange,
      });
      if (staleKeyRef.current !== keyAtStart) {
        return;
      }
      const parsed = res?.data?.parsedInsights?.sections;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setInsightSections(parsed);
      } else {
        setInsightError('No structured insights were returned. Try again.');
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
            : 'Could not load insights.';
      setInsightError(msg);
    } finally {
      insightInFlight.current = false;
      setInsightLoading(false);
    }
  }, [projectId, kanbanMetricsTimeRange]);

  const handleKanbanToolbarAiInsights = useCallback(() => {
    setInsightOpen(true);
    void requestInsights();
  }, [requestInsights]);

  useEffect(() => {
    if (projectId) {
      // Clear previous issues when switching projects
      if (currentProjectId && currentProjectId !== projectId) {
        dispatch(clearIssues());
      }
      
      // Fetch project details, issues, and chat messages
      dispatch(fetchProjectById(projectId));
      dispatch(fetchIssuesByProject(projectId));
      dispatch(fetchChatMessages(projectId));
    }
  }, [dispatch, projectId, currentProjectId]);

  // Cleanup issues when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearIssues());
    };
  }, [dispatch]);

  if (projectLoading || issuesLoading || chatLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{projectError}</p>
            <button
              onClick={() => dispatch(fetchProjectById(projectId))}
              className="text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Project not found</p>
        </div>
      </div>
    );
  }

  const isScrumProject = currentProject.framework === 'SCRUM';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Section - Project Details and Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Project Details Card - Takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <ProjectDetailsCard project={currentProject} />
          </div>
          {/* Chat Box - Takes 1/3 width on large screens */}
          <div className="lg:col-span-1">
            <ChatBox projectId={projectId} />
          </div>
        </div>

        {/* Issues fetch error — only show for load-time failures, not mutation errors */}
        {issuesError &&
         issuesError !== 'No issues found for this project' &&
         !issuesError.toLowerCase().includes('update issue status') &&
         !issuesError.toLowerCase().includes('not authorized') &&
         !issuesError.toLowerCase().includes('failed to update') &&
         !issuesError.toLowerCase().includes('failed to delete') && (
          <div className="mb-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading issues
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {issuesError}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => dispatch(fetchIssuesByProject(projectId))}
                      className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isScrumProject ? (
          <ScrumProjectWorkspace projectId={projectId} />
        ) : (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4 border-b border-gray-200">
              <div className="flex gap-1">
                {KANBAN_WORKSPACE_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer
                      ${activeTab === id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'board'     && <KanbanBoard projectId={projectId} />}
            {activeTab === 'list'      && <IssueListView projectId={projectId} />}
            {activeTab === 'calendar'  && <CalendarView />}
            {activeTab === 'summary' && <ProjectSummary />}
            {activeTab === 'metrics' && (
              <KanbanMetrics
                projectId={projectId}
                projectName={currentProject.name}
                metricsTimeRange={kanbanMetricsTimeRange}
                onMetricsTimeRangeChange={setKanbanMetricsTimeRange}
                insightOpen={insightOpen}
                onInsightOpenChange={setInsightOpen}
                insightSections={insightSections}
                insightLoading={insightLoading}
                insightError={insightError}
                onRequestInsights={requestInsights}
                onToolbarAiInsights={handleKanbanToolbarAiInsights}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}