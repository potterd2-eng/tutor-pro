import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Minus } from 'lucide-react';

const Chat = ({ connection, isStudent }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false); // New state for true minimization if needed, but toggle is standard.
    // actually, let's treat "minimize" as closing to the icon, which is what the code did. 
    // But maybe the user wants the window to stay but shrink? 
    // Let's stick to the toggle behavior but make sure the HEADER is visible.

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const [hasUnread, setHasUnread] = useState(false);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Handle incoming messages
    useEffect(() => {
        if (!connection) return;

        const handleData = (data) => {
            if (data && data.type === 'chat') {
                const incomingSender = data.sender || (isStudent ? 'Teacher' : 'Student'); // Fallback if sender not sent
                setMessages(prev => [...prev, { sender: incomingSender, text: data.message, time: new Date() }]);
                if (!isOpen) setHasUnread(true);
            }
        };

        connection.on('data', handleData);

        return () => {
            connection.off('data', handleData);
        };
    }, [connection, isOpen]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const senderName = isStudent ? 'Student' : 'Davina';
        const msg = { sender: senderName, text: inputText, time: new Date() };
        setMessages(prev => [...prev, msg]);

        if (connection && connection.open) {
            connection.send({ type: 'chat', message: inputText, sender: senderName });
        }

        setInputText('');
    };

    return (
        <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end pointer-events-auto">
            {/* Chat Toggle Button (Visible when closed) */}
            {!isOpen && (
                <button
                    onClick={() => { setIsOpen(true); setHasUnread(false); }}
                    className={`p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 ${hasUnread ? 'bg-red-500 animate-bounce' : 'bg-purple-700'} text-white border-2 border-white`}
                    title="Open Chat"
                >
                    <MessageSquare size={28} />
                </button>
            )}

            {/* Chat Window (Visible when open) */}
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-gray-200 animate-in slide-in-from-bottom-10 fade-in duration-200">
                    {/* Header - Explicit Colors to ensure visibility */}
                    <div className="bg-slate-900 p-3 flex justify-between items-center text-white shadow-md z-10">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-purple-400" />
                            <span className="font-bold text-sm">Chat</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Minimize Button - Closes to Icon */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-white/20 p-1.5 rounded transition-colors"
                                title="Minimize"
                            >
                                <Minus size={18} />
                            </button>
                            {/* Close Button - Same action for now, or clear chat? standard is hide. */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-red-500 p-1.5 rounded transition-colors"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 text-sm mt-10">
                                <p>No messages yet.</p>
                                <p className="text-xs mt-1">Chat is ready!</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.sender === (isStudent ? 'Student' : 'Teacher') ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm shadow-sm ${msg.sender === (isStudent ? 'Student' : 'Teacher')
                                    ? 'bg-purple-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.sender} • {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-transparent focus:border-purple-300"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chat;
