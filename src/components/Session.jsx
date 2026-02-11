import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import Whiteboard from './Whiteboard';
import VideoChat from './VideoChat';
import Chat from './Chat';
import { CreditCard, Shield, AlertCircle, CheckCircle } from 'lucide-react';


const Session = () => {
    const { roomId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isHost = searchParams.get('host') === 'true';
    const studentName = searchParams.get('student'); // Keep original variable name
    const sessionType = searchParams.get('type') || 'lesson'; // 'lesson' or 'consultation'
    const isStudent = !isHost;

    if (isStudent && !studentName) {
        // Redirect to Login if no name provided
        return <Navigate to={`/student-login?join=${roomId}`} replace />;
    }

    const displayName = studentName || 'Guest';

    const [connection, setConnection] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    // Feedback Form State
    const [lessonTopic, setLessonTopic] = useState('');
    const [feedbackWell, setFeedbackWell] = useState('');
    const [feedbackImprove, setFeedbackImprove] = useState('');
    const [feedbackFocus, setFeedbackFocus] = useState('');
    const [nextSteps, setNextSteps] = useState('');
    const [lessonCost, setLessonCost] = useState(sessionType === 'consultation' ? 0 : 30);
    const [paymentStatus, setPaymentStatus] = useState(sessionType === 'consultation' ? 'N/A' : 'Due');

    const [paymentVerified, setPaymentVerified] = useState(sessionType === 'consultation' || isHost);
    const [strictBlock, setStrictBlock] = useState(false);

    // Initial Payment Check
    useEffect(() => {
        if (sessionType === 'consultation' || isHost) return;

        const bookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const history = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        const currentBooking = bookings.find(b => b.id === roomId || b.id === searchParams.get('bookingId'));

        // Check for Strict Block (Outstanding payments > 7 days old)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const allItems = [...bookings, ...history];
        const hasLongOverdue = allItems.some(item => {
            const itemDate = new Date(item.date);
            // Filter for THIS student
            const isForStudent = (item.student === displayName || item.studentName === displayName);
            return isForStudent && item.paymentStatus === 'Due' && itemDate < sevenDaysAgo;
        });

        if (hasLongOverdue) {
            setStrictBlock(true);
        }

        if (currentBooking && (currentBooking.paymentStatus === 'Paid' || currentBooking.paymentStatus === 'Due (Exception)')) {
            setPaymentVerified(true);
            if (currentBooking.paymentStatus === 'Due (Exception)') {
                setPaymentStatus('Due (Exception)');
            }
        } else {
            setPaymentVerified(false);
        }
    }, [roomId, sessionType, isHost, searchParams, displayName]);

    // Check for Stripe payment success redirect
    useEffect(() => {
        if (searchParams.get('payment_success') === 'true' || searchParams.get('session_id')) {
            setPaymentStatus('Paid');
            setPaymentVerified(true);
            setStrictBlock(false); // Assume they paid something? Or re-check required.
            // Simplified: If they just paid via the link, let them in.

            // Also update the booking in localStorage for future joins
            const bookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
            const updatedBookings = bookings.map(b => {
                if (b.id === roomId || b.id === searchParams.get('bookingId')) {
                    return { ...b, paymentStatus: 'Paid' };
                }
                return b;
            });
            localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
            window.dispatchEvent(new Event('storage'));

            alert('Payment received! ✅ Check your email for confirmation from Stripe.');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [searchParams, roomId]);

    const handleEndLesson = () => {
        setShowEndConfirm(true);
    };

    const requestException = () => {
        if (window.confirm("Request Exception: strictly valid for this session only.\n\nBy clicking OK, you agree to make the payment immediately after the lesson.")) {
            // Persist the exception in the booking
            const bookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
            const updatedBookings = bookings.map(b =>
                (b.id === roomId || b.id === searchParams.get('bookingId')) ? { ...b, paymentStatus: 'Due (Exception)' } : b
            );
            localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
            window.dispatchEvent(new Event('storage'));

            setPaymentVerified(true);
            setPaymentStatus('Due (Exception)');
        }
    };

    const submitFeedback = (e) => {
        // ... (existing feedback submission logic)
        e.preventDefault();

        // Create consolidated feedback for display
        const consolidatedFeedback = `${feedbackWell} ${feedbackImprove ? '| To Improve: ' + feedbackImprove : ''} ${feedbackFocus ? '| Focus: ' + feedbackFocus : ''}`.trim();

        const sessionLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            endTime: new Date().toISOString(),
            studentName: displayName,
            studentId: searchParams.get('studentId') || displayName.toLowerCase().replace(/\s+/g, '_'),
            subject: lessonTopic,
            topic: lessonTopic,
            feedback: consolidatedFeedback, // For parent dashboard
            feedback_well: feedbackWell,
            feedback_improve: feedbackImprove,
            feedback_focus: feedbackFocus,
            next_steps: nextSteps,
            nextSteps: nextSteps, // For teacher dashboard
            cost: lessonCost,
            paymentStatus: paymentStatus,
            type: sessionType,
            duration: '60' // Default 60 mins
        };

        // Save to History
        const history = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        history.push(sessionLog);
        localStorage.setItem('tutor_session_history', JSON.stringify(history));

        // Cleanup: Remove from Bookings
        const bookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const updatedBookings = bookings.filter(b => b.id !== roomId);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

        // Dispatch event so other components know data changed
        window.dispatchEvent(new Event('storage'));

        // Close connection
        if (connection) connection.close();

        // Redirect
        if (isHost) {
            localStorage.setItem('teacher_dashboard_unlocked', 'true');
            window.location.href = '/teacher';
        } else {
            window.location.href = `/student-dashboard?student=${encodeURIComponent(displayName)}`;
        }
    };

    const paymentLink = `https://buy.stripe.com/test_528e_demo`; // This should ideally be dynamic or fetched

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-brand-light">
            {paymentVerified ? (
                <>
                    <Whiteboard
                        connection={connection}
                        isHost={isHost}
                        sessionId={roomId}
                        studentName={displayName}
                        onEndLesson={handleEndLesson}
                    />
                    <VideoChat
                        roomId={roomId}
                        isStudent={isStudent}
                        isHost={isHost}
                        onConnection={setConnection}
                    />
                    <Chat connection={connection} isStudent={isStudent} />
                </>
            ) : (
                <div className="fixed inset-0 z-[200] bg-gray-900 flex items-center justify-center p-6 text-center">
                    <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${strictBlock ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                            {strictBlock ? <AlertCircle size={40} /> : <CreditCard size={40} />}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {strictBlock ? "Outstanding Payments" : "Payment Due"}
                        </h2>
                        <p className="text-gray-500 mb-8">
                            {strictBlock
                                ? "You have outstanding payments from previous weeks. Please clear your balance to continue."
                                : "Please verify payment for this session to enter the classroom."
                            }
                        </p>

                        <div className="space-y-4">
                            <a
                                href={paymentLink}
                                className="block w-full py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold shadow-lg transition-all"
                            >
                                Pay Now (£30)
                            </a>

                            {!strictBlock && (
                                <button
                                    onClick={requestException}
                                    className="block w-full py-3 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl font-bold transition-colors"
                                >
                                    request Exception (Pay Later)
                                </button>
                            )}

                            <button
                                onClick={() => navigate(-1)}
                                className="block w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                            >
                                Go Back
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
                            <Shield size={14} /> Secure Payment via Stripe
                        </div>
                    </div>
                </div>
            )}

            {/* End Lesson Button (Host Only) - Handled in Whiteboard Header now */}

            {/* End Lesson Confirmation Modal */}
            {showEndConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">End Lesson?</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to end the lesson? You'll be asked to provide feedback next.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEndConfirm(false)}
                                className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowEndConfirm(false);
                                    setShowFeedbackModal(true);
                                }}
                                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-md transition-all"
                            >
                                End Lesson
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full m-4 animate-in zoom-in-95">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Lesson Summary & Invoice</h2>
                        <form onSubmit={submitFeedback} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Topics Covered</label>
                                <input required type="text" value={lessonTopic} onChange={e => setLessonTopic(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-purple-500 outline-none" placeholder="e.g. Algebra Basics" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">What went well?</label>
                                    <textarea required value={feedbackWell} onChange={e => setFeedbackWell(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-green-500 outline-none h-24 text-sm" placeholder="Great focus today..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Improvements?</label>
                                    <textarea required value={feedbackImprove} onChange={e => setFeedbackImprove(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-amber-500 outline-none h-24 text-sm" placeholder="Practice more..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Focus</label>
                                    <textarea value={feedbackFocus} onChange={e => setFeedbackFocus(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-500 outline-none h-24 text-sm" placeholder="Key topics focused on..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Homework/Next Steps</label>
                                    <textarea value={nextSteps} onChange={e => setNextSteps(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-purple-500 outline-none h-24 text-sm" placeholder="E.g. Focus on quadratic equations" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 mt-6">
                                Save Lesson Summary
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isHost) {
                                        localStorage.setItem('teacher_dashboard_unlocked', 'true');
                                        window.location.href = '/teacher';
                                    } else {
                                        window.location.href = `/student-dashboard?student=${encodeURIComponent(displayName)}`;
                                    }
                                }}
                                className="w-full py-3 text-gray-500 hover:text-gray-700 font-bold text-sm mt-2 transition-colors"
                            >
                                Skip for now
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Session;
