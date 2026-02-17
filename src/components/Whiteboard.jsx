import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
// Vite handles worker loading via import?url
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Toolbar from './Toolbar';
import { useWhiteboard } from '../hooks/useWhiteboard';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, GraduationCap, Clock, FileText, X, LogOut } from 'lucide-react';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const Whiteboard = forwardRef(({ connection, isHost, sessionId, studentName, onEndLesson, showLessonTimer = true }, ref) => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const viewportRef = useRef(null);
    const pdfContainerRef = useRef(null);
    const textInputRef = useRef(null);

    // UI State
    const [gridMode, setGridMode] = useState(false); // Squared paper toggle
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
        page, totalPages, nextPage, prevPage, addPage, deletePage, clearCanvas,
        pageTypes, getPageType, getDocContent, setDocContent,
        undo, redo,
        activeText, setActiveText, finalizeText,
        events
    } = useWhiteboard(canvasRef, viewportRef, connection, sessionId, studentName);

    const [showAddPageMenu, setShowAddPageMenu] = useState(false);
    const [documentContent, setDocumentContent] = useState('');
    const docEditableRef = useRef(null);
    const isDocumentPage = getPageType(page) === 'document';

    useEffect(() => {
        if (!isDocumentPage) return;
        const raw = getDocContent(page) || '';
        setDocumentContent(raw);
        const t = setTimeout(() => {
            if (docEditableRef.current) docEditableRef.current.innerHTML = raw;
        }, 0);
        return () => clearTimeout(t);
    }, [page, isDocumentPage]);

    useEffect(() => {
        if (!isDocumentPage) return;
        const onSelectionChange = () => {
            const sel = document.getSelection();
            if (!docEditableRef.current || !sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            if (docEditableRef.current.contains(range.commonAncestorContainer)) {
                try {
                    savedDocSelectionRef.current = { range: range.cloneRange() };
                } catch (_) {}
            }
        };
        document.addEventListener('selectionchange', onSelectionChange);
        return () => document.removeEventListener('selectionchange', onSelectionChange);
    }, [isDocumentPage]);

    const savedDocSelectionRef = useRef(null);

    const applyDocFormat = (cmd, value) => {
        if (!docEditableRef.current) return;
        const el = docEditableRef.current;
        const savedRange = savedDocSelectionRef.current?.range;
        el.focus();
        const sel = document.getSelection();
        if (savedRange) {
            try {
                sel.removeAllRanges();
                sel.addRange(savedRange);
            } catch (_) {}
        }
        const s = document.getSelection();
        let r = s.rangeCount ? s.getRangeAt(0) : null;
        if (savedRange && (!r || r.collapsed)) {
            try {
                s.removeAllRanges();
                s.addRange(savedRange);
                r = s.rangeCount ? s.getRangeAt(0) : null;
            } catch (_) {}
        }
        if (!r && savedRange) r = savedRange;
        if (cmd === 'backColor') {
            if (value && value !== 'transparent') {
                const range = r && !r.collapsed ? r : null;
                if (range) {
                    try {
                        const span = document.createElement('span');
                        span.style.backgroundColor = value;
                        span.style.color = 'inherit';
                        span.style.padding = '0 1px';
                        try {
                            range.surroundContents(span);
                        } catch (_) {
                            const fragment = range.extractContents();
                            while (fragment.firstChild) span.appendChild(fragment.firstChild);
                            range.insertNode(span);
                        }
                    } catch (_) {}
                }
            } else {
                document.execCommand('removeFormat', false);
            }
        } else if (cmd === 'foreColor' && value) {
            const range = r && !r.collapsed ? r : null;
            if (!range) {
                document.execCommand('foreColor', false, value);
            } else {
                const fullLen = (el.innerText || '').trim().length;
                const selLen = (range.toString() || '').trim().length;
                const isFullContent = fullLen > 0 && selLen >= Math.max(1, fullLen - 2) ||
                    range.commonAncestorContainer === el ||
                    (range.startContainer === el && range.endContainer === el && range.startOffset === 0 && range.endOffset === el.childNodes.length);
                const setDescendantsColorInherit = (node) => {
                    try {
                        const all = node.querySelectorAll ? node.querySelectorAll('*') : [];
                        all.forEach((n) => { n.style.color = 'inherit'; });
                    } catch (_) {}
                };
                if (isFullContent) {
                    const wrapper = document.createElement('span');
                    wrapper.style.color = value;
                    while (el.firstChild) wrapper.appendChild(el.firstChild);
                    el.appendChild(wrapper);
                    setDescendantsColorInherit(wrapper);
                } else {
                    try {
                        const span = document.createElement('span');
                        span.style.color = value;
                        try {
                            range.surroundContents(span);
                        } catch (_) {
                            const fragment = range.extractContents();
                            while (fragment.firstChild) span.appendChild(fragment.firstChild);
                            range.insertNode(span);
                        }
                        setDescendantsColorInherit(span);
                    } catch (_) {
                        document.execCommand('foreColor', false, value);
                    }
                }
            }
        }
        try { setDocContent(page, el.innerHTML); } catch (_) {}
    };

    const saveDocSelection = () => {
        const sel = document.getSelection();
        if (!docEditableRef.current || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        if (docEditableRef.current.contains(range.commonAncestorContainer)) {
            savedDocSelectionRef.current = { range: range.cloneRange() };
        }
    };

    const handleDeletePage = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (totalPages <= 1) return;
        try {
            saveContainerToPage(page);
            const byPage = pdfByPageRef.current;
            for (let p = page; p < totalPages; p++) {
                byPage[p] = byPage[p + 1] || [];
            }
            delete byPage[totalPages];
            pdfByPageRef.current = { ...byPage };
        } catch (_) {}
        deletePage(true);
    };

    // Per-page PDF storage: each whiteboard page can have its own PDF; we swap DOM nodes on page change so adding a PDF on page 2 doesn't remove the one on page 1
    const pdfOnPageRef = useRef(1);
    const pdfByPageRef = useRef({});
    const saveContainerToPage = (pageNum) => {
        const container = pdfContainerRef.current;
        if (!container) return;
        const nodes = [];
        while (container.firstChild) nodes.push(container.removeChild(container.firstChild));
        pdfByPageRef.current[pageNum] = nodes;
    };
    const restoreContainerFromPage = (pageNum) => {
        const container = pdfContainerRef.current;
        if (!container) return;
        const nodes = pdfByPageRef.current[pageNum];
        if (nodes && nodes.length) nodes.forEach(n => container.appendChild(n));
    };
    useEffect(() => {
        const container = pdfContainerRef.current;
        if (!container) return;
        const oldPage = pdfOnPageRef.current;
        if (oldPage === page) return;
        saveContainerToPage(oldPage);
        pdfOnPageRef.current = page;
        restoreContainerFromPage(page);
    }, [page]);

    // Focus text input when text tool creates a new box so user can type immediately
    useEffect(() => {
        if (activeText) {
            const t = setTimeout(() => textInputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [activeText?.x, activeText?.y]);

    // Helper to generate IDs
    const uuid = () => Math.random().toString(36).substr(2, 9);

    // Chunking State
    const pdfChunksRef = useRef({}); // { [fileId]: { [index]: data, total: N, metadata: {...} } }

    // Recipient Logic for PDF Sync & Chunks
    useEffect(() => {
        if (!connection) return;

        const processChunk = (data) => {
            const { fileId, chunkIndex, totalChunks, chunkData, metadata } = data;

            if (!pdfChunksRef.current[fileId]) {
                pdfChunksRef.current[fileId] = { parts: new Array(totalChunks), count: 0, metadata };
            }

            const fileTransfer = pdfChunksRef.current[fileId];
            fileTransfer.parts[chunkIndex] = chunkData;
            fileTransfer.count++;

            if (fileTransfer.count === totalChunks) {
                // Reassembly
                const fullData = fileTransfer.parts.join('');
                delete pdfChunksRef.current[fileId]; // Cleanup

                if (metadata.type === 'pdf_page') {
                    renderRemotePDFPage(fullData, metadata);
                } else if (metadata.type === 'sync_pdf_page') {
                    const pageNum = metadata.pageNum != null ? parseInt(metadata.pageNum, 10) : 1;
                    if (!pdfByPageRef.current[pageNum]) pdfByPageRef.current[pageNum] = [];
                    const img = document.createElement('img');
                    img.src = fullData;
                    img.style.position = 'absolute';
                    img.style.top = `${metadata.y || 0}px`;
                    img.style.left = '50px';
                    img.style.width = `${metadata.width || 800}px`;
                    img.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                    img.style.borderRadius = '4px';
                    pdfByPageRef.current[pageNum].push(img);
                    const container = pdfContainerRef.current;
                    if (container) {
                        while (container.firstChild) container.removeChild(container.firstChild);
                        (pdfByPageRef.current[page] || []).forEach(n => container.appendChild(n));
                    }
                }
            }
        };

        const renderRemotePDFPage = (base64Image, meta) => {
            try {
                if (pdfContainerRef.current) {
                    const img = document.createElement('img');
                    img.src = base64Image;
                    img.style.position = 'absolute';
                    img.style.top = `${meta.y || 0}px`;
                    img.style.left = '50px';
                    img.style.width = `${meta.width || 800}px`;
                    img.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                    img.style.borderRadius = '4px';
                    pdfContainerRef.current.appendChild(img);
                }
            } catch (err) {
                console.error("Error rendering remote PDF page:", err);
            }
        };

        const handleData = (data) => {
            if (data.type === 'file_chunk') {
                processChunk(data);
            } else if (data.type === 'clear_pdf') {
                if (pdfContainerRef.current) pdfContainerRef.current.innerHTML = '';
                pdfByPageRef.current = {};
            }
            // Legacy handling or small messages can go here
        };

        connection.on('data', handleData);
        return () => connection.off('data', handleData);
    }, [connection, page]);

    // Host: when peer joins (or reconnects after refresh), send all current PDF pages
    const sendAllPdfPagesRef = useRef(null);
    useEffect(() => {
        if (!connection || !isHost) return;
        const sendAllPdfPages = async () => {
            const byPage = pdfByPageRef.current;
            for (const [pageNum, nodes] of Object.entries(byPage)) {
                if (!Array.isArray(nodes) || nodes.length === 0) continue;
                for (const node of nodes) {
                    try {
                        let dataUrl;
                        if (node.tagName === 'CANVAS') dataUrl = node.toDataURL('image/png');
                        else if (node.tagName === 'IMG' && node.src) dataUrl = node.src;
                        if (dataUrl && connection.open) await sendLargeData('sync_pdf_page', dataUrl, { pageNum: parseInt(pageNum, 10), y: parseInt(node.style?.top, 10) || 0, width: node.width || node.offsetWidth || 800, height: node.height || node.offsetHeight || 600 });
                    } catch (_) {}
                }
            }
        };
        sendAllPdfPagesRef.current = sendAllPdfPages;
        const onOpen = () => setTimeout(sendAllPdfPages, 800);
        if (connection.open) onOpen();
        connection.on('open', onOpen);
        return () => { connection.off('open', onOpen); };
    }, [connection, isHost]);

    // Host: respond to student request for PDF sync (e.g. after student refresh)
    useEffect(() => {
        if (!connection || !isHost) return;
        const onData = (data) => {
            if (data.type === 'request_pdf_sync' && sendAllPdfPagesRef.current) setTimeout(sendAllPdfPagesRef.current, 300);
        };
        connection.on('data', onData);
        return () => connection.off('data', onData);
    }, [connection, isHost]);

    // Student: when connection is open, request PDF sync from host so PDF persists after refresh
    useEffect(() => {
        if (!connection || isHost || !connection.open) return;
        const t = setTimeout(() => {
            if (connection.open) connection.send({ type: 'request_pdf_sync' });
        }, 1200);
        return () => clearTimeout(t);
    }, [connection, isHost, connection?.open]);

    const sendLargeData = async (type, payload, metadata = {}) => {
        if (!connection || !connection.open) return;

        const fileId = uuid();
        const jsonString = JSON.stringify(payload); // Actually payload is likely the base64 string itself
        // If payload is base64 string
        const dataString = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const CHUNK_SIZE = 16000; // Safe limit
        const totalChunks = Math.ceil(dataString.length / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
            const chunk = dataString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            connection.send({
                type: 'file_chunk',
                fileId,
                chunkIndex: i,
                totalChunks,
                chunkData: chunk,
                metadata: { ...metadata, type }
            });
            // Small delay to prevent flood
            await new Promise(r => setTimeout(r, 5));
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        saveContainerToPage(pdfOnPageRef.current);
        pdfOnPageRef.current = page;

        // Broadcast Clear
        if (connection && connection.open) {
            connection.send({ type: 'clear_pdf' });
        }

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

                    await page.render({ canvasContext: cvs.getContext('2d'), viewport }).promise;

                    // Broadcast Page via Chunks
                    if (connection && connection.open) {
                        const dataUrl = cvs.toDataURL('image/jpeg', 0.6); // Lower quality for speed
                        await sendLargeData('pdf_page', dataUrl, {
                            y: yOffset,
                            width: viewport.width,
                            height: viewport.height
                        });
                    }

                    yOffset += viewport.height + 40;
                    maxWidth = Math.max(maxWidth, viewport.width + 100);
                    page.cleanup();
                }

                // Do NOT resize the main drawing canvas. Keeping it at 2500x2500 avoids
                // toDataURL() freezing the tab when changing/adding pages (savePage/loadPage).
                // The PDF stays in the overlay; user pans/zooms to view it.
                setTransform({ x: 0, y: 0, scale: 1 });

                if (pdfContainerRef.current) {
                    pdfContainerRef.current.style.display = '';
                }
            } catch (err) {
                console.error("PDF Load Error", err);
                alert("Failed to load PDF. Please try another file.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportPDF = async () => {
        if (isDocumentPage && docEditableRef.current) {
            try {
                const source = docEditableRef.current;
                const scale = 2;
                const baseW = 595;
                const baseH = 842;
                const temp = document.createElement('div');
                temp.style.cssText = `position:fixed;left:-9999px;top:0;width:${baseW}px;min-height:${baseH}px;background:#fff;padding:48px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6;color:#1a1a1a;box-sizing:border-box;`;
                temp.innerHTML = source.innerHTML || '<p></p>';
                document.body.appendChild(temp);
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                const can = await html2canvas(temp, { scale, logging: false, backgroundColor: '#ffffff', useCORS: false });
                document.body.removeChild(temp);
                const w = can.width;
                const h = Math.max(can.height, 200);
                const imgData = can.toDataURL('image/png', 1.0);
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                const pdfW = pdf.internal.pageSize.getWidth();
                const pdfH = pdf.internal.pageSize.getHeight();
                const imgAspect = w / h;
                const fitW = imgAspect > pdfW / pdfH ? pdfW : pdfH * imgAspect;
                const fitH = imgAspect > pdfW / pdfH ? pdfW / imgAspect : pdfH;
                pdf.addImage(imgData, 'PNG', 0, 0, fitW, fitH);
                pdf.save("davina-tutoring-notes.pdf");
            } catch (err) {
                console.error('Document PDF export failed:', err);
                try {
                    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                    const text = docEditableRef.current?.innerText || docEditableRef.current?.textContent || '';
                    pdf.setFontSize(11);
                    const lines = pdf.splitTextToSize(text || '(No content)', pdf.internal.pageSize.getWidth() - 80);
                    pdf.text(lines, 40, 40);
                    pdf.save("davina-tutoring-notes.pdf");
                } catch (e2) {
                    console.error('Fallback PDF failed:', e2);
                    alert('Could not export document as PDF. Please try again.');
                }
            }
            return;
        }
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const cw = canvas.width;
        const ch = canvas.height;
        const container = pdfContainerRef.current;
        const nodes = (container && container.children && container.children.length > 0)
            ? Array.from(container.children)
            : (pdfByPageRef.current[page] || []);
        let nodeMaxX = cw, nodeMaxY = ch;
        nodes.forEach(node => {
            const left = parseInt(String(node.style?.left || 50).replace(/px/g, ''), 10) || 50;
            const top = parseInt(String(node.style?.top || 0).replace(/px/g, ''), 10) || 0;
            const w = node.tagName === 'CANVAS' ? node.width : (node.naturalWidth || node.offsetWidth || 800);
            const h = node.tagName === 'CANVAS' ? node.height : (node.naturalHeight || node.offsetHeight || 600);
            nodeMaxX = Math.max(nodeMaxX, left + w);
            nodeMaxY = Math.max(nodeMaxY, top + h);
        });
        const outW = Math.ceil(nodeMaxX) || cw;
        const outH = Math.ceil(nodeMaxY) || ch;
        const off = document.createElement('canvas');
        off.width = outW;
        off.height = outH;
        const ctx = off.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(canvas, 0, 0, cw, ch, 0, 0, cw, ch);
        nodes.forEach(node => {
            const left = parseInt(String(node.style?.left || 50).replace(/px/g, ''), 10) || 50;
            const top = parseInt(String(node.style?.top || 0).replace(/px/g, ''), 10) || 0;
            if (left + (node.tagName === 'CANVAS' ? node.width : node.naturalWidth || 800) < 0 || top + (node.tagName === 'CANVAS' ? node.height : node.naturalHeight || 600) < 0) return;
            if (node.tagName === 'CANVAS') {
                try { ctx.drawImage(node, left, top, node.width, node.height); } catch (_) {}
            } else if (node.tagName === 'IMG' && node.complete) {
                const ww = node.naturalWidth || node.offsetWidth || 800;
                const hh = node.naturalHeight || node.offsetHeight || 600;
                try { ctx.drawImage(node, left, top, ww, hh); } catch (_) {}
            }
        });
        const imgData = off.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: outW > outH ? 'landscape' : 'portrait', unit: 'px', format: [outW, outH] });
        pdf.addImage(imgData, 'PNG', 0, 0, outW, outH);
        pdf.save("davina-tutoring-notes.pdf");
    };

    const getLessonPDFBase64 = () => {
        if (!canvasRef.current) return Promise.resolve(null);
        const canvas = canvasRef.current;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        const dataUri = pdf.output('datauristring');
        const base64 = dataUri && dataUri.includes(',') ? dataUri.split(',')[1] : null;
        return Promise.resolve(base64);
    };

    useImperativeHandle(ref, () => ({ getLessonPDFBase64 }), []);


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
            <div className="h-14 bg-purple-600 text-white flex items-center justify-between px-6 shadow-md z-30 shrink-0">
                <div className="flex items-center gap-4 flex-wrap">
                    <GraduationCap size={28} className="text-white shrink-0" />
                    <h1 className="text-xl font-bold tracking-wide shrink-0">Davina's Tutoring</h1>
                    {sessionId && (
                        <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">Meeting ID</span>
                            <span className="font-mono text-sm select-all">{sessionId}</span>
                        </div>
                    )}
                    <span className="text-white/80 text-sm">
                        {studentName && studentName !== 'Guest' ? studentName : (typeof window !== 'undefined' && sessionId ? (localStorage.getItem(`session_student_${sessionId}`) || studentName || 'Student') : (studentName || 'Student'))}
                    </span>
                </div>

                {/* 60-minute timer - always visible when showLessonTimer */}
                {showLessonTimer && (
                <div className={`flex items-center gap-2 font-mono text-lg font-bold px-4 py-1.5 rounded-full shrink-0 ${isOvertime ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`}>
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
                )}

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold transition-all ${showNotes ? 'bg-white text-purple-700' : 'hover:bg-purple-500'}`}
                    >
                        <FileText size={16} />
                        <span>Notes</span>
                    </button>
                    <button
                        onClick={() => {
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    setTimeout(() => handleExportPDF(), 100);
                                });
                            });
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full font-bold bg-white text-purple-700 hover:bg-purple-50 transition-all"
                        title="Download whiteboard as PDF (includes pen and text)"
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

            {/* Page strip under purple bar: not covered by content */}
            <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4 z-[25] relative shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={prevPage} disabled={page === 1} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-purple-600 disabled:opacity-30 rounded border border-gray-200 hover:border-purple-300">←</button>
                    <span className="text-sm font-bold text-gray-700 min-w-[4rem] text-center">{page} / {totalPages}</span>
                    <button onClick={nextPage} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-purple-600 disabled:opacity-30 rounded border border-gray-200 hover:border-purple-300">→</button>
                    <div className="relative">
                    <button onClick={() => setShowAddPageMenu(!showAddPageMenu)} className="px-3 py-1.5 text-sm font-bold text-teal-600 border-2 border-teal-500 rounded-lg hover:bg-teal-50">+ Page</button>
                    {showAddPageMenu && (
                        <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                            <button onClick={() => { addPage('whiteboard'); setShowAddPageMenu(false); }} className="w-full px-3 py-2 text-left text-sm font-bold text-gray-800 hover:bg-teal-50 rounded-t-lg flex items-center gap-2">
                                <FileText size={14} /> Whiteboard
                            </button>
                            <button onClick={() => { addPage('document'); setShowAddPageMenu(false); }} className="w-full px-3 py-2 text-left text-sm font-bold text-gray-800 hover:bg-teal-50 rounded-b-lg flex items-center gap-2">
                                <FileText size={14} /> Document
                            </button>
                        </div>
                    )}
                </div>
                    <button type="button" onClick={handleDeletePage} disabled={totalPages <= 1} className="px-3 py-1.5 text-sm font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed" title="Delete this page">Delete page</button>
                </div>
            </div>

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
                    onAddPage={() => setShowAddPageMenu(true)}
                    onDeletePage={handleDeletePage}
                    onClear={clearCanvas}
                    onUndo={undo}
                    onRedo={redo}
                    isDocumentPage={isDocumentPage}
                    onDocHighlight={(c) => applyDocFormat('backColor', c)}
                    onDocTextColor={(c) => applyDocFormat('foreColor', c)}
                    onDocHighlightPopoverOpen={saveDocSelection}
                    onDocSaveSelection={saveDocSelection}
                />

                <div
                    ref={viewportRef}
                    className={`flex-1 relative overflow-hidden touch-none ${!isDocumentPage && gridMode ? 'bg-grid' : ''} ${!isDocumentPage && tool !== 'pan' ? 'cursor-none' : ''}`}
                    style={{
                        backgroundColor: '#ffffff',
                        ...(!isDocumentPage && tool === 'pan' ? {
                            cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='6' fill='%23000'/%3E%3C/svg%3E") 12 12, grab`
                        } : {})
                    }}
                    {...(isDocumentPage ? {} : events)}
                    onMouseMove={isDocumentPage ? undefined : (e) => {
                        updateCursor(e);
                        if (events.onMouseMove) events.onMouseMove(e);
                    }}
                    onMouseEnter={() => setShowCursor(true)}
                    onMouseLeave={() => setShowCursor(false)}
                >
                    {isDocumentPage ? (
                        <div className="absolute inset-0 overflow-auto bg-gray-300 pt-24 pb-24 px-4">
                            <div className="flex flex-col items-center min-h-full min-w-full pt-12 pb-12">
                            <div className="flex items-center justify-center min-h-full min-w-full" style={{ transform: 'scale(1.55)', transformOrigin: 'center top' }}>
                                <div data-doc-sheet className="w-[210mm] min-h-[297mm] bg-white shadow-xl rounded-sm flex flex-col flex-shrink-0" style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.15)' }}>
                                    <div className="flex-1 flex flex-col p-12 pt-16">
                                        <div
                                            ref={docEditableRef}
                                            className="flex-1 w-full min-h-[200px] border-0 outline-none font-sans text-gray-800 text-base leading-relaxed focus:outline-none overflow-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                                            contentEditable
                                            suppressContentEditableWarning
                                            data-placeholder="Type here — this page supports text colour and highlight."
                                            style={{ outline: 'none' }}
                                            onBlur={(e) => {
                                                saveDocSelection();
                                                const html = e.currentTarget.innerHTML;
                                                setDocumentContent(html);
                                                setDocContent(page, html);
                                            }}
                                            onInput={(e) => {
                                                const html = e.currentTarget.innerHTML;
                                                setDocumentContent(html);
                                                setDocContent(page, html);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            </div>
                        </div>
                    ) : (
                    <>
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
                        <canvas ref={canvasRef} className="relative z-10 pointer-events-none" style={{ background: 'transparent' }} />

                        {/* Active Text Input - auto-focus so user can type immediately */}
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
                                    ref={textInputRef}
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
                    </>
                    )}

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
        </div>
    );
});

export default Whiteboard;
