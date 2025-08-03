import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Tag, FolderOpen, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SendInviteModal from './SendInviteModal';
import InviteStatusModal from './InviteStatusModal';
import ResendConfirmationModal from './ResendConfirmationModal';
import { emailInvitationApi } from '../services/emailInvitationApi';

export default function ProjectDetailsCard({ project }) {
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isStatusSuccess, setIsStatusSuccess] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendData, setResendData] = useState(null);

  const { user } = useAuth();

  if (!project) return null;

  const { name, description, category, tags = [], team = [], owner } = project;

  const displayedTags = showAllTags ? tags : tags.slice(0, 3);
  const hasMoreTags = tags.length > 3;

  const displayedMembers = showAllMembers ? team : team.slice(0, 4);
  const hasMoreMembers = team.length > 4;

  const isProjectOwner = user && owner && user.userId === owner.id;

  const handleInviteSent = (response) => {
    setIsStatusSuccess(true);
    setStatusMessage(response.message);
    setShowStatusModal(true);
  };

  const handleInviteError = (error) => {
    if (error.status === 409 && error.data?.details?.canResend) {
      setResendData({
        email: error.data.details.email,
        projectId: project.id,
      });
      setShowInviteModal(false);
      setShowResendModal(true);
    } else {
      setIsStatusSuccess(false);
      setStatusMessage(error.message || 'Something went wrong while sending invitation');
      setShowStatusModal(true);
    }
  };

  const handleResendConfirm = async () => {
    if (!resendData) return;

    try {
      const response = await emailInvitationApi.sendInvitation(
        resendData.email,
        resendData.projectId,
        true
      );
      setShowResendModal(false);
      setResendData(null);
      handleInviteSent(response);
    } catch (error) {
      setShowResendModal(false);
      setResendData(null);
      handleInviteError(error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-500">
              Created by {owner?.firstName} {owner?.lastName}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {description || 'No description provided'}
        </p>
      </div>

      {/* Category */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {category}
        </span>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Tags</h3>
            {hasMoreTags && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTags(!showAllTags)}
                className="text-xs text-primary hover:text-primary/80"
              >
                {showAllTags ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    View All ({tags.length})
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {displayedTags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      {team.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members ({team.length})
            </h3>
            <div className="flex items-center gap-2">
              {/* Add Member Button - Only show for project owner */}
              {isProjectOwner && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                  className="text-xs bg-primary text-white hover:bg-primary/90"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Add Member
                </Button>
              )}
              {hasMoreMembers && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  {showAllMembers ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      View All
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {displayedMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {member.firstName?.[0]}{member.lastName?.[0]}
                </div>
                
                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    {member.id === owner?.id && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Invite Modal */}
      <SendInviteModal
        showModal={showInviteModal}
        setShowModal={setShowInviteModal}
        projectId={project.id}
        onInviteSent={handleInviteSent}
        onInviteError={handleInviteError}
      />

      {/* Resend Modal */}
      <ResendConfirmationModal
        showModal={showResendModal}
        onClose={() => setShowResendModal(false)}
        email={resendData?.email}
        onConfirm={handleResendConfirm}
      />

      {/* Status Modal */}
      <InviteStatusModal
        show={showStatusModal}
        isSuccess={isStatusSuccess}
        message={statusMessage}
        onClose={() => setShowStatusModal(false)}
      />
    </div>
  );
}
