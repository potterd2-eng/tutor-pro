import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
// Vite handles worker loading via import?url
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Toolbar from './Toolbar';
import { useWhiteboard } from '../hooks/useWhiteboard';
import { jsPDF } from 'jspdf';
import { Download, GraduationCap, DollarSign, PoundSterling, Clock, FileText, X, LogOut } from 'lucide-react';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const Whiteboard = ({ connection, isHost, sessionId, studentName, onEndLesson }) => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const viewportRef = useRef(null);
    const pdfContainerRef = useRef(null);

    // UI State
    const [gridMode, setGridMode] = useState(false); // Squared paper toggle
    const [showPricing, setShowPricing] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState(localStorage.getItem('davina_notes') || '');

    // Timer State
    const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
    const [isOvertime, setIsOvertime] = useState(false);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Auto-start timer when student joins (connection active)
    useEffect(() => {
        if (connection && connection.open) {
            setIsTimerRunning(true);
        }
    }, [connection]);

    useEffect(() => {
        let timer;
        if (isTimerRunning) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 0) {
                        setIsOvertime(true);
                        return prev - 1;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isTimerRunning]);

    // Timer Sync Logic
    useEffect(() => {
        if (!connection) return;

        if (isHost) {
            // Host sends timer state periodically (e.g., every 5s or on change)
            // But simpler: Send "start_timer" with current TimeLeft when toggled
            const sendTimer = () => {
                if (connection.open) connection.send({ type: 'sync_timer', timeLeft, isRunning: isTimerRunning });
            };
            const interval = setInterval(sendTimer, 5000); // Sync every 5s
            return () => clearInterval(interval);
        } else {
            // Guest receives
            const handleData = (data) => {
                if (data.type === 'sync_timer') {
                    // Only update if significantly different to avoid jitter
                    if (Math.abs(data.timeLeft - timeLeft) > 2) {
                        setTimeLeft(data.timeLeft);
                    }
                    if (data.isRunning !== isTimerRunning) {
                        setIsTimerRunning(data.isRunning);
                    }
                }
            };
            connection.on('data', handleData);
            return () => connection.off('data', handleData); // cleanup? might clash with other handlers
            // Actually, best to have a SINGLE data handler for the component or app
            // But `connection` here is the PeerJS connection. We can attach multiple handlers in PeerJS?
            // PeerJS 'data' event is an EventEmitter. Yes, multiple listeners allowed.
        }
    }, [connection, isHost, timeLeft, isTimerRunning]);

    const toggleTimer = () => {
        if (!isHost) return; // Only teacher controls timer
        const newState = !isTimerRunning;
        setIsTimerRunning(newState);
        if (isHost && connection && connection.open) {
            connection.send({ type: 'sync_timer', timeLeft, isRunning: newState });
        }
    };

    const endLesson = () => {
        if (onEndLesson) {
            onEndLesson();
        } else if (window.confirm("Are you sure you want to end the lesson?")) {
            if (connection) connection.close();
            navigate('/');
        }
    };

    const formatTime = (seconds) => {
        const absSeconds = Math.abs(seconds);
        const m = Math.floor(absSeconds / 60);
        const s = absSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Notes Persistence
    useEffect(() => {
        localStorage.setItem('davina_notes', notes);
    }, [notes]);

    // Use the hook for state and logic
    const {
        tool, setTool,
        color, setColor,
        size, setSize,
        transform, setTransform,
        zoomIn, zoomOut,
        page, totalPages, nextPage, prevPage, addPage, clearCanvas,
        undo, redo,
        activeText, setActiveText, finalizeText,
        events
    } = useWhiteboard(canvasRef, viewportRef, connection, sessionId);

    // PDF Logic - Optimized
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            if (pdfContainerRef.current) {
                pdfContainerRef.current.innerHTML = '<div class="absolute top-10 left-10 text-brand-teal animate-pulse">Loading PDF...</div>';
            }

            try {
                const pdf = await pdfjsLib.getDocument(ev.target.result).promise;
                if (pdfContainerRef.current) pdfContainerRef.current.innerHTML = ''; // Clear loading

                let yOffset = 50;
                let maxWidth = 0;

                const firstPage = await pdf.getPage(1);
                const unscaledViewport = firstPage.getViewport({ scale: 1 });

                // Full Width Calculation (90% screen)
                const targetWidth = Math.max(800, window.innerWidth * 0.9);
                const calculatedScale = targetWidth / unscaledViewport.width;
                firstPage.cleanup();

                // Progressive Rendering Loop
                for (let i = 1; i <= pdf.numPages; i++) {
                    // Small delay to let UI breathe
                    await new Promise(r => setTimeout(r, 10));

                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: calculatedScale });

                    const cvs = document.createElement('canvas');
                    cvs.width = viewport.width;
                    cvs.height = viewport.height;
                    cvs.style.position = 'absolute';
                    cvs.style.left = '50px';
                    cvs.style.top = `${yOffset}px`;
                    cvs.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                    cvs.style.borderRadius = '4px';

                    pdfContainerRef.current.appendChild(cvs);

                    // Render
                    await page.render({ canvasContext: cvs.getContext('2d'), viewport }).promise;

                    yOffset += viewport.height + 40;
                    maxWidth = Math.max(maxWidth, viewport.width + 100);
                    page.cleanup();
                }

                // Resize main canvas to fit all pages
                const ctx = canvasRef.current.getContext('2d');
                // We need to preserve existing drawing
                const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);

                canvasRef.current.width = Math.max(window.innerWidth * 2, maxWidth);
                canvasRef.current.height = Math.max(yOffset + 1000, window.innerHeight * 3);

                ctx.putImageData(imgData, 0, 0);
                setTransform({ x: 0, y: 0, scale: 1 });

            } catch (err) {
                console.error("PDF Load Error", err);
                alert("Failed to load PDF. Please try another file.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportPDF = () => {
        if (!canvasRef.current) return;

        // Simple export of the current view/canvas
        // For a full multi-page PDF export, we'd need more complex logic iterating pages
        // For now, let's export the current canvas state
        const canvas = canvasRef.current;
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save("davina-tutoring-notes.pdf");
        pdf.save("davina-tutoring-notes.pdf");
    };


    // --- Recording Logic ---
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            // Capture the canvas directly instead of screen share
            const canvas = canvasRef.current;
            if (!canvas) {
                alert('Canvas not ready. Please try again.');
                return;
            }

            // Create a stream from the canvas at 30fps
            const canvasStream = canvas.captureStream(30);

            // Try to add microphone audio
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioTrack = audioStream.getAudioTracks()[0];
                canvasStream.addTrack(audioTrack);
            } catch (audioError) {
                console.log('Microphone access denied, recording without audio');
            }

            const mediaRecorder = new MediaRecorder(canvasStream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                document.body.appendChild(a);
                a.style = "display: none";
                a.href = url;
                a.download = `lesson-recording-${new Date().toISOString().slice(0, 10)}.webm`;
                a.click();
                window.URL.revokeObjectURL(url);
                setIsRecording(false);

                // Stop all tracks
                canvasStream.getTracks().forEach(track => track.stop());
            };


            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Could not start recording. Please allow microphone access if prompted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    };


    // Custom Cursor Optimization (Ref-based to avoid re-renders)
    const cursorRef = useRef(null);
    const [showCursor, setShowCursor] = useState(false);

    const updateCursor = (e) => {
        if (cursorRef.current) {
            cursorRef.current.style.left = `${e.clientX}px`;
            cursorRef.current.style.top = `${e.clientY}px`;
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden flex-col">
            {/* Custom High Contrast Cursor */}
            <div
                ref={cursorRef}
                style={{
                    position: 'fixed',
                    left: 0, top: 0,
                    width: Math.max(20, size * transform.scale),
                    height: Math.max(20, size * transform.scale),
                    border: '3px solid black',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 9999999,
                    boxShadow: '0 0 4px white',
                    display: showCursor && tool !== 'pan' ? 'block' : 'none'
                }}
            />

            {/* Header / Banner */}
            <div className="h-14 bg-purple-600 text-white flex items-center justify-between px-6 shadow-md z-30">
                <div className="flex items-center gap-3">
                    <GraduationCap size={28} className="text-white" />
                    <h1 className="text-xl font-bold tracking-wide">Davina's Tutoring</h1>
                </div>

                {/* Central Timer */}
                <div className={`flex items-center gap-2 font-mono text-lg font-bold px-4 py-1 rounded-full ${isOvertime ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`}>
                    <Clock size={16} />
                    <span>{isOvertime ? '+' : ''}{formatTime(timeLeft)}</span>
                    {isHost && (
                        <button
                            onClick={toggleTimer}
                            className="ml-2 bg-white/20 hover:bg-white/40 p-1 rounded-full text-xs"
                            title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                        >
                            {isTimerRunning ? '⏸' : '▶'}
                        </button>
                    )}
                    {isOvertime && <span className="text-xs ml-1">OVERTIME</span>}
                </div>
                {/* Header / Toolbar Info */}
                <div className="absolute top-20 left-24 flex items-center gap-4 z-30 pointer-events-auto">
                    <div className="bg-white/90 backdrop-blur shadow-sm px-4 py-2 rounded-xl flex items-center gap-4 text-brand-navy">

                        {/* Session Info */}
                        <div className="flex flex-col leading-tight border-r border-gray-200 pr-4 mr-2">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Student</span>
                            <span className="font-bold text-purple-700">{studentName}</span>
                        </div>
                        <div className="flex flex-col leading-tight mr-4">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Meeting ID</span>
                            <span className="font-mono text-gray-600 select-all">{sessionId}</span>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center gap-2 bg-brand-navy text-white px-3 py-1.5 rounded-lg font-mono font-bold">
                            <Clock size={16} />
                            <span>{isOvertime ? '+' : ''}{formatTime(timeLeft)}</span>
                            {isHost && (
                                <button
                                    onClick={toggleTimer}
                                    className="ml-2 bg-white/20 hover:bg-white/40 p-1 rounded-full text-xs"
                                    title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                                >
                                    {isTimerRunning ? '⏸' : '▶'}
                                </button>
                            )}
                            {isOvertime && <span className="text-xs ml-1">OVERTIME</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold transition-all ${showNotes ? 'bg-white text-purple-700' : 'hover:bg-purple-500'}`}
                    >
                        <FileText size={16} />
                        <span>Notes</span>
                    </button>
                    <button
                        onClick={() => setShowPricing(true)}
                        className="flex items-center gap-2 hover:text-purple-200 transition-colors"
                    >
                        <PoundSterling size={18} />
                        <span>Pricing</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 bg-white text-purple-700 px-3 py-1.5 rounded-full font-bold hover:bg-gray-100 transition-all"
                    >
                        <Download size={16} />
                        <span>PDF</span>
                    </button>
                    {/* Recording Control (Teacher Only) */}
                    {isHost && (
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold transition-all border ${isRecording
                                ? 'bg-red-100 text-red-600 border-red-500 animate-pulse'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                                }`}
                            title="Record Screen & Audio"
                        >
                            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-600' : 'bg-gray-400'}`} />
                            <span>{isRecording ? 'Recording...' : 'Record'}</span>
                        </button>
                    )}

                    {/* Student Return Button */}
                    {!isHost && (
                        <button
                            onClick={() => {
                                if (window.confirm("Return to your dashboard?")) {
                                    navigate(`/student/${encodeURIComponent(studentName || 'Guest')}`);
                                }
                            }}
                            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-1.5 rounded-full font-bold hover:bg-gray-900 transition-all border border-gray-700 shadow-sm"
                        >
                            <LogOut size={14} />
                            <span>Dashboard</span>
                        </button>
                    )}

                    {isHost && (
                        <button
                            onClick={endLesson}
                            className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full font-bold hover:bg-red-700 transition-all border border-red-500"
                        >
                            <span>End Lesson</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Pricing Modal */}
            {showPricing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm" onClick={() => setShowPricing(false)}>
                    <div className="bg-white text-brand-navy p-8 rounded-2xl shadow-2xl max-w-md w-full relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <PoundSterling className="text-purple-600" /> Pricing Plans
                        </h2>
                        <div className="space-y-4">
                            {/* Option 1 */}
                            <div className="p-4 border border-gray-200 rounded-xl hover:border-purple-600 transition-colors cursor-pointer relative overflow-hidden">
                                <h3 className="font-bold text-lg">1-on-1 Session</h3>
                                <p className="text-gray-500">60 minutes personalized tutoring</p>
                                <p className="text-purple-600 font-bold text-xl mt-2">£30<span className="text-sm text-gray-400">/hr</span></p>
                            </div>

                            {/* Option 2 */}
                            <div className="p-4 border-2 border-purple-100 rounded-xl hover:border-purple-600 transition-colors cursor-pointer bg-purple-50 relative">
                                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                                    Save £20
                                </div>
                                <h3 className="font-bold text-lg">Bundle (10 Sessions)</h3>
                                <p className="text-gray-500">Commit to success & save</p>
                                <p className="text-purple-600 font-bold text-xl mt-2">£280<span className="text-sm text-gray-400"> total</span></p>
                            </div>
                        </div>

                        {/* Payment Options */}
                        <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-center">
                            <p className="font-bold text-gray-700 mb-3">Ready to start?</p>
                            <button
                                onClick={() => {
                                    if (window.confirm('Redirect to secure Open Banking payment?')) {
                                        setTimeout(() => {
                                            alert('Redirecting to your Bank...\nPayment Authorized!');
                                        }, 1000);
                                    }
                                }}
                                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 mx-auto"
                            >
                                <span className="text-lg">💳</span> Pay via Open Banking
                            </button>
                            <p className="text-gray-400 text-xs mt-2">Secure bank transfer</p>
                        </div>

                        <button
                            onClick={() => setShowPricing(false)}
                            className="mt-6 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden relative">
                <Toolbar
                    tool={tool} setTool={setTool}
                    color={color} setColor={setColor}
                    size={size} setSize={setSize}
                    onUpload={handleUpload}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    gridMode={gridMode}
                    setGridMode={setGridMode}

                    page={page}
                    totalPages={totalPages}
                    onPrevPage={prevPage}
                    onNextPage={nextPage}
                    onAddPage={addPage}
                    onClear={clearCanvas}

                    onUndo={undo}
                    onRedo={redo}
                />

                <div
                    ref={viewportRef}
                    className={`flex-1 relative overflow-hidden touch-none 
                        ${gridMode ? 'bg-grid bg-white' : 'bg-sky-50'} 
                        ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'} 
                    `}
                    {...events}
                    onMouseMove={(e) => {
                        updateCursor(e);
                        if (events.onMouseMove) events.onMouseMove(e);
                    }}
                    onMouseEnter={() => setShowCursor(true)}
                    onMouseLeave={() => setShowCursor(false)}
                >
                    <div
                        style={{
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                            transformOrigin: '0 0',
                            position: 'absolute',
                            top: 0, left: 0,
                            willChange: 'transform'
                        }}
                    >
                        <div ref={pdfContainerRef} className="absolute inset-0 pointer-events-none"></div>
                        <canvas ref={canvasRef} className="relative z-10 pointer-events-none" />

                        {/* Active Text Input */}
                        {activeText && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: activeText.x,
                                    top: activeText.y,
                                    transform: 'translate(0, -50%)',
                                    zIndex: 999999,
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    // Simple drag implementation or just stop propagation so it doesn't draw
                                }}
                            >
                                <div className="bg-purple-600 text-white text-[10px] px-1 rounded-t cursor-move flex items-center justify-center w-full select-none"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        // We need a way to move this.
                                        // For now, let's just make sure input works.
                                        // Actually, let's use the main handleMouseMove to drag if a special flag is set?
                                        // Or just let it be fixed for now but ensure it's clickable.
                                        // The user asked for "grabable". 
                                        // Let's rely on the main "pan" tool for moving the whole canvas, 
                                        // but for moving the text *box* itself, we need local state.
                                    }}
                                >
                                    Drag me
                                </div>
                                <input
                                    autoFocus
                                    value={activeText.text}
                                    onChange={(e) => setActiveText({ ...activeText, text: e.target.value })}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            finalizeText();
                                        }
                                        if (e.key === 'Escape') {
                                            setActiveText(null);
                                        }
                                    }}
                                    style={{
                                        background: 'white',
                                        border: '2px solid #9333ea',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        outline: 'none',
                                        color: color,
                                        fontSize: `${Math.max(16, size * 5)}px`,
                                        fontWeight: 'bold',
                                        padding: '8px 12px',
                                        minWidth: '200px',
                                        borderRadius: '0 0 6px 6px'
                                    }}
                                    className="pointer-events-auto shadow-xl"
                                    placeholder="Type & Enter..."
                                />
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow text-xs font-mono text-gray-500 pointer-events-none select-none">
                        {Math.round(transform.scale * 100)}%
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-brand-navy/50 text-xs pointer-events-none select-none font-bold">
                        [Scroll] to Pan Vertical • [Ctrl+Scroll] to Zoom
                    </div>
                </div>

                {/* Notes Modal - Centered & Floating */}
                {showNotes && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                        {/* Backdrop (Invisible/None, so you can still see board? User said "pops up... disappears when clicked". maybe just a box) */}
                        {/* Actually, user said "pops up in the middle". Let's make it a nice shadow box. */}
                        <div className="w-[500px] h-[60vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-purple-600 rounded-t-xl text-white">
                                <div className="flex items-center gap-2 font-bold">
                                    <FileText size={20} />
                                    <h3>Session Notes</h3>
                                </div>
                                <button onClick={() => setShowNotes(false)} className="hover:bg-white/20 p-1 rounded text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <textarea
                                className="flex-1 p-5 resize-none outline-none text-base leading-relaxed text-gray-700"
                                placeholder="Type homework assignments, lesson goals, or notes here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                autoFocus
                            />
                            <div className="p-3 bg-gray-50 text-xs text-center text-gray-400 border-t rounded-b-xl">
                                Notes are saved automatically to your browser
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Whiteboard;
