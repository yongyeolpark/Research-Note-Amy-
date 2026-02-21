import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Image as ImageIcon, Maximize2, Table as TableIcon, Plus, Minus } from 'lucide-react';

interface TableData {
  rows: string[][];
  colHeaders?: string[];
  rowHeaders?: string[];
}

interface Block {
  id: string;
  type: 'text' | 'image' | 'table';
  content: string;
  width?: number;
  tableData?: TableData;
}

interface RichNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const target = textareaRef.current;
    if (target) {
      target.style.height = 'auto';
      target.style.height = `${target.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className || "w-full bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[2em] leading-relaxed text-slate-700 placeholder:text-slate-300 overflow-hidden"}
      rows={1}
    />
  );
};

const TableBlock: React.FC<{
  data: TableData;
  onChange: (newData: TableData) => void;
}> = ({ data, onChange }) => {
  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = data.rows.map((row, rIdx) => 
      rIdx === rowIndex ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell) : row
    );
    onChange({ ...data, rows: newRows });
  };

  const updateColHeader = (colIndex: number, value: string) => {
    const newHeaders = [...(data.colHeaders || data.rows[0].map((_, i) => String.fromCharCode(65 + i)))];
    newHeaders[colIndex] = value;
    onChange({ ...data, colHeaders: newHeaders });
  };

  const updateRowHeader = (rowIndex: number, value: string) => {
    const newHeaders = [...(data.rowHeaders || data.rows.map((_, i) => (i + 1).toString()))];
    newHeaders[rowIndex] = value;
    onChange({ ...data, rowHeaders: newHeaders });
  };

  const addRow = () => {
    const colCount = data.rows[0]?.length || 1;
    const newRowHeaders = data.rowHeaders ? [...data.rowHeaders, (data.rows.length + 1).toString()] : undefined;
    onChange({ 
      ...data, 
      rows: [...data.rows, Array(colCount).fill('')],
      rowHeaders: newRowHeaders
    });
  };

  const removeRow = (index: number) => {
    if (data.rows.length > 1) {
      const newRowHeaders = data.rowHeaders ? data.rowHeaders.filter((_, i) => i !== index) : undefined;
      onChange({ 
        ...data, 
        rows: data.rows.filter((_, i) => i !== index),
        rowHeaders: newRowHeaders
      });
    }
  };

  const addColumn = () => {
    const newColHeaders = data.colHeaders ? [...data.colHeaders, String.fromCharCode(65 + data.rows[0].length)] : undefined;
    onChange({ 
      ...data, 
      rows: data.rows.map(row => [...row, '']),
      colHeaders: newColHeaders
    });
  };

  const removeColumn = (index: number) => {
    if (data.rows[0].length > 1) {
      const newColHeaders = data.colHeaders ? data.colHeaders.filter((_, i) => i !== index) : undefined;
      onChange({ 
        ...data, 
        rows: data.rows.map(row => row.filter((_, i) => i !== index)),
        colHeaders: newColHeaders
      });
    }
  };

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
      <table className="w-full border-collapse min-w-[400px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="w-10 p-2"></th>
            {data.rows[0].map((_, colIndex) => (
              <th key={colIndex} className="p-2 border-r border-slate-200 relative group/col">
                <div className="flex flex-col items-center gap-1">
                  <input 
                    type="text"
                    value={data.colHeaders?.[colIndex] || String.fromCharCode(65 + colIndex)}
                    onChange={(e) => updateColHeader(colIndex, e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  />
                  <button 
                    onClick={() => removeColumn(colIndex)}
                    className="opacity-0 group-hover/col:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-opacity"
                  >
                    <Minus size={10} />
                  </button>
                </div>
              </th>
            ))}
            <th className="w-10 p-2">
              <button onClick={addColumn} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                <Plus size={14} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100 last:border-0 group/row">
              <td className="p-2 bg-slate-50 border-r border-slate-200 text-center relative w-20">
                <input 
                  type="text"
                  value={data.rowHeaders?.[rowIndex] || (rowIndex + 1).toString()}
                  onChange={(e) => updateRowHeader(rowIndex, e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-center text-[10px] font-bold text-slate-400"
                />
                <button 
                  onClick={() => removeRow(rowIndex)}
                  className="absolute right-0 top-0 bottom-0 flex items-center justify-center opacity-0 group-hover/row:opacity-100 bg-slate-50 text-red-500 transition-opacity px-1"
                >
                  <Minus size={10} />
                </button>
              </td>
              {row.map((cell, colIndex) => (
                <td key={colIndex} className="p-0 border-r border-slate-100 last:border-r-0">
                  <AutoResizeTextarea 
                    value={cell}
                    onChange={(val) => updateCell(rowIndex, colIndex, val)}
                    className="w-full bg-transparent border-none focus:ring-0 p-3 text-sm text-slate-700 min-h-[3em]"
                  />
                </td>
              ))}
              <td className="w-10"></td>
            </tr>
          ))}
          <tr className="bg-slate-50/50">
            <td className="p-2 text-center">
              <button onClick={addRow} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                <Plus size={14} />
              </button>
            </td>
            <td colSpan={data.rows[0].length + 1}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({ value, onChange }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Initialize blocks from value
  useEffect(() => {
    try {
      if (value.startsWith('[') && value.endsWith(']')) {
        setBlocks(JSON.parse(value));
      } else {
        // Legacy plain text support
        setBlocks([{ id: 'initial', type: 'text', content: value }]);
      }
    } catch (e) {
      setBlocks([{ id: 'initial', type: 'text', content: value }]);
    }
  }, [value]);

  const updateBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  }, [onChange]);

  const handleTextChange = (id: string, content: string) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, content } : b);
    updateBlocks(newBlocks);
  };

  const handleImageResize = (id: string, width: number) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, width } : b);
    updateBlocks(newBlocks);
  };

  const handleTableChange = (id: string, tableData: TableData) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, tableData } : b);
    updateBlocks(newBlocks);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1 && blocks[0].type === 'text') {
      updateBlocks([{ id: Date.now().toString(), type: 'text', content: '' }]);
      return;
    }
    updateBlocks(blocks.filter(b => b.id !== id));
  };

  const addImageBlock = (src: string) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'image',
      content: src,
      width: 100 // Default 100%
    };
    
    updateBlocks([...blocks, newBlock, { id: (Date.now() + 1).toString(), type: 'text', content: '' }]);
  };

  const addTableBlock = () => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'table',
      content: '',
      tableData: {
        rows: [
          ['', '', ''],
          ['', '', '']
        ],
        colHeaders: ['A', 'B', 'C'],
        rowHeaders: ['1', '2']
      }
    };
    updateBlocks([...blocks, newBlock, { id: (Date.now() + 1).toString(), type: 'text', content: '' }]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              addImageBlock(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.indexOf('image') !== -1) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            addImageBlock(event.target.result as string);
          }
        };
        reader.readAsDataURL(files[i]);
      }
    }
  };

  return (
    <div 
      className="min-h-[400px] border border-slate-200 rounded-xl bg-white p-6 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="space-y-6">
        {blocks.map((block, index) => (
          <div key={block.id} className="relative group">
            {block.type === 'text' ? (
              <AutoResizeTextarea
                value={block.content}
                onChange={(val) => handleTextChange(block.id, val)}
                placeholder={index === 0 ? "Start typing your research findings..." : ""}
              />
            ) : block.type === 'image' ? (
              <div className="relative inline-block max-w-full" style={{ width: `${block.width}%` }}>
                {/* Resize Slider */}
                <div className="mb-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur p-2 rounded-lg border border-slate-100 shadow-sm w-64">
                  <Maximize2 size={14} className="text-slate-400 shrink-0" />
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={block.width || 100} 
                    onChange={(e) => handleImageResize(block.id, parseInt(e.target.value))}
                    className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-[10px] font-mono text-slate-500 w-8 shrink-0">{block.width}%</span>
                </div>
                <img 
                  src={block.content} 
                  alt="Research" 
                  className="rounded-lg border border-slate-200 shadow-sm w-full"
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeBlock(block.id)}
                    className="p-1.5 bg-red-600 text-white rounded-md shadow-lg hover:bg-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                {block.tableData && (
                  <TableBlock 
                    data={block.tableData} 
                    onChange={(newData) => handleTableChange(block.id, newData)} 
                  />
                )}
              </div>
            )}
            
            {blocks.length > 1 && (
              <button 
                onClick={() => removeBlock(block.id)}
                className="absolute -left-8 top-0 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-8 text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} />
          <span>Drag & Drop or Paste images</span>
        </div>
        <button 
          onClick={addTableBlock}
          className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
        >
          <TableIcon size={16} />
          <span>Insert Table</span>
        </button>
      </div>
    </div>
  );
};
