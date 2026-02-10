import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Copy } from 'lucide-react';
import Peer from 'peerjs';

const VideoChat = ({ onConnection, isStudent, isHost, roomId }) => {
    const [peerId, setPeerId] = useState('');
    const [remotePeerId, setRemotePeerId] = useState('');
    const [stream, setStream] = useState(null);
    const [isAudio, setIsAudio] = useState(true);
    const [isVideo, setIsVideo] = useState(true);
    // isStudent is now a prop
    const [error, setError] = useState('');

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerRef = useRef(null);
    const streamRef = useRef(null); // Ref to access stream in callbacks without dep array issues
    const callsRef = useRef([]); // Track active calls for track replacement
    const connRef = useRef(null); // Track active data connection for signaling

    useEffect(() => {
        if (!roomId) return;

        // Clean up previous peer if any
        if (peerRef.current) peerRef.current.destroy();

        // If Host: Use roomId as our ID
        // If Student: Use random ID (undefined)
        const myId = isStudent ? undefined : roomId;

        console.log(`Initializing Peer. isStudent=${isStudent}, roomId=${roomId}, myId=${myId}`);

        const peer = new Peer(myId, {
            debug: 2
        });

        // 1. Get Local Stream FIRST
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((ms) => {
                setStream(ms);
                streamRef.current = ms;
                if (localVideoRef.current) localVideoRef.current.srcObject = ms;

                // 2. Then Initialize Peer Events that depend on stream
                peer.on('call', (call) => {
                    console.log("Receiving call...");
                    call.answer(ms); // Answer with the stream we already have
                    callsRef.current.push(call);
                    call.on('stream', (rs) => {
                        console.log("Received remote stream");
                        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs;
                    });
                    call.on('close', () => {
                        callsRef.current = callsRef.current.filter(c => c !== call);
                    });
                });

                // If we have a hash, we might need to connect (race condition with Open event?)
                // The open event handler primarily handles this.
            })
            .catch(err => {
                console.warn("Failed to get local stream, falling back to dummy stream", err);
                setError(`Camera not found (${err.message}). Using dummy video for testing.`);

                // Fallback: Create a dummy stream using canvas
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 480;
                const ctx = canvas.getContext('2d');

                // Draw animation
                const draw = () => {
                    ctx.fillStyle = '#1e1e2e'; // Dark background
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw moving circle
                    const time = Date.now() / 1000;
                    const x = canvas.width / 2 + Math.cos(time) * 100;
                    const y = canvas.height / 2 + Math.sin(time) * 100;

                    ctx.beginPath();
                    ctx.arc(x, y, 50, 0, Math.PI * 2);
                    ctx.fillStyle = '#a855f7'; // Purple
                    ctx.fill();

                    ctx.fillStyle = 'white';
                    ctx.font = '40px Arial';
                    ctx.fillText(window.location.hash ? "Student (No Cam)" : "Teacher (No Cam)", 50, 100);

                    requestAnimationFrame(draw);
                };
                draw();

                const dummyStream = canvas.captureStream(30);

                // Add a dummy audio track so PeerJS doesn't complain
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const dst = oscillator.connect(audioCtx.createMediaStreamDestination());
                oscillator.start();
                const audioTrack = dst.stream.getAudioTracks()[0];
                dummyStream.addTrack(audioTrack);

                // Proceed with dummy stream
                setStream(dummyStream);
                streamRef.current = dummyStream;
                if (localVideoRef.current) localVideoRef.current.srcObject = dummyStream;

                // Initialize Peer with dummy stream
                peer.on('call', (call) => {
                    console.log("Receiving call (dummy)...");
                    call.answer(dummyStream);
                    call.on('stream', (rs) => {
                        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs;
                    });
                });
            });

        peer.on('error', (err) => {
            console.error("Peer error:", err);
            setError(`Connection Error: ${err.type} - ${err.message}`);
        });

        peer.on('open', (id) => {
            console.log("My Peer ID:", id);
            setPeerId(id);

            // If Student, we need to connect to the Host (roomId)
            if (isStudent) {
                setRemotePeerId(roomId);
                // The useEffect [stream, remotePeerId] will trigger the call
            }
        });

        peer.on('connection', (conn) => {
            connRef.current = conn;
            conn.on('open', () => {
                if (onConnection) onConnection(conn);
            });
            conn.on('data', (data) => {
                if (data && data.type === 'screenShareStarted') {
                    setEnlargedFeed('remote');
                } else if (data && data.type === 'screenShareStopped') {
                    setEnlargedFeed(null);
                }
                if (window.externalDraw) window.externalDraw(data);
            });
        });

        peerRef.current = peer;

        return () => {
            // peer.destroy(); // Optional cleanup
        }
    }, []);

    // Watch for stream + remoteId availability to connect
    useEffect(() => {
        if (stream && remotePeerId && peerRef.current && !peerRef.current.disconnected) {
            // Simple check: do we already have a connection/call?
            // Since this runs once when stream becomes available, it should be safe.
            // We can check if we are already calling? PeerJS doesn't make it easy to check active calls.
            // Let's just call.
            console.log("Stream ready, auto-connecting to", remotePeerId);
            connectToPeer(remotePeerId);
        }
    }, [stream, remotePeerId]);


    const connectToPeer = (id) => {
        // Guard: Must have stream and peer
        if (!streamRef.current || !peerRef.current) {
            console.warn("Cannot connect: Stream or Peer not ready");
            return;
        }

        console.log("Calling peer:", id);
        const call = peerRef.current.call(id, streamRef.current);
        callsRef.current.push(call);

        call.on('stream', (rs) => {
            console.log("Received remote stream from outgoing call");
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = rs;
        });

        call.on('close', () => {
            callsRef.current = callsRef.current.filter(c => c !== call);
        });

        const conn = peerRef.current.connect(id);
        connRef.current = conn;
        conn.on('open', () => {
            if (onConnection) onConnection(conn);
        });
        conn.on('data', (data) => {
            if (data && data.type === 'screenShareStarted') {
                setEnlargedFeed('remote');
            } else if (data && data.type === 'screenShareStopped') {
                setEnlargedFeed(null);
            }
            if (window.externalDraw) window.externalDraw(data);
        });
    }

    const toggleAudio = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !isAudio;
            setIsAudio(!isAudio);
        }
    }

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !isVideo;
            setIsVideo(!isVideo);
        }
    }

    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyLink = () => {
        const url = `${window.location.origin}/session/${roomId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        // Alert removed in favor of modal feedback
    }

    const retryCamera = async () => {
        setError('');
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            console.log("Available Devices:", devices);

            const ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // If successful, replace the dummy stream
            setStream(ms);
            streamRef.current = ms;
            if (localVideoRef.current) localVideoRef.current.srcObject = ms;

            // Replace tracks in existing peer connection if it exists
            if (peerRef.current) {
                // For now, simpler to just reload or let the user know it worked
                // Re-negotiating peer connection streams can be complex
            }
        } catch (err) {
            console.error("Retry failed", err);
            setError(`Retry Failed: ${err.message}`);
        }
    }

    const [availableDevices, setAvailableDevices] = useState([]);

    useEffect(() => {
        // Check devices on load/error
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAvailableDevices(devices.filter(d => d.kind === 'videoinput'));
        });
    }, [error]);

    // Remote Stream Controls (Local overrides)
    const [isRemoteAudio, setIsRemoteAudio] = useState(true);
    const [isRemoteVideo, setIsRemoteVideo] = useState(true);

    const toggleRemoteAudio = () => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
            setIsRemoteAudio(!remoteVideoRef.current.muted);
        }
    };

    const toggleRemoteVideo = () => {
        setIsRemoteVideo(!isRemoteVideo);
    };

    // Screen Share Logic
    const [isSharing, setIsSharing] = useState(false);
    const screenStreamRef = useRef(null);

    const toggleScreenShare = async () => {
        // Students can now share screens too!

        if (isSharing) {
            // Stop Sharing
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
            setIsSharing(false);
            setEnlargedFeed(null);
            sendSignal({ type: 'screenShareStopped' });

            // Revert to camera
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                replaceStream(cameraStream);
            } catch (e) {
                console.error("Failed to revert to camera", e);
            }
        } else {
            // Start Sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                screenStreamRef.current = screenStream;
                setIsSharing(true);
                setEnlargedFeed('local');
                sendSignal({ type: 'screenShareStarted' });

                // Handle stop sharing from browser UI
                screenStream.getVideoTracks()[0].onended = () => {
                    setIsSharing(false);
                    setEnlargedFeed(null);
                    sendSignal({ type: 'screenShareStopped' });
                    // Revert to camera when finished
                    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(replaceStream);
                };

                replaceStream(screenStream);
            } catch (err) {
                console.error("Error sharing screen:", err);
                alert("Failed to share screen.");
            }
        }
    };

    const sendSignal = (data) => {
        if (connRef.current && connRef.current.open) {
            connRef.current.send(data);
        }
    };

    const replaceStream = (newStream) => {
        const oldStream = streamRef.current;
        setStream(newStream);
        streamRef.current = newStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

        // Replace tracks in all active calls using RTCRtpSender.replaceTrack
        const newVideoTrack = newStream.getVideoTracks()[0];

        callsRef.current.forEach(call => {
            if (call.peerConnection) {
                const senders = call.peerConnection.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                if (videoSender && newVideoTrack) {
                    videoSender.replaceTrack(newVideoTrack);
                }
            }
        });

        // Stop old camera tracks if they are no longer needed
        // (but only if we are sharing, so we don't kill the camera permanently if we want to toggle back?
        // Actually, navigator already does it when we stop sharing.)
    };

    useEffect(() => {
        window.addEventListener('toggleScreenShare', toggleScreenShare);
        return () => window.removeEventListener('toggleScreenShare', toggleScreenShare);
    }, [isSharing, stream]);

    const [videoWidth, setVideoWidth] = useState(256);
    const [enlargedFeed, setEnlargedFeed] = useState(null); // 'local' or 'remote'
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            // Handle is now bottom-left. 
            // Dragging right (positive delta) makes width smaller. 
            // Dragging left (negative delta) makes width larger.
            const delta = -e.movementX;
            setVideoWidth(prev => Math.max(160, Math.min(800, prev + delta)));
        };
        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setEnlargedFeed(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <div className="absolute top-20 right-4 flex flex-col gap-4 z-40 pointer-events-auto">
            {/* Error Message Display */}
            {error && (
                <div className="bg-red-500/90 text-white p-4 rounded-xl shadow-lg max-w-xs backdrop-blur-sm border border-white/20 animate-in slide-in-from-right">
                    <p className="font-bold text-sm">⚠️ Error</p>
                    <p className="text-xs mt-1 mb-2">{error}</p>

                    {/* Device Diagnostics */}
                    <div className="bg-black/20 p-2 rounded mb-2">
                        <p className="text-[10px] opacity-75 uppercase font-bold">Detected Cameras:</p>
                        {availableDevices.length > 0 ? (
                            <ul className="list-disc pl-4">
                                {availableDevices.map((d, i) => (
                                    <li key={i} className="text-[10px]">{d.label || `Camera ${i + 1} (Label hidden)`}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-[10px] italic">No cameras detected by browser.</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setError('')}
                            className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={retryCamera}
                            className="text-xs bg-white text-red-600 font-bold px-2 py-1 rounded transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}
            {/* Share Session Button - High Visibility (Teacher Only) */}
            {!isStudent && (
                <button
                    onClick={() => setShowShareModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl shadow-lg font-bold text-lg animate-pulse hover:animate-none transition-all border-2 border-white/20 flex items-center gap-2 mb-2"
                >
                    Invite Student <Copy size={20} />
                </button>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-purple-600 p-6 text-white text-center">
                            <h3 className="text-2xl font-bold mb-1">Invite Student</h3>
                            <p className="text-purple-100 text-sm">Share this link to start the session</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
                                <span className="bg-white p-2 rounded-lg shadow-sm">🔗</span>
                                <input
                                    readOnly
                                    value={`${window.location.origin}/session/${roomId}`}
                                    className="bg-transparent border-none focus:ring-0 text-gray-600 text-sm flex-1 font-mono w-full overflow-hidden text-ellipsis"
                                />
                            </div>

                            <button
                                onClick={copyLink}
                                className={`w-full py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                            >
                                {copied ? (
                                    <>
                                        <span className="text-xl">✓</span> Link Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={20} /> Copy
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => { setShowShareModal(false); setCopied(false); }}
                                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Size Slider REMOVED - replaced by corner drag */}

            <div className="flex flex-col gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl relative group/vids">
                {/* Resize Handle (Bottom-Left) */}
                <div
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                    }}
                    className="absolute -bottom-2 -left-2 w-8 h-8 bg-purple-600 rounded-lg cursor-nesw-resize z-[60] flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity hover:scale-110 shadow-xl border-2 border-white/40 group-hover/vids:opacity-100"
                    style={{ cursor: 'nesw-resize' }}
                >
                    <div className="w-4 h-4 border-b-2 border-l-2 border-white rotate-0 mb-1 ml-1 opacity-80" />
                </div>

                {/* Local Video (You) */}
                <div
                    className="relative group bg-black rounded-lg overflow-hidden shadow-inner border border-gray-600 transition-all duration-300"
                    style={{ width: `${videoWidth}px`, aspectRatio: '16/9' }}
                >
                    <video ref={localVideoRef} autoPlay muted className={`w-full h-full object-cover ${!isVideo && 'hidden'}`} />
                    {!isVideo && (
                        <div className="w-full h-full flex items-center justify-center text-white/50 bg-brand-navy">
                            Camera Off
                        </div>
                    )}

                    <div className="absolute bottom-2 left-2 text-white/50 text-xs bg-black/50 px-2 rounded">
                        {isStudent ? 'Student (You)' : 'Teacher (You)'}
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={toggleAudio} className={`p-2.5 rounded-full ${isAudio ? 'bg-white text-brand-navy' : 'bg-red-500 text-white'} hover:scale-110 transition-transform`} title={isAudio ? "Mute" : "Unmute"}>
                            {isAudio ? <Mic size={16} /> : <MicOff size={16} />}
                        </button>
                        <button onClick={toggleVideo} className={`p-2.5 rounded-full ${isVideo ? 'bg-white text-brand-navy' : 'bg-red-500 text-white'} hover:scale-110 transition-transform`} title={isVideo ? "Stop Video" : "Start Video"}>
                            {isVideo ? <Video size={16} /> : <VideoOff size={16} />}
                        </button>
                        <button onClick={() => setEnlargedFeed('local')} className="p-2.5 rounded-full bg-purple-600 text-white hover:scale-110 transition-transform" title="Enlarge to Full Page">
                            <Copy size={16} className="rotate-45" />
                        </button>
                    </div>
                </div>

                {/* Remote Video (Other) */}
                <div
                    className="relative group bg-black rounded-lg overflow-hidden shadow-inner border border-gray-600 transition-all duration-300"
                    style={{ width: `${videoWidth}px`, aspectRatio: '16/9' }}
                >
                    <video ref={remoteVideoRef} autoPlay className={`w-full h-full object-cover ${!isRemoteVideo && 'hidden'}`} />
                    {!isRemoteVideo && (
                        <div className="w-full h-full flex items-center justify-center text-white/50 bg-brand-navy">
                            Video Hidden
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 text-white/50 text-xs bg-black/50 px-2 rounded">
                        {isStudent ? 'Teacher' : 'Student'}
                    </div>
                    {/* Remote Controls Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onClick={() => setEnlargedFeed('remote')} className="p-3 rounded-full bg-purple-600 text-white hover:scale-110 shadow-lg border-2 border-white/20 flex items-center gap-2 font-bold px-4" title="Enlarge for better view">
                            <Video size={18} /> Enlarge
                        </button>
                    </div>
                </div>
            </div>

            {/* Enlarge Overlay Modal */}
            {enlargedFeed && (
                <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col p-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-4 px-4">
                        <h3 className="text-white font-bold text-xl flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            {enlargedFeed === 'local' ? 'Your Shared Screen / Video' : (isStudent ? "Teacher's Presentation" : "Student's Shared Screen")}
                        </h3>
                        <button
                            onClick={() => setEnlargedFeed(null)}
                            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all flex items-center gap-2 group"
                        >
                            <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">Exit Full Screen</span>
                            <span className="text-2xl leading-none">×</span>
                        </button>
                    </div>

                    <div className="flex-1 rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black flex items-center justify-center relative">
                        <video
                            ref={(el) => {
                                if (el) {
                                    el.srcObject = enlargedFeed === 'local' ? stream : remoteVideoRef.current?.srcObject;
                                }
                            }}
                            autoPlay
                            muted={enlargedFeed === 'local'}
                            className="w-full h-full object-contain"
                        />

                        {/* Status Overlay */}
                        <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white/80 text-sm font-bold flex items-center gap-2">
                            Live Projection Mode
                        </div>
                    </div>

                    <div className="h-16 flex items-center justify-center text-white/30 text-sm tracking-widest font-bold">
                        HINT: PRESS ESC OR THE CLOSE BUTTON TO RETURN TO WHITEBOARD
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoChat;
