import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  Undo2, 
  Redo2, 
  Trash2, 
  Download, 
  Save, 
  X,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  Palette,
  Type,
  Square,
  Circle,
  ArrowRight,
  MousePointer2,
  Settings2,
  Brush,
  Paintbrush
} from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import { cn } from '../../utils/utils';
import { toast } from 'sonner';

interface DrawingCanvasProps {
  onSave: (imageBlob: Blob) => void;
  onClose: () => void;
  initialImage?: string;
}

interface Stroke {
  points: number[][];
  color: string;
  size: number;
  opacity: number;
  type: 'pen' | 'pencil' | 'marker' | 'brush' | 'highlighter';
}

const DrawingCanvas = ({ onSave, onClose, initialImage }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStroke, setCurrentStroke] = useState<number[][] | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [color, setColor] = useState('#3b82f6');
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(1);
  const [tool, setTool] = useState<'pen' | 'pencil' | 'marker' | 'brush' | 'highlighter' | 'eraser' | 'select'>('pen');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const colors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
  ];

  const presets = [
    { name: 'Sky Blue', color: '#3b82f6' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Violet', color: '#8b5cf6' },
  ];

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setStrokes(history[newIdx]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setStrokes([]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setStrokes(history[newIdx]);
    }
  }, [history, historyIndex]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    ctx.globalAlpha = stroke.opacity;
    ctx.fillStyle = stroke.color;
    
    let thinning = 0.5;
    let smoothing = 0.5;
    let streamline = 0.5;

    switch(stroke.type) {
      case 'pencil':
        thinning = 0.8;
        smoothing = 0.3;
        break;
      case 'brush':
        thinning = 0.2;
        smoothing = 0.7;
        break;
      case 'marker':
      case 'highlighter':
        thinning = 0;
        smoothing = 0.5;
        break;
    }

    const outlinePoints = getStroke(stroke.points, {
      size: stroke.size,
      thinning,
      smoothing,
      streamline,
    });

    const pathData = getSvgPathFromStroke(outlinePoints);
    const path = new Path2D(pathData);
    ctx.fill(path);
    ctx.globalAlpha = 1.0;
  }, []);

  const drawAll = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw initial image if exists
    if (initialImage) {
      const img = new Image();
      img.src = initialImage;
      img.onload = () => {
        const rect = canvas.getBoundingClientRect();
        const canvasW = canvas.width / window.devicePixelRatio;
        const canvasH = canvas.height / window.devicePixelRatio;
        
        const ratio = Math.min(canvasW / img.width, canvasH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (canvasW - w) / 2;
        const y = (canvasH - h) / 2;
        
        ctx.drawImage(img, x, y, w, h);
        strokes.forEach(s => drawStroke(ctx, s));
        if (currentStroke) {
          drawStroke(ctx, { points: currentStroke, color, size, opacity, type: tool as any });
        }
      };
    } else {
      strokes.forEach(s => drawStroke(ctx, s));
      if (currentStroke) {
        drawStroke(ctx, { points: currentStroke, color, size, opacity, type: tool as any });
      }
    }
  }, [strokes, currentStroke, initialImage, color, size, opacity, tool, drawStroke]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  // Initialize canvas size
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          drawAll();
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [drawAll]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === 'eraser') {
      const newStrokes = strokes.filter(s => {
        return !s.points.some(p => Math.hypot(p[0] - x, p[1] - y) < size * 3);
      });
      if (newStrokes.length !== strokes.length) {
        saveHistory(newStrokes);
        setStrokes(newStrokes);
      }
      return;
    }

    if (tool === 'select') return;

    setCurrentStroke([[x, y, e.pressure]]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStroke) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentStroke([...currentStroke, [x, y, e.pressure]]);
  };

  const handlePointerUp = () => {
    if (currentStroke) {
      const newStroke: Stroke = {
        points: currentStroke,
        color,
        size,
        opacity,
        type: (tool === 'eraser' || tool === 'select') ? 'pen' : tool
      };
      const newStrokes = [...strokes, newStroke];
      saveHistory(newStrokes);
      setStrokes(newStrokes);
      setCurrentStroke(null);
    }
  };

  const saveHistory = (newStrokes: Stroke[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStrokes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const clear = () => {
    if (confirm("Clear all drawings?")) {
      saveHistory([]);
      setStrokes([]);
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current || isSaving) return;
    setIsSaving(true);
    
    try {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvasRef.current.width;
      finalCanvas.height = canvasRef.current.height;
      const fctx = finalCanvas.getContext('2d');
      if (!fctx) throw new Error("Could not get context");
      
      // Background for export (white)
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      
      // Draw everything
      if (initialImage) {
        const img = new Image();
        img.src = initialImage;
        await new Promise((resolve) => {
          img.onload = () => {
            const canvasW = finalCanvas.width;
            const canvasH = finalCanvas.height;
            const ratio = Math.min(canvasW / img.width, canvasH / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const x = (canvasW - w) / 2;
            const y = (canvasH - h) / 2;
            fctx.drawImage(img, x, y, w, h);
            resolve(null);
          };
        });
      }

      // Draw strokes with scale correction
      fctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      fctx.lineCap = 'round';
      fctx.lineJoin = 'round';
      
      strokes.forEach(s => {
        drawStroke(fctx, s);
      });

      finalCanvas.toBlob((blob) => {
        if (blob) {
          onSave(blob);
          toast.success("Drawing saved to snippets");
        }
        setIsSaving(false);
      }, 'image/png', 0.9);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save drawing");
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col bg-neutral-950/95 backdrop-blur-3xl overflow-hidden font-['Poppins']"
    >
      {/* Canvas Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b dark:border-white/5 border-neutral-200 bg-black/20">
        <div className="flex items-center gap-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Paintbrush className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Studio</h2>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-none">Creative Canvas v2.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center bg-white/5 rounded-2xl p-1.5 border border-white/5">
             <button onClick={undo} disabled={historyIndex < 0} className="p-3 rounded-xl hover:bg-white/10 text-neutral-400 disabled:opacity-20 transition-all">
               <Undo2 className="h-5 w-5" />
             </button>
             <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-3 rounded-xl hover:bg-white/10 text-neutral-400 disabled:opacity-20 transition-all">
               <Redo2 className="h-5 w-5" />
             </button>
           </div>

           <div className="h-8 w-[1px] bg-white/10 mx-2" />

           <button 
             onClick={handleSave}
             disabled={isSaving}
             className={cn(
               "flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95 shadow-xl shadow-blue-500/20",
               isSaving && "opacity-50 cursor-not-allowed"
             )}
           >
             {isSaving ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-5 w-5" />}
             {isSaving ? "Saving..." : "Save Clip"}
           </button>

           <button 
             onClick={onClose}
             className="p-3 rounded-2xl bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-500 border border-white/5 transition-all"
           >
             <X className="h-6 w-6" />
           </button>
        </div>
      </header>

      <main className="flex-1 flex relative">
        {/* Apple-style Vertical Toolbar Dock */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2 p-3 rounded-[32px] bg-neutral-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
            <ToolButton active={tool === 'select'} onClick={() => { setTool('select'); }} icon={MousePointer2} label="Select" />
            <div className="h-[1px] bg-white/5 mx-2" />
            <ToolButton active={tool === 'pen'} onClick={() => { setTool('pen'); setOpacity(1); }} icon={Pencil} label="Pen" />
            <ToolButton active={tool === 'pencil'} onClick={() => { setTool('pencil'); setOpacity(0.8); }} icon={Pencil} label="Pencil" className="rotate-45" />
            <ToolButton active={tool === 'marker'} onClick={() => { setTool('marker'); setOpacity(0.6); }} icon={Brush} label="Marker" />
            <ToolButton active={tool === 'highlighter'} onClick={() => { setTool('highlighter'); setOpacity(0.4); }} icon={Highlighter} label="Glow" />
            <ToolButton active={tool === 'brush'} onClick={() => { setTool('brush'); setOpacity(0.9); }} icon={Paintbrush} label="Brush" />
            <div className="h-[1px] bg-white/5 mx-2" />
            <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={Eraser} label="Eraser" />
          </div>

          <div className="p-3 rounded-[32px] bg-neutral-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-4">
             <div className="flex flex-col items-center gap-4 py-2">
                <button onClick={() => setSize(s => Math.max(1, s - 1))} className="text-neutral-500 hover:text-white transition-colors">
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-1.5 h-32 bg-white/5 rounded-full relative overflow-hidden flex items-end">
                  <motion.div 
                    animate={{ height: `${(size / 50) * 100}%` }}
                    className="w-full bg-blue-500 rounded-full"
                  />
                </div>
                <button onClick={() => setSize(s => Math.min(50, s + 1))} className="text-neutral-500 hover:text-white transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
             </div>
             <div className="text-[9px] font-bold text-neutral-500 text-center uppercase tracking-widest">{size}px</div>
          </div>
        </motion.div>

        {/* Color Palette Bottom Dock */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-4 rounded-[40px] bg-neutral-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl"
        >
          <div className="flex items-center gap-2 px-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-10 w-10 rounded-full border-2 transition-all hover:scale-110 active:scale-90",
                  color === c ? "border-white scale-125 shadow-lg" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              >
                {color === c && <motion.div layoutId="color-ring" className="absolute inset-0 rounded-full border-2 border-white scale-110" />}
              </button>
            ))}
          </div>
          <div className="h-8 w-[1px] bg-white/10 mx-2" />
          <button onClick={clear} className="p-4 rounded-full hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-all">
            <Trash2 className="h-6 w-6" />
          </button>
        </motion.div>

        {/* Canvas Engine */}
        <div ref={containerRef} className="flex-1 cursor-crosshair relative bg-white">
          <canvas 
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="touch-none w-full h-full"
          />
          
          <AnimatePresence>
            {!strokes.length && !currentStroke && !initialImage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center space-y-4">
                  <Paintbrush className="h-16 w-16 text-neutral-200 mx-auto" />
                  <p className="text-neutral-400 font-bold uppercase tracking-[0.3em] text-[10px]">Start your masterpiece</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
};

const ToolButton = ({ active, onClick, icon: Icon, label, className }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "relative group flex flex-col items-center gap-2 p-4 rounded-[24px] transition-all duration-300",
      active ? "text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300",
      className
    )}
  >
    <div className="relative z-10">
      <Icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", active && "scale-110")} />
    </div>
    <span className={cn("text-[8px] font-bold uppercase tracking-widest leading-none transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
      {label}
    </span>
    {active && (
      <motion.div 
        layoutId="active-tool-bg"
        className="absolute inset-0 bg-blue-500 rounded-[24px] z-0"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
  </button>
);

function getSvgPathFromStroke(stroke: any) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc: any, [x0, y0]: any, i: any, arr: any) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

export default DrawingCanvas;
