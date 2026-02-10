import React from 'react';
import { MousePointer2, Pen, Eraser, Move, Upload, Video, Mic, MicOff, VideoOff, Hand, Highlighter, ZoomIn, ZoomOut, Grid, Sun, Trash2, ChevronLeft, ChevronRight, Type, Undo, Redo } from 'lucide-react';

const Toolbar = ({
    tool, setTool,
    color, setColor,
    size, setSize,
    onUpload,
    onZoomIn, onZoomOut,
    gridMode, setGridMode,
    page, totalPages, onPrevPage, onNextPage, onAddPage, onClear,
    onUndo, onRedo
}) => {
    const tools = [
        { id: 'pan', icon: Hand, label: 'Hand (Grab)' },
        { id: 'pen', icon: Pen, label: 'Pen' },
        { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
        { id: 'text', icon: Type, label: 'Text Box' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'screenshare', icon: Video, label: 'Share Screen' },
    ];

    const colors = ['#0B2545', '#14B8A6', '#EF4444', '#F59E0B', '#10B981', '#FFFF00'];

    // Recording/Screen Sharing is now handled via Session -> VideoChat
    // but we can keep the UI state here for the button
    const [isSharing, setIsSharing] = React.useState(false);

    return (
        <div className="w-20 h-full bg-white border-r border-brand-light flex flex-col items-center py-2 gap-2 shadow-lg z-20 overflow-y-auto pb-20 scrollbar-none">
            {/* Tools */}
            <div className="flex flex-col gap-1 w-full px-2">
                {tools.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            if (t.id === 'screenshare') {
                                window.dispatchEvent(new CustomEvent('toggleScreenShare'));
                                setIsSharing(!isSharing);
                            } else {
                                setTool(t.id);
                                if (t.id === 'highlighter') setColor('#FFFF00');
                            }
                        }}
                        className={`w-10 h-10 min-w-0 min-h-0 tap-target-bypass rounded-lg transition-all flex items-center justify-center border-2 mx-auto ${t.id === 'screenshare' && isSharing ? 'bg-red-500 text-white border-red-600 ring-2 ring-red-200' :
                            tool === t.id
                                ? 'bg-purple-600 text-white border-purple-800 shadow-lg scale-110'
                                : 'bg-transparent text-gray-400 border-transparent hover:bg-purple-50 hover:text-purple-700'
                            } ${t.id === 'pan' ? 'ring-1 ring-black/5 outline outline-1 outline-black/20' : ''}`}
                        title={t.id === 'screenshare' ? (isSharing ? "Stop Sharing" : "Share Screen") : t.label}
                    >
                        {t.id === 'screenshare' && isSharing ? <VideoOff size={18} /> : <t.icon size={18} strokeWidth={tool === t.id ? 2.5 : 2} />}
                    </button>
                ))}
            </div>

            <div className="h-px w-10 bg-gray-200" />

            {/* Colors */}
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    {colors.slice(0, 3).map((c) => (
                        <button
                            key={c}
                            onClick={() => {
                                setColor(c);
                                if (tool === 'eraser') setTool('pen');
                            }}
                            className={`w-3 h-3 min-w-0 min-h-0 tap-target-bypass rounded-full transition-all border ${color === c && tool !== 'eraser' ? 'border-brand-navy scale-125' : 'border-transparent hover:scale-110'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <div className="flex gap-2">
                    {colors.slice(3).map((c) => (
                        <button
                            key={c}
                            onClick={() => {
                                setColor(c);
                                if (tool === 'eraser') setTool('pen');
                            }}
                            className={`w-3 h-3 min-w-0 min-h-0 tap-target-bypass rounded-full transition-all border ${color === c && tool !== 'eraser' ? 'border-brand-navy scale-125' : 'border-transparent hover:scale-110'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="h-px w-10 bg-gray-200" />

            {/* Size Slider - Moved Up & Made Horizontal-ish (Standard) */}
            <div className="flex flex-col items-center gap-1 w-full px-2">
                <span className="text-[10px] uppercase font-bold text-gray-400">Size</span>
                <input
                    type="range" min="1" max="40"
                    value={size} onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-teal"
                    title="Pen Size"
                />
                <span className="text-[10px] font-bold text-brand-navy">{size}px</span>
            </div>

            <div className="h-px w-10 bg-gray-200" />

            {/* Zoom & Grid Row (Compact) */}
            <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                    <button onClick={onZoomIn} className="w-8 h-8 min-w-0 min-h-0 tap-target-bypass text-gray-400 hover:text-brand-teal bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100" title="Zoom In"><ZoomIn size={16} /></button>
                    <button onClick={onZoomOut} className="w-8 h-8 min-w-0 min-h-0 tap-target-bypass text-gray-400 hover:text-brand-teal bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100" title="Zoom Out"><ZoomOut size={16} /></button>
                </div>
                <button
                    onClick={() => setGridMode(!gridMode)}
                    className={`w-[68px] h-8 min-w-0 min-h-0 tap-target-bypass flex items-center justify-center gap-2 transition-colors rounded-lg border text-[10px] font-bold ${gridMode ? 'bg-brand-teal text-white border-brand-teal' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                    title="Toggle Grid"
                >
                    <Grid size={16} /> Grid
                </button>
            </div>

            <div className="h-px w-10 bg-gray-200" />

            {/* Undo / Redo & Clear */}
            <div className="flex flex-col gap-1 items-center">
                <div className="flex gap-1">
                    <button onClick={onUndo} className="w-8 h-8 min-w-0 min-h-0 tap-target-bypass text-gray-500 hover:text-brand-navy hover:bg-gray-100 rounded-lg flex items-center justify-center border border-gray-100" title="Undo">
                        <Undo size={16} />
                    </button>
                    <button onClick={onRedo} className="w-8 h-8 min-w-0 min-h-0 tap-target-bypass text-gray-500 hover:text-brand-navy hover:bg-gray-100 rounded-lg flex items-center justify-center border border-gray-100" title="Redo">
                        <Redo size={16} />
                    </button>
                </div>
                <button onClick={onClear} className="w-[68px] h-8 min-w-0 min-h-0 tap-target-bypass text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1 border border-red-50 text-[10px] font-bold" title="Clear Page">
                    <Trash2 size={14} /> Clear
                </button>
            </div>

            <div className="h-px w-10 bg-gray-200" />

            {/* Horizontal Pagination */}
            <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                    <button onClick={onPrevPage} disabled={page === 1} className="w-6 h-6 min-w-0 min-h-0 tap-target-bypass flex items-center justify-center text-gray-400 hover:text-brand-navy disabled:opacity-30 rounded hover:bg-white" title="Previous Page">
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-[10px] font-bold text-gray-500 min-w-[32px] text-center">{page}/{totalPages}</span>
                    <button onClick={onNextPage} disabled={page === totalPages} className="w-6 h-6 min-w-0 min-h-0 tap-target-bypass flex items-center justify-center text-gray-400 hover:text-brand-navy disabled:opacity-30 rounded hover:bg-white" title="Next Page">
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div className="h-px w-12 bg-gray-200" />

            {/* Upload & Add Row (Wide Sidebar) */}
            <div className="mt-auto flex flex-col gap-1 pb-4">
                <button onClick={onAddPage} className="w-16 h-8 min-w-0 min-h-0 tap-target-bypass flex items-center justify-center gap-1 text-brand-teal border-2 border-brand-teal rounded-lg hover:bg-brand-teal hover:text-white transition-all font-bold text-xs" title="Add Page">
                    <span className="text-lg">+</span> Page
                </button>
                <label className="w-16 h-8 min-w-0 min-h-0 tap-target-bypass text-gray-500 hover:bg-brand-light hover:text-brand-navy rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 border border-gray-200" title="Upload Image/PDF">
                    <Upload size={14} /><span className="text-[10px] font-bold">File</span>
                    <input type="file" accept="application/pdf,image/*" className="hidden" onChange={onUpload} />
                </label>
            </div>
        </div>
    );
};

export default Toolbar;
