import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Folder, Trash2, ChevronRight, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProjectsProps {
  onSelectProject: (projectId: number | string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ onSelectProject }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [search, setSearch] = useState('');

  const fetchProjects = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching projects:', error);
        setError('Failed to load projects. Please check your database connection.');
      } else {
        setProjects(data || []);
      }
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('projects')
        .insert([{ user_id: user.id, name: newName, description: newDesc }]);
      
      if (!insertError) {
        setNewName('');
        setNewDesc('');
        setIsAdding(false);
        await fetchProjects();
      } else {
        console.error('Error adding project:', insertError);
        setError(insertError.message || 'Failed to create project. Make sure the table exists and RLS policies are set.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    
    setIsSubmitting(true);
    try {
      const { error: deleteError, count } = await supabase
        .from('projects')
        .delete({ count: 'exact' })
        .eq('id', deletingId);
      
      if (deleteError) {
        setError(`Delete failed: ${deleteError.message} (Code: ${deleteError.code})`);
      } else if (count === 0) {
        setError('Delete failed: No project found or permission denied. Please check your RLS policies.');
      } else {
        await fetchProjects();
        setDeletingId(null);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during deletion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Projects</h1>
          <p className="text-slate-500">Manage your research domains and experiments.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          New Project
        </button>
      </header>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex justify-between items-center shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">Error:</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 p-1">✕</button>
        </motion.div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setDeletingId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Project?</h2>
                <p className="text-slate-500 text-sm">
                  This action cannot be undone. All associated notes and checklists will be permanently removed.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  disabled={isSubmitting}
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredProjects.map(project => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                <Folder className="text-indigo-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">{project.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Created {new Date(project.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleDelete(project.id, e)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-dashed border-indigo-200 rounded-2xl p-6 flex flex-col"
          >
            <form onSubmit={handleAddProject} className="space-y-4">
              <input 
                autoFocus
                type="text"
                placeholder="Project Name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <textarea 
                placeholder="Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 h-24 resize-none"
              />
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setError(null);
                  }}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded border border-red-100">
                  {error}
                </p>
              )}
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};
