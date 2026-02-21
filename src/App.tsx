import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Projects } from './components/Projects';
import { ProjectView } from './components/ProjectView';
import { Calendar } from './components/Calendar';
import { 
  LayoutDashboard, 
  FolderRoot, 
  Calendar as CalendarIcon, 
  LogOut,
  Beaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, logout, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  if (loading) return null;
  if (!user) return <Auth />;

  const handleNavigate = (view: string, projectId?: number) => {
    setCurrentView(view);
    if (projectId) setSelectedProjectId(projectId);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Beaker size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Amy Note</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button 
            onClick={() => setCurrentView('projects')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentView === 'projects' || currentView === 'project' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <FolderRoot size={18} />
            Projects
          </button>
          <button 
            onClick={() => setCurrentView('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentView === 'calendar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <CalendarIcon size={18} />
            Calendar
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="px-4 py-3 mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">User</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto"
            >
              <Dashboard onNavigate={handleNavigate} />
            </motion.div>
          )}
          {currentView === 'projects' && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto"
            >
              <Projects onSelectProject={(id) => handleNavigate('project', id)} />
            </motion.div>
          )}
          {currentView === 'project' && selectedProjectId && (
            <motion.div 
              key="project"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <ProjectView 
                projectId={selectedProjectId} 
                onBack={() => setCurrentView('projects')} 
              />
            </motion.div>
          )}
          {currentView === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto"
            >
              <Calendar onSelectDate={(date) => {
                // For now, just a placeholder or we could navigate to a specific project search
                console.log('Selected date:', date);
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
