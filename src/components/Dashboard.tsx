import React, { useState, useEffect } from 'react';
import { Project, Note, Checklist } from '../types';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { 
  FileText, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onNavigate: (view: string, projectId?: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<{ recentNotes: Note[], activeChecklists: Checklist[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (user) {
        // Fetch recent notes with project names
        const { data: recentNotes, error: notesError } = await supabase
          .from('notes')
          .select('*, projects(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch active checklists with project names and items
        const { data: activeChecklists, error: checklistsError } = await supabase
          .from('checklists')
          .select('*, projects(name), checklist_items(*)')
          .order('created_at', { ascending: false })
          .limit(3);

        if (notesError || checklistsError) {
          console.error('Error fetching dashboard data:', notesError || checklistsError);
        } else {
          setData({
            recentNotes: (recentNotes || []).map(n => ({ 
              ...n, 
              project_name: Array.isArray(n.projects) ? n.projects[0]?.name : n.projects?.name 
            })),
            activeChecklists: (activeChecklists || []).map(cl => ({ 
              ...cl, 
              project_name: Array.isArray(cl.projects) ? cl.projects[0]?.name : cl.projects?.name, 
              items: cl.checklist_items 
            }))
          });
        }
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Research Overview</h1>
        <p className="text-slate-500">Welcome back. Here's what's happening in your projects.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Notes */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-bottom border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                <h2 className="font-semibold">Recent Notes</h2>
              </div>
              <button 
                onClick={() => onNavigate('projects')}
                className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
              >
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {data?.recentNotes.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No notes yet. Start by creating a project.
                </div>
              ) : (
                data?.recentNotes.map(note => {
                  const getNotePreview = (content: string) => {
      try {
        if (content.startsWith('[') && content.endsWith(']')) {
          const blocks = JSON.parse(content);
          return blocks.map((b: any) => b.type === 'text' ? b.content : '[이미지]').join(' ');
        }
      } catch (e) {}
      return content.replace(/<[^>]*>/g, '');
    };

    return (
      <div 
        key={note.id} 
        className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group"
        onClick={() => onNavigate('project', note.project_id)}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded shrink-0 max-w-[200px] truncate">
            {note.project_name}
          </span>
          <span className="text-[10px] text-slate-400 font-mono ml-auto">{note.date}</span>
        </div>
        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
          {note.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
          {getNotePreview(note.content)}
        </p>
      </div>
    );
  })
)}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => onNavigate('calendar')}
              className="bg-indigo-600 text-white p-6 rounded-2xl shadow-sm hover:bg-indigo-700 transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <CalendarIcon size={32} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">Open Calendar</span>
            </button>
            <button 
              onClick={() => onNavigate('projects')}
              className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-indigo-300 transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <Plus size={32} className="text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-slate-900">New Project</span>
            </button>
          </div>
        </div>

        {/* Active Checklists */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckSquare className="text-emerald-600" size={20} />
              <h2 className="font-semibold">Active Checklists</h2>
            </div>
            <div className="space-y-6">
              {data?.activeChecklists.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No active checklists.
                </div>
              ) : (
                data?.activeChecklists.map(cl => {
                  const completed = cl.items.filter(i => i.completed).length;
                  const total = cl.items.length;
                  const progress = total > 0 ? (completed / total) * 100 : 0;
                  
                  return (
                    <div key={cl.id} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">{cl.title}</h3>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{cl.project_name}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{completed}/{total}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-indigo-400" />
              <h2 className="font-medium text-sm">오늘의 팁</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              캘린더를 활용하여 매일의 연구 성과를 추적해보세요. 노트가 작성된 날짜는 강조 표시되어 꾸준한 연구 습관을 유지하는 데 도움이 됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
