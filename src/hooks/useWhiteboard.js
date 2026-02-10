import { useRef, useState, useEffect } from 'react';

export const useWhiteboard = (canvasRef, viewportRef, connection, sessionId) => {
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#0B2545');
    const [size, setSize] = useState(3);
    const [isDragging, setIsDragging] = useState(false);

    // Page State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [transform, setTransform] = useState({ x: -200, y: -200, scale: 1 });

    // History State
    const [history, setHistory] = useState([]);
    const [historyStep, setHistoryStep] = useState(-1);

    // Text Overlay State
    const [activeText, setActiveText] = useState(null); // { x, y, text }

    const isDrawing = useRef(false);
    const points = useRef([]);
    const ctxRef = useRef(null);
    const rectRef = useRef(null);
    const stateRef = useRef({ tool, color, size, transform, page });
    const lastSendTime = useRef(0); // For throttling

    useEffect(() => {
        stateRef.current = { tool, color, size, transform, page };
    }, [tool, color, size, transform, page]);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = 2500;
            canvas.height = 2500;
            const ctx = canvas.getContext('2d', { alpha: true });
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctxRef.current = ctx;

            // Load initial page
            // We do this in the useEffect below that watches sessionId
            // loadPage(1);
        }

        const updateRect = () => {
            if (viewportRef.current) rectRef.current = viewportRef.current.getBoundingClientRect();
        };
        window.addEventListener('resize', updateRect);
        setTimeout(updateRect, 100);
        return () => window.removeEventListener('resize', updateRect);
    }, []);

    // History Logic
    const saveHistory = () => {
        if (!canvasRef.current) return;
        const data = canvasRef.current.toDataURL();
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(data);
        if (newHistory.length > 20) newHistory.shift();
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
        savePage();
    };

    const undo = (broadcast = true) => {
        if (historyStep > 0) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            const img = new Image();
            img.onload = () => {
                const ctx = ctxRef.current;
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
                savePage();
            };
            img.src = history[newStep];
            if (broadcast && connection && connection.open) connection.send({ type: 'undo' });
        }
    };

    const redo = (broadcast = true) => {
        if (historyStep < history.length - 1) {
            const newStep = historyStep + 1;
            setHistoryStep(newStep);
            const img = new Image();
            img.onload = () => {
                const ctx = ctxRef.current;
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0);
                savePage();
            };
            img.src = history[newStep];
            if (broadcast && connection && connection.open) connection.send({ type: 'redo' });
        }
    };

    // Page Logic
    // Use sessionId to scope keys. If no sessionId (e.g. older version), fallback or use 'default'
    const scope = sessionId || 'default';
    const getKey = (p) => `tutor_wb_${scope}_p${p}`;

    const savePage = () => {
        if (!canvasRef.current) return;
        localStorage.setItem(getKey(page), canvasRef.current.toDataURL());
        localStorage.setItem(`tutor_wb_${scope}_total`, totalPages);
    };

    const loadPage = (p) => {
        const ctx = ctxRef.current;
        if (!ctx || !canvasRef.current) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const saved = localStorage.getItem(getKey(p));
        if (saved) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                setHistory([saved]);
                setHistoryStep(0);
            };
            img.src = saved;
        } else {
            const blank = canvasRef.current.toDataURL();
            setHistory([blank]);
            setHistoryStep(0);
        }
    };

    const changePage = (newPage, broadcast = true) => {
        savePage();
        setPage(newPage);
        loadPage(newPage);
        if (broadcast && connection && connection.open) {
            connection.send({ type: 'change_page', page: newPage });
        }
    };

    const addPage = (broadcast = true) => {
        savePage();
        const newTotal = totalPages + 1;
        setTotalPages(newTotal);
        setPage(newTotal);
        loadPage(newTotal);
        if (broadcast && connection && connection.open) {
            connection.send({ type: 'add_page' }); // Receiver should just increment total and go to it
        }
    };

    const nextPage = () => changePage(Math.min(totalPages, page + 1));
    const prevPage = () => changePage(Math.max(1, page - 1));

    const clearCanvas = (broadcast = true) => {
        const ctx = ctxRef.current;
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            saveHistory();
            if (broadcast && connection && connection.open) {
                connection.send({ type: 'clear_canvas' });
            }
        }
    };

    // Restore Total Pages
    useEffect(() => {
        if (!sessionId) return; // Wait for session ID
        const savedTotal = localStorage.getItem(`tutor_wb_${scope}_total`);
        if (savedTotal) {
            const total = parseInt(savedTotal);
            setTotalPages(total);
            // Also explicitly load page 1 for this session
            loadPage(1);
        } else {
            // New session? Reset to 1
            setTotalPages(1);
            setPage(1);
            clearCanvas(false);
        }
    }, [sessionId]); // Reload when session ID changes

    // Text Finalization
    const finalizeText = () => {
        if (!activeText || !activeText.text.trim()) {
            setActiveText(null);
            return;
        }
        const ctx = ctxRef.current;
        if (ctx) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = stateRef.current.color;
            ctx.font = `bold ${stateRef.current.size * 5}px sans-serif`;
            ctx.fillText(activeText.text, activeText.x, activeText.y);
            saveHistory();

            if (connection && connection.open) {
                connection.send({
                    type: 'draw_text',
                    text: activeText.text,
                    x: activeText.x,
                    y: activeText.y,
                    color: stateRef.current.color,
                    size: stateRef.current.size,
                    page: stateRef.current.page
                });
            }
        }
        setActiveText(null);
    };

    // Drawing Helpers
    const getCoords = (e) => {
        if (!rectRef.current) rectRef.current = viewportRef.current.getBoundingClientRect();
        const rect = rectRef.current;
        const { x, y, scale } = stateRef.current.transform;
        return {
            x: (e.clientX - rect.left - x) / scale,
            y: (e.clientY - rect.top - y) / scale
        };
    };

    const drawCurve = (ctx, pts, style) => {
        if (pts.length < 2) return;
        ctx.lineWidth = style.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (style.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (style.isHighlighter) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.strokeStyle = style.color;
            ctx.globalAlpha = 0.5;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = style.color;
        }

        ctx.beginPath();
        if (pts.length === 2) {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();
            return;
        }
        const i = pts.length - 3;
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const p2 = pts[i + 2];
        const mid1x = (p0.x + p1.x) / 2;
        const mid1y = (p0.y + p1.y) / 2;
        const mid2x = (p1.x + p2.x) / 2;
        const mid2y = (p1.y + p2.y) / 2;
        ctx.moveTo(mid1x, mid1y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2x, mid2y);
        ctx.stroke();
        return { p0: { x: mid1x, y: mid1y }, p1, p2: { x: mid2x, y: mid2y } };
    };

    const handleMouseDown = (e) => {
        const { tool, color, size } = stateRef.current;

        // Finalize existing text on click
        if (activeText) {
            finalizeText();
            return;
        }

        const isSpacePan = e.buttons === 1 && document.body.style.cursor === 'grab';
        if (tool === 'pan' || e.button === 1 || isSpacePan) {
            setIsDragging(true);
            return;
        }

        // --- Text Tool Logic ---
        if (tool === 'text') {
            const pos = getCoords(e);
            console.log("Text Tool Clicked at:", pos);
            setActiveText({ x: pos.x, y: pos.y, text: '' });
            return;
        }

        isDrawing.current = true;
        const pos = getCoords(e);
        points.current = [pos];

        const ctx = ctxRef.current;
        const style = { color, size: tool === 'highlighter' ? size * 3 : size, isEraser: tool === 'eraser', isHighlighter: tool === 'highlighter' };

        if (style.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,1)';
        } else if (style.isHighlighter) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = style.color;
            ctx.globalAlpha = 0.5;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = style.color;
        }
        // Removed circle cursor - now uses default arrow cursor
        // ctx.beginPath();
        // ctx.arc(pos.x, pos.y, style.size / 2, 0, Math.PI * 2);
        // ctx.fill();
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const { movementX, movementY } = e;
            setTransform(t => ({ ...t, x: t.x + movementX, y: t.y + movementY }));
            return;
        }

        if (!isDrawing.current) return;

        const pos = getCoords(e);
        const pts = points.current;

        // Optimization: Reduce lag by ignoring small movements (< 5px)
        if (pts.length > 0) {
            const last = pts[pts.length - 1];
            const dist = Math.sqrt(Math.pow(pos.x - last.x, 2) + Math.pow(pos.y - last.y, 2));
            if (dist < 5) return;
        }

        points.current.push(pos);

        const ctx = ctxRef.current;
        const { tool, color, size } = stateRef.current;
        const style = { color, size: tool === 'highlighter' ? size * 3 : size, isHighlighter: tool === 'highlighter', isEraser: tool === 'eraser' };

        if (pts.length > 2) {
            const curve = drawCurve(ctx, pts, style);
            if (connection && connection.open && curve) {
                connection.send({
                    type: 'draw_curve',
                    pts: [curve.p0, curve.p1, curve.p2],
                    color: style.color,
                    size: style.size,
                    isHighlighter: style.isHighlighter,
                    isEraser: style.isEraser,
                    page: stateRef.current.page
                });
            }
        }
    };


    const handleMouseUp = () => {
        if (isDrawing.current) saveHistory();
        isDrawing.current = false;
        points.current = [];
        setIsDragging(false);
    };

    const handleWheel = (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            setTransform(t => ({ ...t, scale: Math.max(0.1, Math.min(5, t.scale + delta)) }));
        } else {
            setTransform(t => ({ ...t, y: t.y - e.deltaY }));
        }
    };

    const zoomIn = () => setTransform(t => ({ ...t, scale: Math.min(5, t.scale * 1.2) }));
    const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale / 1.2) }));

    useEffect(() => {
        window.externalDraw = (data) => {
            // Drawing logic
            const ctx = ctxRef.current;
            if (!ctx) return;

            if (data.type === 'draw_curve') {
                if (data.page !== undefined && data.page !== stateRef.current.page) return;
                const [p0, p1, p2] = data.pts;
                ctx.save();
                ctx.lineWidth = data.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (data.isEraser) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)';
                } else if (data.isHighlighter) {
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.strokeStyle = data.color;
                    ctx.globalAlpha = 0.5;
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = data.color;
                }

                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
                ctx.stroke();
                ctx.restore();

                // IMPORTANT: Save history state for undo/redo sync
                saveHistory();
            }

            // Text Logic
            else if (data.type === 'draw_text') {
                if (data.page !== undefined && data.page !== stateRef.current.page) return; // Only draw if on same page
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = data.color;
                ctx.font = `bold ${data.size * 5}px sans-serif`;
                ctx.fillText(data.text, data.x, data.y);
                ctx.restore();
                saveHistory();
            }

            // Sync Actions
            else if (data.type === 'change_page') {
                changePage(data.page, false);
            }
            else if (data.type === 'add_page') {
                addPage(false);
            }
            else if (data.type === 'clear_canvas') {
                clearCanvas(false);
            }
            else if (data.type === 'undo') {
                undo(false);
            }
            else if (data.type === 'redo') {
                redo(false);
            }
        };
    }, [page, totalPages, history, historyStep]); // Add dependencies needed for actions

    return {
        tool, setTool,
        color, setColor,
        size, setSize,
        transform, setTransform,
        zoomIn, zoomOut,

        page, totalPages, nextPage, prevPage, addPage, clearCanvas,

        undo, redo,

        // Text Overlay
        activeText, setActiveText, finalizeText,

        events: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
            onMouseLeave: handleMouseUp,
            onWheel: handleWheel
        }
    };
};
