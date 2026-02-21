import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Image as ImageIcon, Maximize2 } from 'lucide-react';

interface Block {
  id: string;
  type: 'text' | 'image';
  content: string;
  width?: number;
}

interface RichNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
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
      className="w-full bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[2em] leading-relaxed text-slate-700 placeholder:text-slate-300 overflow-hidden"
      rows={1}
    />
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
            ) : (
              <div className="relative inline-block max-w-full" style={{ width: `${block.width}%` }}>
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
                {/* Resize Slider */}
                <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur p-2 rounded-lg border border-slate-100 shadow-sm">
                  <Maximize2 size={14} className="text-slate-400" />
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={block.width || 100} 
                    onChange={(e) => handleImageResize(block.id, parseInt(e.target.value))}
                    className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-[10px] font-mono text-slate-500 w-8">{block.width}%</span>
                </div>
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
      
      <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-4 text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} />
          <span>Drag & Drop or Paste images here</span>
        </div>
      </div>
    </div>
  );
};
