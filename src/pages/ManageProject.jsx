import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../components/Header';
import ProjectDetailsCard from '../components/ProjectDetailsCard';
import ChatBox from '../components/ChatBox';
import KanbanBoard from '../components/KanbanBoard';
import { fetchProjectById } from '../store/projectSlice';
import { fetchIssuesByProject, clearIssues } from '../store/issueSlice';
import { fetchChatMessages } from '../store/chatSlice';

export default function ManageProject() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const { currentProject, loading: projectLoading, error: projectError } = useSelector(state => state.project);
  const { loading: issuesLoading, error: issuesError, currentProjectId } = useSelector(state => state.issues);
  const { loading: chatLoading } = useSelector(state => state.chat);

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

        {/* Issues Error Display - Only show if there's a real error loading issues, not drag-related errors */}
        {issuesError && 
         issuesError !== 'No issues found for this project' && 
         !issuesError.includes('update issue status') && (
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

        {/* Kanban Board Section */}
        <div className="mt-8">
          <KanbanBoard projectId={projectId} />
        </div>
      </div>
    </div>
  );
}