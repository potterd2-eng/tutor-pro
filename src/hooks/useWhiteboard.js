import React, { useRef, useState, useEffect } from 'react';

export const useWhiteboard = (canvasRef, viewportRef, connection, sessionId, studentName) => {
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#0B2545');
    const [size, setSize] = useState(3);
    const [isDragging, setIsDragging] = useState(false);

    // Page State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageTypes, setPageTypes] = useState([]); // 'whiteboard' | 'document' per page; synced with totalPages

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

    // Page Logic
    // Use sessionId to scope keys. If no sessionId (e.g. older version), fallback or use 'default'
    const scope = sessionId || 'default';
    const getKey = (p) => `tutor_wb_${scope}_p${p}`;
    const getKeyTypes = () => `tutor_wb_${scope}_pageTypes`;
    const getKeyDoc = (p) => `tutor_wb_${scope}_p${p}_doc`;

    const safeSetItem = React.useCallback((key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            if (e && e.name === 'QuotaExceededError') {
                try {
                    const keys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('tutor_wb_') && !k.startsWith(`tutor_wb_${scope}_`)) keys.push(k);
                    }
                    keys.slice(0, 20).forEach(k => localStorage.removeItem(k));
                    localStorage.setItem(key, value);
                } catch (_) {
                    // Skip save to avoid crashing; user can continue without persistence
                }
            } else {
                throw e;
            }
        }
    }, [scope]);

    const loadPage = React.useCallback((p) => {
        const ctx = ctxRef.current;
        if (!ctx || !canvasRef.current) return;
        try {
            const typesJson = localStorage.getItem(getKeyTypes());
            const types = typesJson ? JSON.parse(typesJson) : ['whiteboard'];
            if (types[p - 1] === 'document') {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                setHistory([]);
                setHistoryStep(-1);
                return;
            }
        } catch (_) {}
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
    }, [sessionId]);

    const studentScope = studentName ? `student_${String(studentName).replace(/\s+/g, '_')}` : null;

    const savePage = React.useCallback(() => {
        if (!canvasRef.current) return;
        try {
            const data = canvasRef.current.toDataURL();
            safeSetItem(getKey(page), data);
            safeSetItem(`tutor_wb_${scope}_total`, String(totalPages));
            if (studentScope) {
                safeSetItem(`tutor_wb_${studentScope}_p${page}`, data);
                safeSetItem(`tutor_wb_${studentScope}_total`, String(totalPages));
            }
        } catch (_) {}
    }, [page, totalPages, sessionId, studentScope, safeSetItem]);

    // History Logic
    const saveHistory = React.useCallback(() => {
        if (!canvasRef.current) return;
        const data = canvasRef.current.toDataURL();
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(data);
        if (newHistory.length > 20) newHistory.shift();
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
        savePage();
    }, [history, historyStep, savePage]);

    const undo = React.useCallback((broadcast = true) => {
        if (historyStep > 0) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            const img = new Image();
            img.onload = () => {
                const ctx = ctxRef.current;
                if (ctx && canvasRef.current) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.drawImage(img, 0, 0);
                    savePage();
                }
            };
            img.src = history[newStep];
            if (broadcast && connection && connection.open) connection.send({ type: 'undo' });
        }
    }, [history, historyStep, savePage, connection]);

    const redo = React.useCallback((broadcast = true) => {
        if (historyStep < history.length - 1) {
            const newStep = historyStep + 1;
            setHistoryStep(newStep);
            const img = new Image();
            img.onload = () => {
                const ctx = ctxRef.current;
                if (ctx && canvasRef.current) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.drawImage(img, 0, 0);
                    savePage();
                }
            };
            img.src = history[newStep];
            if (broadcast && connection && connection.open) connection.send({ type: 'redo' });
        }
    }, [history, historyStep, savePage, connection]);

    const changePage = React.useCallback((newPage, broadcast = true) => {
        const oldPage = page;
        if (newPage === oldPage) return;
        // Defer heavy savePage (toDataURL) so the click completes and UI can update; avoids blocking when PDF/canvas is large
        requestAnimationFrame(() => {
            if (canvasRef.current) {
                try {
                    const data = canvasRef.current.toDataURL();
                    safeSetItem(getKey(oldPage), data);
                    safeSetItem(`tutor_wb_${scope}_total`, String(totalPages));
                    if (studentScope) {
                        safeSetItem(`tutor_wb_${studentScope}_p${oldPage}`, data);
                        safeSetItem(`tutor_wb_${studentScope}_total`, String(totalPages));
                    }
                } catch (_) {}
            }
            setPage(newPage);
            loadPage(newPage);
            if (broadcast && connection && connection.open) {
                connection.send({ type: 'change_page', page: newPage });
            }
        });
    }, [page, loadPage, connection, sessionId, studentName, totalPages, safeSetItem]);

    const addPage = React.useCallback((choiceOrBroadcast = 'whiteboard', broadcastArg) => {
        const choice = (choiceOrBroadcast === 'whiteboard' || choiceOrBroadcast === 'document') ? choiceOrBroadcast : 'whiteboard';
        const broadcast = typeof choiceOrBroadcast === 'boolean' ? choiceOrBroadcast : (broadcastArg !== false);
        savePage();
        const newTotal = totalPages + 1;
        if (choice === 'document') {
            try { safeSetItem(getKeyDoc(newTotal), ''); } catch (_) {}
        }
        setPageTypes(prev => {
            const next = [...prev, choice];
            try { safeSetItem(getKeyTypes(), JSON.stringify(next)); } catch (_) {}
            return next;
        });
        safeSetItem(`tutor_wb_${scope}_total`, String(newTotal));
        if (studentScope) safeSetItem(`tutor_wb_${studentScope}_total`, String(newTotal));
        setTotalPages(newTotal);
        setPage(newTotal);
        loadPage(newTotal);
        if (broadcast && connection && connection.open) {
            connection.send({ type: 'add_page', pageType: choice });
        }
    }, [savePage, loadPage, totalPages, connection, safeSetItem, getKeyTypes, getKeyDoc, scope, studentScope]);

    const deletePage = React.useCallback((broadcast = true) => {
        if (totalPages <= 1) return;
        try { savePage(); } catch (_) {}
        const newTotal = totalPages - 1;
        const pageToDelete = page;
        setPageTypes(prev => {
            const next = prev.filter((_, i) => i !== pageToDelete - 1);
            try { safeSetItem(getKeyTypes(), JSON.stringify(next)); } catch (_) {}
            return next;
        });
        for (let p = pageToDelete; p < newTotal; p++) {
            const nextData = localStorage.getItem(getKey(p + 1));
            if (nextData) safeSetItem(getKey(p), nextData);
            else try { localStorage.removeItem(getKey(p)); } catch (_) {}
            const nextDoc = localStorage.getItem(getKeyDoc(p + 1));
            if (nextDoc != null) safeSetItem(getKeyDoc(p), nextDoc);
            else try { localStorage.removeItem(getKeyDoc(p)); } catch (_) {}
        }
        try { localStorage.removeItem(getKey(newTotal + 1)); localStorage.removeItem(getKeyDoc(newTotal + 1)); } catch (_) {}
        safeSetItem(`tutor_wb_${scope}_total`, String(newTotal));
        if (studentScope) {
            for (let p = pageToDelete; p < newTotal; p++) {
                const nextData = localStorage.getItem(`tutor_wb_${studentScope}_p${p + 1}`);
                if (nextData) safeSetItem(`tutor_wb_${studentScope}_p${p}`, nextData);
                else try { localStorage.removeItem(`tutor_wb_${studentScope}_p${p}`); } catch (_) {}
            }
            try { localStorage.removeItem(`tutor_wb_${studentScope}_p${newTotal + 1}`); } catch (_) {}
            safeSetItem(`tutor_wb_${studentScope}_total`, String(newTotal));
        }
        setTotalPages(newTotal);
        const newPage = pageToDelete > newTotal ? newTotal : pageToDelete;
        setPage(newPage);
        setTimeout(() => loadPage(newPage), 0);
        if (broadcast && connection && connection.open) {
            connection.send({ type: 'delete_page', deletedPage: pageToDelete });
        }
    }, [page, totalPages, savePage, loadPage, connection, sessionId, studentScope, safeSetItem, getKey, getKeyDoc, getKeyTypes, scope]);

    const nextPage = () => changePage(Math.min(totalPages, page + 1));
    const prevPage = () => changePage(Math.max(1, page - 1));

    const clearCanvas = React.useCallback((broadcast = true) => {
        const ctx = ctxRef.current;
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            saveHistory();
            if (broadcast && connection && connection.open) {
                connection.send({ type: 'clear_canvas' });
            }
        }
    }, [saveHistory, connection]);

    // Restore Total Pages and page types (and optionally copy from same-student previous session)
    useEffect(() => {
        if (!sessionId) return;
        const ensurePageTypes = (total) => {
            try {
                const raw = localStorage.getItem(getKeyTypes());
                let types = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(types) || types.length !== total) {
                    types = Array.from({ length: total }, (_, i) => types[i] || 'whiteboard');
                    safeSetItem(getKeyTypes(), JSON.stringify(types));
                }
                setPageTypes(types);
            } catch (_) {
                setPageTypes(Array.from({ length: total }, () => 'whiteboard'));
            }
        };
        try {
            const savedTotal = localStorage.getItem(`tutor_wb_${scope}_total`);
            if (savedTotal) {
                const total = parseInt(savedTotal) || 1;
                setTotalPages(total);
                ensurePageTypes(total);
                setPage(1);
                loadPage(1);
            } else if (studentScope) {
                const studentTotal = localStorage.getItem(`tutor_wb_${studentScope}_total`);
                if (studentTotal) {
                    const total = parseInt(studentTotal);
                    for (let p = 1; p <= total; p++) {
                        const data = localStorage.getItem(`tutor_wb_${studentScope}_p${p}`);
                        if (data) safeSetItem(getKey(p), data);
                    }
                    safeSetItem(`tutor_wb_${scope}_total`, studentTotal);
                    setTotalPages(total);
                    ensurePageTypes(total);
                    setPage(1);
                    loadPage(1);
                } else {
                    setTotalPages(1);
                    setPageTypes(['whiteboard']);
                    setPage(1);
                    clearCanvas(false);
                }
            } else {
                setTotalPages(1);
                setPageTypes(['whiteboard']);
                setPage(1);
                clearCanvas(false);
            }
        } catch (_) {
            setTotalPages(1);
            setPageTypes(['whiteboard']);
            setPage(1);
            loadPage(1);
        }
    }, [sessionId, studentScope, safeSetItem]); // Reload when session ID changes

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
            ctx.globalCompositeOperation = 'source-over';
            const hex = style.color.replace('#', '');
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = style.color;
        }

        ctx.beginPath();
        if (pts.length === 2) {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();
            if (style.isHighlighter) {
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            }
            return { p0: pts[0], p1: pts[1], p2: pts[1] };
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
        if (style.isHighlighter) {
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }
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
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = style.color;
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

        if (pts.length >= 2) {
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

    // Stable reference for external drawing to avoid dependency cycles and re-registration
    const handlersRef = useRef({ saveHistory, savePage, changePage, addPage, deletePage, clearCanvas, undo, redo });
    useEffect(() => {
        handlersRef.current = { saveHistory, savePage, changePage, addPage, deletePage, clearCanvas, undo, redo };
    }, [saveHistory, savePage, changePage, addPage, deletePage, clearCanvas, undo, redo]);

    useEffect(() => {
        const handleExternalDraw = (data) => {
            requestAnimationFrame(() => {
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
                        ctx.globalCompositeOperation = 'source-over';
                        const hex = (data.color || '#fef08a').replace('#', '');
                        const r = parseInt(hex.slice(0, 2), 16);
                        const g = parseInt(hex.slice(2, 4), 16);
                        const b = parseInt(hex.slice(4, 6), 16);
                        ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
                    } else {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = data.color;
                    }

                    ctx.beginPath();
                    ctx.moveTo(p0.x, p0.y);
                    ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
                    ctx.stroke();
                    ctx.restore();
                    handlersRef.current.savePage();
                }

                else if (data.type === 'draw_text') {
                    if (data.page !== undefined && data.page !== stateRef.current.page) return;
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = data.color;
                    ctx.font = `bold ${data.size * 5}px sans-serif`;
                    ctx.fillText(data.text, data.x, data.y);
                    ctx.restore();
                    handlersRef.current.saveHistory();
                }

                else if (data.type === 'change_page') {
                    handlersRef.current.changePage(data.page, false);
                }
                else if (data.type === 'add_page') {
                    handlersRef.current.addPage(data.pageType || 'whiteboard', false);
                }
                else if (data.type === 'delete_page') {
                    handlersRef.current.deletePage(false);
                }
                else if (data.type === 'clear_canvas') {
                    handlersRef.current.clearCanvas(false);
                }
                else if (data.type === 'undo') {
                    handlersRef.current.undo(false);
                }
                else if (data.type === 'redo') {
                    handlersRef.current.redo(false);
                }
            });
        };

        window.externalDraw = handleExternalDraw;

        return () => {
            if (window.externalDraw === handleExternalDraw) {
                window.externalDraw = null;
            }
        };
    }, []);

    const getPageType = (p) => (pageTypes[p - 1] || 'whiteboard');
    const getDocContent = (p) => localStorage.getItem(getKeyDoc(p)) || '';
    const setDocContent = (p, text) => {
        try { safeSetItem(getKeyDoc(p), text); } catch (_) {}
    };

    return {
        tool, setTool,
        color, setColor,
        size, setSize,
        transform, setTransform,
        zoomIn, zoomOut,

        page, totalPages, nextPage, prevPage, addPage, deletePage, clearCanvas,
        pageTypes, getPageType, getDocContent, setDocContent,

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
