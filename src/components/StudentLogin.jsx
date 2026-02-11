import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, ArrowRight, Video } from 'lucide-react';

const StudentLogin = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const joinId = searchParams.get('join'); // If redirected from an invite link

    const formatName = (str) => {
        if (!str) return '';
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const [name, setName] = useState('');
    const [sessionId, setSessionId] = useState(joinId || '');

    const handleJoin = (e) => {
        e.preventDefault();
        if (!name.trim() || !sessionId.trim()) return;

        // Clean ID
        const cleanId = sessionId.trim().split('/').pop().replace('?host=true', '');

        // Navigate to session
        navigate(`/session/${cleanId}?student=${encodeURIComponent(formatName(name.trim()))}`);
    };

    return (
        <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center p-6 text-brand-navy font-sans">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
                        <Users size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Student Login</h1>
                    <p className="text-gray-500">Enter your name and session ID to join.</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Your Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Alice"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:outline-none bg-gray-50"
                            autoFocus={!joinId}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Session Update ID</label>
                        <input
                            type="text"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            placeholder="e.g. X7K9P2"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:outline-none bg-gray-50 font-mono"
                            readOnly={!!joinId}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim() || !sessionId.trim()}
                        className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-lg shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                        Join Lesson <ArrowRight size={20} />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (name.trim()) {
                                navigate(`/student-dashboard?student=${encodeURIComponent(formatName(name.trim()))}`);
                            } else {
                                alert("Please enter your name first.");
                            }
                        }}
                        className="w-full py-4 bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50 rounded-xl font-bold text-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                        <Users size={20} /> View Dashboard
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm font-bold"
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentLogin;
