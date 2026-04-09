import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { X, Calendar, Flag } from "lucide-react";
import { formatSmartTimestamp } from "../utils/dateUtils";
import { parseOccurredAt } from "../utils/activityDisplay";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";
import { issueApi } from "../services/issueApi";
import { getAvatarColor } from "../utils/avatarColor";
import { addComment, clearCommentsForIssue } from "../store/commentSlice";
import IssueActivitySection from "./issue/IssueActivitySection";
import { Send } from "lucide-react";

const PRIORITY_COLORS = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};

const STATUS_COLORS = {
  TO_DO: "bg-gray-100 text-gray-800 border-gray-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  DONE: "bg-green-100 text-green-800 border-green-200",
};

export default function IssueDetailModal({ showModal, setShowModal, issueId }) {
  const [issueDetail, setIssueDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState("");

  const [activityTab, setActivityTab] = useState("all");
  const [timelineItems, setTimelineItems] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(null);

  const dispatch = useDispatch();
  const { user } = useAuth();
  const commentSubmitting = useSelector((state) => state.comments.loading);

  const commentsEndRef = useRef(null);

  const timelineComments = useMemo(() => {
    const rows = timelineItems.filter((i) => i.kind === "comment");
    return [...rows].reverse();
  }, [timelineItems]);

  const fetchIssueDetail = useCallback(async () => {
    if (!issueId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await issueApi.getIssueDetailById(issueId);
      setIssueDetail(response);
    } catch (err) {
      console.error("Failed to fetch issue detail:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  const fetchTimeline = useCallback(async () => {
    if (!issueId) return;
    try {
      setTimelineLoading(true);
      setTimelineError(null);
      const data = await issueApi.getIssueTimeline(issueId, 200);
      setTimelineItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
      setTimelineError(err.message || "Failed to load activity");
      setTimelineItems([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (!showModal || !issueId) return;
    fetchIssueDetail();
    fetchTimeline();
  }, [showModal, issueId, fetchIssueDetail, fetchTimeline]);

  useEffect(() => {
    if (showModal && activityTab === "comments" && timelineComments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [timelineComments.length, showModal, activityTab]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await dispatch(
        addComment({ issueId, content: newComment.trim() })
      ).unwrap();
      setNewComment("");
      await fetchTimeline();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      return format(new Date(dateString + "T00:00:00"), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "";
    try {
      return format(new Date(dateTimeString), "MMM dd, yyyy h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const canComment = () => {
    if (!user || !issueDetail) return false;
    return (
      user.userId === issueDetail.assigneeId ||
      user.userId === issueDetail.createdById ||
      user.userId === issueDetail.projectOwnerId
    );
  };

  const getUserInitials = (userName) => {
    if (!userName) return "??";
    return userName
      .split(" ")
      .map((n) => n[0] || "")
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleClose = () => {
    if (issueId) dispatch(clearCommentsForIssue(issueId));
    setActivityTab("all");
    setShowModal(false);
  };

  /** Legacy rows may lack assignedBy; fall back to creator for display. */
  const assignedByDisplayName =
    issueDetail?.assignedByName || issueDetail?.createdByName || null;

  const isScrumProject = issueDetail?.projectFramework === "SCRUM";

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              Loading task details...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8 text-red-500">
              Error: {error}
            </div>
          ) : issueDetail ? (
            <div className="p-6 space-y-6">
              {/* Issue Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      #{issueDetail.id} {issueDetail.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority Level
                        </label>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                            PRIORITY_COLORS[issueDetail.priority]
                          }`}
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          {issueDetail.priority}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                            STATUS_COLORS[issueDetail.status]
                          }`}
                        >
                          {issueDetail.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {issueDetail.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-md">
                      {issueDetail.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  {/* Created By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created By
                    </label>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${getAvatarColor(issueDetail.createdByName)} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                        {getUserInitials(issueDetail.createdByName)}
                      </div>
                      <span className="text-gray-900">
                        {issueDetail.createdByName || "Unknown"}
                      </span>
                    </div>
                  </div>

                  {/* Assigned To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned To
                    </label>
                    {issueDetail.assigneeName ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${getAvatarColor(issueDetail.assigneeName)} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                          {getUserInitials(issueDetail.assigneeName)}
                        </div>
                        <span className="text-gray-900">
                          {issueDetail.assigneeName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-sm">Unassigned</span>
                    )}
                  </div>

                  {/* Assigned By (fallback to creator when assignedBy absent) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned By
                    </label>
                    {assignedByDisplayName ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${getAvatarColor(assignedByDisplayName)} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                          {getUserInitials(assignedByDisplayName)}
                        </div>
                        <span className="text-gray-900">
                          {assignedByDisplayName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </div>

                  {/* Project Owner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Owner
                    </label>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${getAvatarColor(issueDetail.projectOwnerName)} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                        {getUserInitials(issueDetail.projectOwnerName)}
                      </div>
                      <span className="text-gray-900">
                        {issueDetail.projectOwnerName || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Project */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project
                    </label>
                    <span className="text-gray-900">
                      {issueDetail.projectName || "Unknown"}
                    </span>
                  </div>

                  {/* Assigned Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Assigned Date
                    </label>
                    <span className="text-gray-900">
                      {formatDate(issueDetail.assignedDate)}
                    </span>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Due Date
                    </label>
                    <span className="text-gray-900">
                      {formatDate(issueDetail.dueDate)}
                    </span>
                  </div>

                  {/* Sprint — Scrum only; below Due Date, aligned with right column */}
                  {isScrumProject && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sprint
                      </label>
                      <span className="text-gray-900">
                        {issueDetail.sprintName || "Backlog"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Last Updated metadata — only shown after a post-creation update has occurred */}
              {issueDetail.lastUpdatedByName && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Updated By
                    </label>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 ${getAvatarColor(issueDetail.lastUpdatedByName)} text-white rounded-full flex items-center justify-center text-sm font-medium`}>
                        {getUserInitials(issueDetail.lastUpdatedByName)}
                      </div>
                      <span className="text-gray-900">{issueDetail.lastUpdatedByName}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Updated At
                    </label>
                    <span className="text-gray-900">
                      {formatSmartTimestamp(issueDetail.lastUpdatedAt)}
                    </span>
                  </div>
                </div>
              )}

              <IssueActivitySection
                activeTab={activityTab}
                onTabChange={setActivityTab}
                items={timelineItems}
                loading={timelineLoading}
                error={timelineError}
                onRetry={fetchTimeline}
                renderCommentsTab={() => (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">
                      {timelineComments.length} comment
                      {timelineComments.length !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                      {timelineLoading ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Loading comments…
                        </div>
                      ) : timelineComments.length > 0 ? (
                        timelineComments.map((row, idx) => {
                          const iso = parseOccurredAt(row.occurredAt);
                          return (
                            <div
                              key={row.commentId ?? `comment-${idx}`}
                              className="bg-gray-50 rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-6 h-6 ${getAvatarColor(row.commentAuthorName)} text-white rounded-full flex items-center justify-center text-xs font-medium`}
                                  >
                                    {getUserInitials(row.commentAuthorName)}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {row.commentAuthorName || "Unknown User"}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDateTime(iso)}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm">
                                {row.content || ""}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-gray-500 text-center py-4 text-sm">
                          No comments yet
                        </p>
                      )}
                      <div ref={commentsEndRef} />
                    </div>

                    {canComment() && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddComment()
                          }
                        />
                        <Button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || commentSubmitting}
                          className="px-4 py-2"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-white">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
