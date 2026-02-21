import React, { useState, useEffect } from 'react';
import { Project, Note, Checklist } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  CheckSquare, 
  ArrowLeft, 
  Search, 
  Trash2, 
  Edit3,
  Check,
  X,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { RichNoteEditor } from './RichNoteEditor';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProjectViewProps {
  projectId: number | string;
  onBack: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ projectId, onBack }) => {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'checklists'>('notes');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [deletingChecklistId, setDeletingChecklistId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Note Editor State
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);

  // Checklist State
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemText, setNewItemText] = useState<{ [key: number]: string }>({});

  const fetchData = async () => {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    const { data: notesData } = await supabase
      .from('notes')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });
    
    const { data: checklistsData } = await supabase
      .from('checklists')
      .select('*, items:checklist_items(*)')
      .eq('project_id', projectId);
    
    setProject(projectData);
    setNotes(notesData || []);
    setChecklists(checklistsData || []);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleSaveNote = async () => {
    if (!editingNote?.title || !editingNote?.content) return;
    
    const isNew = !editingNote.id;
    const noteData = {
      title: editingNote.title,
      content: editingNote.content,
      project_id: projectId,
      date: editingNote.date || new Date().toISOString().split('T')[0]
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from('notes').insert([noteData]));
    } else {
      ({ error } = await supabase.from('notes').update(noteData).eq('id', editingNote.id));
    }
    
    if (!error) {
      setIsEditingNote(false);
      setEditingNote(null);
      setError(null);
      fetchData();
    } else {
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteNote = async (id: number) => {
    setError(null);
    setDeletingNoteId(id);
  };

  const confirmDeleteNote = async () => {
    if (!deletingNoteId) return;
    
    setIsSubmitting(true);
    try {
      const { error: deleteError, count } = await supabase
        .from('notes')
        .delete({ count: 'exact' })
        .eq('id', deletingNoteId);
      
      if (deleteError) {
        setError(`Note delete failed: ${deleteError.message} (Code: ${deleteError.code})`);
      } else if (count === 0) {
        setError('Note delete failed: Note not found or permission denied.');
      } else {
        setError(null);
        await fetchData();
        setDeletingNoteId(null);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during note deletion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle) return;
    const { error } = await supabase
      .from('checklists')
      .insert([{ project_id: projectId, title: newChecklistTitle }]);
    
    if (!error) {
      setNewChecklistTitle('');
      setIsAddingChecklist(false);
      setError(null);
      fetchData();
    }
  };

  const handleAddItem = async (checklistId: number) => {
    const text = newItemText[checklistId]?.trim();
    if (!text) return;

    // Check for duplicate items in this checklist
    const checklist = checklists.find(cl => cl.id === checklistId);
    if (checklist) {
      const isDuplicate = checklist.items.some(item => 
        item.text.toLowerCase() === text.toLowerCase()
      );
      
      if (isDuplicate) {
        setError(`'${text}' 항목이 이미 체크리스트에 존재합니다.`);
        return;
      }
    }

    const { error } = await supabase
      .from('checklist_items')
      .insert([{ checklist_id: checklistId, text }]);
    
    if (!error) {
      setNewItemText({ ...newItemText, [checklistId]: '' });
      setError(null);
      fetchData();
    } else {
      setError(`항목 추가 실패: ${error.message}`);
    }
  };

  const toggleItem = async (itemId: number, completed: number) => {
    const { error } = await supabase
      .from('checklist_items')
      .update({ completed: !completed })
      .eq('id', itemId);
    
    if (!error) fetchData();
  };

  const handleDeleteItem = async (itemId: number) => {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId);
    
    if (!error) {
      setError(null);
      fetchData();
    } else {
      setError(`Item delete failed: ${error.message}`);
    }
  };

  const handleDeleteChecklist = (checklistId: number) => {
    setDeletingChecklistId(checklistId);
  };

  const confirmDeleteChecklist = async () => {
    if (!deletingChecklistId) return;
    
    try {
      setIsSubmitting(true);
      
      // First delete all items in this checklist to avoid foreign key constraint errors
      const { error: itemsError } = await supabase
        .from('checklist_items')
        .delete()
        .eq('checklist_id', deletingChecklistId);

      if (itemsError) {
        throw new Error(`항목 삭제 실패: ${itemsError.message}`);
      }

      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', deletingChecklistId);
      
      if (error) {
        throw new Error(`체크리스트 삭제 실패: ${error.message}`);
      }

      await fetchData();
      setError(null);
      setDeletingChecklistId(null);
    } catch (err: any) {
      console.error('Delete checklist error:', err);
      setError(err.message || '체크리스트 삭제 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const searchLower = search.toLowerCase();
    const titleMatch = n.title.toLowerCase().includes(searchLower);
    
    let contentText = n.content;
    try {
      if (n.content.startsWith('[') && n.content.endsWith(']')) {
        const blocks = JSON.parse(n.content);
        contentText = blocks.map((b: any) => b.type === 'text' ? b.content : '').join(' ');
      }
    } catch (e) {}
    
    const contentMatch = contentText.toLowerCase().includes(searchLower);
    return titleMatch || contentMatch;
  });

  const renderNoteContent = (content: string) => {
    try {
      if (content.startsWith('[') && content.endsWith(']')) {
        const blocks = JSON.parse(content);
        return (
          <div className="space-y-6">
            {blocks.map((b: any, i: number) => (
              <div key={i}>
                {b.type === 'text' ? (
                  <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{b.content}</p>
                ) : (
                  <div 
                    className="relative bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shadow-sm mx-auto"
                    style={{ width: `${b.width || 100}%` }}
                  >
                    <img src={b.content} alt="Research" className="w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
    } catch (e) {}
    return <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{content}</p>;
  };

  const renderNoteSummary = (content: string) => {
    try {
      if (content.startsWith('[') && content.endsWith(']')) {
        const blocks = JSON.parse(content);
        const firstText = blocks.find((b: any) => b.type === 'text')?.content || '';
        const firstImage = blocks.find((b: any) => b.type === 'image')?.content;
        
        return (
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{firstText}</p>
            </div>
            {firstImage && (
              <div className="w-20 h-20 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <img src={firstImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        );
      }
    } catch (e) {}
    return <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{content}</p>;
  };

  const exportToPDF = async () => {
    if (notes.length === 0) {
      setError('No notes to export.');
      return;
    }

    setIsExporting(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '190mm'; // A4 width minus margins
    container.style.padding = '10px';
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.fontFamily = 'sans-serif';
    document.body.appendChild(container);

    try {
      // 1. Add Cover Page
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; height: 260mm; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 2px solid #4f46e5; border-radius: 12px;">
          <div style="font-size: 12px; color: #4f46e5; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; font-weight: bold;">Research Project Report</div>
          <h1 style="font-size: 48px; font-weight: 800; margin-bottom: 20px; color: #111827; line-height: 1.2;">${project.name}</h1>
          <div style="width: 60px; height: 4px; background: #4f46e5; margin: 20px auto;"></div>
          <p style="font-size: 18px; color: #4b5563; max-width: 80%; margin-bottom: 40px; line-height: 1.6;">${project.description || 'No description provided.'}</p>
          <div style="margin-top: auto; padding-top: 40px; border-top: 1px solid #e5e7eb; width: 100%;">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Researcher ID</div>
            <div style="font-size: 16px; color: #111827; font-weight: 600; font-family: monospace;">${user?.email || 'Unknown User'}</div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 20px;">Generated on ${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      `;

      const coverCanvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const coverImgData = coverCanvas.toDataURL('image/png');
      const imgWidth = pageWidth - (margin * 2);
      const coverImgHeight = (coverCanvas.height * imgWidth) / coverCanvas.width;
      
      pdf.addImage(coverImgData, 'PNG', margin, margin, imgWidth, coverImgHeight);

      // 2. Add Notes Pages
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        pdf.addPage();
        
        let noteHtml = `
          <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; background: white;">
            <div style="font-size: 10px; color: #666; margin-bottom: 10px; font-family: monospace;">${note.date}</div>
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #1a1a1a;">${note.title}</h1>
            <div style="display: flex; flex-direction: column; gap: 15px;">
        `;

        try {
          if (note.content.startsWith('[') && note.content.endsWith(']')) {
            const blocks = JSON.parse(note.content);
            blocks.forEach((block: any) => {
              if (block.type === 'text') {
                noteHtml += `<div style="font-size: 14px; line-height: 1.6; color: #333; white-space: pre-wrap;">${block.content}</div>`;
              } else {
                noteHtml += `
                  <div style="width: ${block.width || 100}%; margin: 10px 0;">
                    <img src="${block.content}" style="width: 100%; border-radius: 4px; border: 1px solid #eee;" />
                  </div>
                `;
              }
            });
          } else {
            noteHtml += `<div style="font-size: 14px; line-height: 1.6; color: #333; white-space: pre-wrap;">${note.content}</div>`;
          }
        } catch (e) {
          noteHtml += `<div style="font-size: 14px; line-height: 1.6; color: #333; white-space: pre-wrap;">${note.content}</div>`;
        }

        noteHtml += `</div></div>`;
        container.innerHTML = noteHtml;

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgWidth = pageWidth - (margin * 2);
        const pageContentHeight = pageHeight - (margin * 2);
        
        // Calculate how many pixels on the canvas correspond to one PDF page height
        const pxPerPage = (pageContentHeight * canvas.width) / imgWidth;
        
        let heightLeftPx = canvas.height;
        let sourceY = 0;
        let pageNum = 0;

        while (heightLeftPx > 0) {
          if (pageNum > 0) pdf.addPage();
          
          const currentSliceHeightPx = Math.min(heightLeftPx, pxPerPage);
          
          // Create a temporary canvas to hold only this page's slice
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = currentSliceHeightPx;
          const ctx = sliceCanvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(
              canvas,
              0, sourceY, canvas.width, currentSliceHeightPx, // Source rectangle
              0, 0, canvas.width, currentSliceHeightPx        // Destination rectangle
            );
            
            const sliceData = sliceCanvas.toDataURL('image/png');
            const sliceHeightMm = (currentSliceHeightPx * imgWidth) / canvas.width;
            
            pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceHeightMm);
          }
          
          sourceY += currentSliceHeightPx;
          heightLeftPx -= currentSliceHeightPx;
          pageNum++;
          
          if (pageNum > 20) break; // Safety limit
        }
      }

      pdf.save(`${project.name}_Research_Report.pdf`);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      setError(`Failed to export PDF: ${err.message || 'Unknown error'}. Check console for details.`);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setIsExporting(false);
    }
  };

  if (!project) return <div className="p-8">Loading project...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Project Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search in project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64"
            />
          </div>
          <button 
            onClick={() => {
              setIsEditingNote(true);
              setEditingNote({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
            }}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Note
          </button>
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Export PDF
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-8 bg-white border-b border-slate-200 flex gap-8">
        <button 
          onClick={() => {
            setActiveTab('notes');
            setError(null);
          }}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Amy Notes
        </button>
        <button 
          onClick={() => {
            setActiveTab('checklists');
            setError(null);
          }}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'checklists' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Checklists
        </button>
      </div>

      {error && (
        <div className="px-8 pt-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex justify-between items-center shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 p-1">✕</button>
          </motion.div>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'notes' ? (
            <motion.div 
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredNotes.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-400">
                  No notes found. Click "New Note" to begin recording your research.
                </div>
              ) : (
                filteredNotes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => setSelectedNote(note)}
                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{note.date}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNote(note);
                            setIsEditingNote(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{note.title}</h3>
                    <div className="text-sm text-slate-500 leading-relaxed">
                      {renderNoteSummary(note.content)}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="checklists"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {checklists.map(cl => {
                const completed = cl.items.filter(i => i.completed).length;
                const total = cl.items.length;
                const progress = total > 0 ? (completed / total) * 100 : 0;

                return (
                  <div key={cl.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-slate-900">{cl.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded">{completed}/{total}</span>
                        <button 
                          onClick={() => handleDeleteChecklist(cl.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Checklist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>

                    <div className="space-y-3 mb-6">
                      {cl.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleItem(item.id, item.completed)}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500'}`}
                            >
                              {item.completed && <Check size={12} />}
                            </button>
                            <span className={`text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                              {item.text}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Add item..."
                        value={newItemText[cl.id] || ''}
                        onChange={(e) => setNewItemText({ ...newItemText, [cl.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem(cl.id)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button 
                        onClick={() => handleAddItem(cl.id)}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {isAddingChecklist ? (
                <div className="bg-white border-2 border-dashed border-indigo-200 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">New Checklist</h3>
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Checklist Title (e.g. Lab Supplies)"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mb-4 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleAddChecklist}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      Create
                    </button>
                    <button 
                      onClick={() => setIsAddingChecklist(false)}
                      className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingChecklist(true)}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
                >
                  <Plus size={24} />
                  <span className="font-medium">Add Checklist</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Note Editor Modal */}
      <AnimatePresence>
        {isEditingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingNote(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-semibold text-slate-900">{editingNote?.id ? 'Edit Note' : 'New Amy Note'}</h2>
                <button onClick={() => setIsEditingNote(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Title</label>
                    <input 
                      type="text"
                      value={editingNote?.title || ''}
                      onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                      placeholder="Observation Title"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Date</label>
                    <input 
                      type="date"
                      value={editingNote?.date || ''}
                      onChange={(e) => setEditingNote({ ...editingNote, date: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Content & Images</label>
                  <RichNoteEditor 
                    value={editingNote?.content || ''}
                    onChange={(content) => setEditingNote({ ...editingNote, content })}
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setIsEditingNote(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSaveNote}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Detail View Modal */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNote(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedNote.title}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">{selectedNote.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingNote(selectedNote);
                      setIsEditingNote(true);
                      setSelectedNote(null);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit3 size={20} />
                  </button>
                  <button onClick={() => setSelectedNote(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="p-8 overflow-y-auto flex-1 bg-white">
                <div className="max-w-3xl mx-auto">
                  {renderNoteContent(selectedNote.content)}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center shrink-0">
                <button 
                  onClick={() => setSelectedNote(null)}
                  className="px-8 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingNoteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setDeletingNoteId(null)}
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
                <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Note?</h2>
                <p className="text-slate-500 text-sm">
                  This research note will be permanently deleted.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  disabled={isSubmitting}
                  onClick={() => setDeletingNoteId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={confirmDeleteNote}
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
      {/* Checklist Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingChecklistId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setDeletingChecklistId(null)}
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
                <h2 className="text-xl font-bold text-slate-900 mb-2">체크리스트 삭제</h2>
                <p className="text-slate-500 text-sm">
                  이 체크리스트와 모든 항목이 영구적으로 삭제됩니다. 정말 삭제하시겠습니까?
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  disabled={isSubmitting}
                  onClick={() => setDeletingChecklistId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={confirmDeleteChecklist}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : '삭제'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
