import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Image as ImageIcon, Maximize2, Table as TableIcon, Plus, Minus, BarChart2, LineChart as LineIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface TableData {
  rows: string[][];
  colHeaders?: string[];
  rowHeaders?: string[];
}

interface ChartData {
  type: 'line' | 'bar';
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data: { name: string; value: number }[];
}

interface Block {
  id: string;
  type: 'text' | 'image' | 'table' | 'chart';
  content: string;
  width?: number;
  tableData?: TableData;
  chartData?: ChartData;
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

const ChartBlock: React.FC<{
  data: ChartData;
  onChange: (newData: ChartData) => void;
}> = ({ data, onChange }) => {
  const updatePoint = (index: number, field: 'name' | 'value', value: string) => {
    const newData = [...data.data];
    if (field === 'value') {
      newData[index] = { ...newData[index], value: parseFloat(value) || 0 };
    } else {
      newData[index] = { ...newData[index], name: value };
    }
    onChange({ ...data, data: newData });
  };

  const addPoint = () => {
    onChange({ ...data, data: [...data.data, { name: `Point ${data.data.length + 1}`, value: 0 }] });
  };

  const removePoint = (index: number) => {
    if (data.data.length > 1) {
      onChange({ ...data, data: data.data.filter((_, i) => i !== index) });
    }
  };

  const toggleType = () => {
    onChange({ ...data, type: data.type === 'line' ? 'bar' : 'line' });
  };

  const updateTitle = (title: string) => {
    onChange({ ...data, title });
  };

  const updateAxisLabel = (axis: 'x' | 'y', label: string) => {
    if (axis === 'x') onChange({ ...data, xAxisLabel: label });
    else onChange({ ...data, yAxisLabel: label });
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 flex-1">
            <input 
              type="text"
              value={data.title || ''}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Chart Title"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none w-64"
            />
            <button 
              onClick={toggleType}
              className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {data.type === 'line' ? <LineIcon size={14} /> : <BarChart2 size={14} />}
              Switch to {data.type === 'line' ? 'Bar' : 'Line'}
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">X-Axis Label:</span>
            <input 
              type="text"
              value={data.xAxisLabel || ''}
              onChange={(e) => updateAxisLabel('x', e.target.value)}
              placeholder="e.g. Month"
              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Y-Axis Label:</span>
            <input 
              type="text"
              value={data.yAxisLabel || ''}
              onChange={(e) => updateAxisLabel('y', e.target.value)}
              placeholder="e.g. Revenue ($)"
              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-64 w-full mb-8">
          <ResponsiveContainer width="100%" height="100%">
            {data.type === 'line' ? (
              <LineChart data={data.data} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  tick={{ fill: '#64748b' }} 
                  label={{ value: data.xAxisLabel, position: 'insideBottom', offset: -15, fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                />
                <YAxis 
                  fontSize={12} 
                  tick={{ fill: '#64748b' }} 
                  label={{ value: data.yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : (
              <BarChart data={data.data} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  tick={{ fill: '#64748b' }} 
                  label={{ value: data.xAxisLabel, position: 'insideBottom', offset: -15, fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                />
                <YAxis 
                  fontSize={12} 
                  tick={{ fill: '#64748b' }} 
                  label={{ value: data.yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
            <span>Label</span>
            <span>Value</span>
          </div>
          {data.data.map((point, idx) => (
            <div key={idx} className="flex items-center gap-4 group">
              <input 
                type="text"
                value={point.name}
                onChange={(e) => updatePoint(idx, 'name', e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
              <input 
                type="number"
                value={point.value}
                onChange={(e) => updatePoint(idx, 'value', e.target.value)}
                className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
              <button 
                onClick={() => removePoint(idx)}
                className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Minus size={14} />
              </button>
            </div>
          ))}
          <button 
            onClick={addPoint}
            className="w-full py-2 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Add Data Point
          </button>
        </div>
      </div>
    </div>
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

  const handleChartChange = (id: string, chartData: ChartData) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, chartData } : b);
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

  const addChartBlock = () => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: 'chart',
      content: '',
      chartData: {
        type: 'line',
        title: 'New Research Chart',
        data: [
          { name: 'Jan', value: 400 },
          { name: 'Feb', value: 300 },
          { name: 'Mar', value: 600 }
        ]
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
            ) : block.type === 'table' ? (
              <div className="relative">
                {block.tableData && (
                  <TableBlock 
                    data={block.tableData} 
                    onChange={(newData) => handleTableChange(block.id, newData)} 
                  />
                )}
              </div>
            ) : (
              <div className="relative">
                {block.chartData && (
                  <ChartBlock 
                    data={block.chartData} 
                    onChange={(newData) => handleChartChange(block.id, newData)} 
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
        <button 
          onClick={addChartBlock}
          className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
        >
          <BarChart2 size={16} />
          <span>Insert Chart</span>
        </button>
      </div>
    </div>
  );
};
