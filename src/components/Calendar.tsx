import React, { useState, useEffect } from 'react';
import { Note, Project } from '../types';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalendarProps {
  onSelectDate: (date: string) => void;
  onNavigate: (view: string, projectId?: number, tab?: 'notes' | 'checklists', noteId?: number) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ onSelectDate, onNavigate }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');

  useEffect(() => {
    if (user) {
      const fetchProjects = async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) console.error('Error fetching projects:', error);
        else setProjects(data || []);
      };
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (user && projects.length > 0) {
      const fetchAllNotes = async () => {
        const projectIds = projects.map(p => p.id);
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .in('project_id', projectIds);
        
        if (error) console.error('Error fetching all notes:', error);
        else setNotes(data || []);
      };
      fetchAllNotes();
    }
  }, [projects, user]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const getNotesForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return notes.filter(n => n.date === dateStr && (selectedProjectId === 'all' || n.project_id === selectedProjectId));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Lab Calendar</h1>
          <p className="text-slate-500">Track your daily activity and findings.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-sm border-none focus:ring-0 bg-transparent px-3 py-1 font-medium text-slate-600"
          >
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold min-w-32 text-center">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="h-32 border-b border-r border-slate-100 bg-slate-50/50" />;
            
            const dayNotes = getNotesForDate(day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div 
                key={day} 
                className={`h-32 border-b border-r border-slate-100 p-2 hover:bg-slate-50 transition-colors cursor-pointer group relative ${idx % 7 === 6 ? 'border-r-0' : ''}`}
                onClick={() => onSelectDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-500 group-hover:text-indigo-600'}`}>
                    {day}
                  </span>
                  {dayNotes.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayNotes.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      ))}
                      {dayNotes.length > 3 && <span className="text-[8px] text-slate-400">+{dayNotes.length - 3}</span>}
                    </div>
                  )}
                </div>
                
                <div className="mt-2 space-y-1 overflow-hidden">
                  {dayNotes.slice(0, 2).map(note => (
                    <div 
                      key={note.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('project', note.project_id, 'notes', note.id);
                      }}
                      className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded truncate border border-indigo-100 hover:bg-indigo-100 transition-colors"
                    >
                      {note.title}
                    </div>
                  ))}
                </div>

                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FileText size={14} className="text-slate-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
