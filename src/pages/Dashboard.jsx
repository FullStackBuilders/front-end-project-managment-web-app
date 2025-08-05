import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { projectApi } from '../services/projectApi';
import { useAuth } from '../../src/context/AuthContext';
import Header from '../components/Header';
import FilterPanel from '../components/FilterPanel';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '@/components/CreateProjectModal';
import SearchBar from '../components/SearchBar';
import ProjectJoinSuccessModal from '../components/ProjectJoinSuccessModal';
import invitationApi from '../services/invitationApi';

export default function Dashboard() {
  const { user, getCurrentUserId } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState({
    myProjects: [],
    joinedProjects: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [joinedProjectName, setJoinedProjectName] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [searchName, setSearchName] = useState('');

  const getCurrentUserIdSafe = () => {
    if (user?.id) return user.id;
    if (getCurrentUserId) return getCurrentUserId();
    return null;
  };

  useEffect(() => {
    checkForInvitationSuccess();
  }, []);

  useEffect(() => {
    checkForPendingInvitations();
  }, []);

  const checkForInvitationSuccess = () => {
    const invitationAccepted = sessionStorage.getItem('invitationAccepted');
    const projectJoined = sessionStorage.getItem('projectJoined');

    if (invitationAccepted === 'true' && projectJoined) {
      setJoinedProjectName(projectJoined);
      setShowSuccessModal(true);
    }
  };

  const checkForPendingInvitations = async () => {
    const pendingInvitation = sessionStorage.getItem('pendingInvitation');
    
    if (pendingInvitation === 'true') {
      try {
        await invitationApi.processPendingInvitations();
        
        const projectName = sessionStorage.getItem('invitationProjectName');
        if (projectName) {
          setJoinedProjectName(projectName);
          setShowSuccessModal(true);
        }
        
        sessionStorage.removeItem('pendingInvitation');
        sessionStorage.removeItem('invitationToken');
        sessionStorage.removeItem('invitationProjectName');
        
        fetchProjects();
      } catch (err) {
        sessionStorage.removeItem('pendingInvitation');
        sessionStorage.removeItem('invitationToken');
        sessionStorage.removeItem('invitationProjectName');
      }
    }
  };

  const separateProjects = (allProjects) => {
    const currentUserId = getCurrentUserIdSafe();
    
    if (!currentUserId || !allProjects || allProjects.length === 0) {
      return { myProjects: [], joinedProjects: [] };
    }

    const myProjects = allProjects.filter(project => {
      const isOwner = project.owner && project.owner.id === currentUserId;
      return isOwner;
    });

    const joinedProjects = allProjects.filter(project => {
      const isNotOwner = !project.owner || project.owner.id !== currentUserId;
      const isMember = project.team && project.team.some(member => member.id === currentUserId);
      const isJoined = isNotOwner && isMember;
      return isJoined;
    });

    return { myProjects, joinedProjects };
  };

  const fetchProjects = async (category = '', tag = '') => {
    setLoading(true);
    try {
      const response = await projectApi.getAllProjects(category, tag);
      setProjects(response);
      
      const separated = separateProjects(response);
      setFilteredProjects(separated);
    } catch (err) {
      setError(err.message || 'Failed to fetch projects');
      setProjects([]);
      setFilteredProjects({ myProjects: [], joinedProjects: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUserId = getCurrentUserIdSafe();
    if (!currentUserId) {
      return;
    }

    const { myProjects, joinedProjects } = separateProjects(projects);
    
    const applyFilters = (projectList) => {
      let filtered = [...projectList];

      if (selectedCategory) {
        filtered = filtered.filter(project => project.category === selectedCategory);
      }

      if (searchTag) {
        filtered = filtered.filter(project =>
          project.tags?.some(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))
        );
      }

      if (searchName) {
        filtered = filtered.filter(project =>
          project.name.toLowerCase().includes(searchName.toLowerCase())
        );
      }

      return filtered;
    };

    const newFilteredProjects = {
      myProjects: applyFilters(myProjects),
      joinedProjects: applyFilters(joinedProjects)
    };

    setFilteredProjects(newFilteredProjects);
  }, [projects, selectedCategory, searchTag, searchName, user]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectCreated = () => {
    fetchProjects();
  };

  const handleProjectDelete = (deletedProjectId) => {
    setProjects(prev => prev.filter(project => project.id !== deletedProjectId));
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setJoinedProjectName('');
    fetchProjects();
  };

  const getTotalProjectCount = () => {
    return filteredProjects.myProjects.length + filteredProjects.joinedProjects.length;
  };

  const getOriginalTotalCount = () => {
    return projects.length;
  };

  const hasActiveFilters = () => {
    return selectedCategory || searchTag || searchName;
  };

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSearchTag('');
    setSearchName('');
  };

  const renderProjectSection = (title, projectList, emptyMessage) => {
    if (projectList.length === 0) {
      return null;
    }

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <span className="text-sm text-gray-500">
            {projectList.length} project{projectList.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectList.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onDelete={handleProjectDelete}
              currentUserId={getCurrentUserIdSafe()}
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onProjectCreated={handleProjectCreated} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading your projects...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onProjectCreated={handleProjectCreated} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchProjects()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onProjectCreated={handleProjectCreated} setShowModal={setShowModal} />
        <div className="flex flex-col items-center justify-center h-96">
          <div className="mb-6 text-center">
            <FolderOpen size={64} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              You don't have any projects yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start by creating your first project to begin organizing your work.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2" size="lg">
            <Plus size={20} />
            Create Your First Project
          </Button>
        </div>
        {showModal && (
          <CreateProjectModal
            showModal={showModal}
            setShowModal={setShowModal}
            onProjectCreated={handleProjectCreated}
          />
        )}
        <ProjectJoinSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          projectName={joinedProjectName}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <FilterPanel
          projects={projects}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchTag={searchTag}
          setSearchTag={setSearchTag}
        />

        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                  <p className="text-gray-600 mt-1">
                    {getTotalProjectCount()} of {getOriginalTotalCount()} project{getOriginalTotalCount() !== 1 ? 's' : ''}
                    {hasActiveFilters() && ' (filtered)'}
                  </p>
                </div>
                <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                  <Plus size={16} />
                  Create Project
                </Button>
              </div>
              
              <div className="flex justify-center">
                <SearchBar searchTerm={searchName} setSearchTerm={setSearchName} />
              </div>
            </div>

            {(selectedCategory || searchTag) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedCategory && (
                  <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    Category: {selectedCategory}
                    <button onClick={() => setSelectedCategory('')} className="text-blue-600 hover:text-blue-800 ml-1">×</button>
                  </div>
                )}
                {searchTag && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    Tag: {searchTag}
                    <button onClick={() => setSearchTag('')} className="text-green-600 hover:text-green-800 ml-1">×</button>
                  </div>
                )}
              </div>
            )}

            {getTotalProjectCount() > 0 ? (
              <div>
                {renderProjectSection(
                  "My Projects", 
                  filteredProjects.myProjects,
                  "You haven't created any projects yet."
                )}

                {renderProjectSection(
                  "Joined Projects", 
                  filteredProjects.joinedProjects,
                  "You haven't joined any projects yet."
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderOpen size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No projects found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or create a new project.</p>
                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showModal && (
        <CreateProjectModal
          showModal={showModal}
          setShowModal={setShowModal}
          onProjectCreated={handleProjectCreated}
        />
      )}
      <ProjectJoinSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        projectName={joinedProjectName}
      />
    </div>
  );
}