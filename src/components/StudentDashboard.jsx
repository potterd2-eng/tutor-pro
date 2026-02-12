import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Clock, Calendar, Video, MessageSquare, Star,
    CheckCircle, AlertCircle, TrendingUp, CreditCard,
    FileText, ChevronRight, LogOut, Plus, ArrowRight, X, Trash2, BookOpen
} from 'lucide-react';
import { emailService } from '../utils/email';
import { generateGoogleCalendarUrl } from '../utils/calendar';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { studentName } = useParams();
    const [displayName, setDisplayName] = useState(studentName || new URLSearchParams(window.location.search).get('student') || 'Guest');
    const [studentId, setStudentId] = useState('');

    const [history, setHistory] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [availableLessons, setAvailableLessons] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingSubject, setBookingSubject] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [bookTenWeeks, setBookTenWeeks] = useState(false);
    const [expandedBlockId, setExpandedBlockId] = useState(null);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [editNoteTarget, setEditNoteTarget] = useState(null);
    const [dismissedCancelledBanner, setDismissedCancelledBanner] = useState(() => {
        return localStorage.getItem('dismissed_cancelled_banner') === 'true';
    });
    const [paymentTarget, setPaymentTarget] = useState(null);
    const [receiptTarget, setReceiptTarget] = useState(null);
    const [notification, setNotification] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [hourlyRate, setHourlyRate] = useState(30);
    const [newMessage, setNewMessage] = useState('');

    // Review System State
    const [reviewTarget, setReviewTarget] = useState(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [confirmation, setConfirmation] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [recurringType, setRecurringType] = useState('weekly'); // 'weekly' or 'pack'

    const getStudentLevel = (subject) => {
        if (!subject) return 'GCSE';
        const s = subject.toLowerCase();
        if (s.includes('ks3')) return 'KS3';
        if (s.includes('gcse') || s.includes('secondary')) return 'GCSE';
        if (s.includes('a-level') || s.includes('a level') || s.includes('alevel') || s.includes('a-lvl')) return 'A-Level';
        return 'GCSE';
    };

    const getBundlePrice = (subject) => {
        const level = getStudentLevel(subject);
        return level === 'A-Level' ? 370 : 280;
    };

    useEffect(() => {
        const loadData = () => {
            const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
            const myHistory = allHistory.filter(h =>
                (h.studentName && h.studentName.toLowerCase().includes(studentName.toLowerCase())) ||
                (h.student && h.student.toLowerCase().includes(studentName.toLowerCase()))
            );
            setHistory(myHistory.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time)));

            const allStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
            const myProfile = allStudents.find(s => s.name.toLowerCase() === displayName.toLowerCase());
            if (myProfile) {
                setStudentId(myProfile.id);
                // Determine rate based on subject
                const subject = myProfile.subject || '';
                if (subject.includes('KS3')) setHourlyRate(25);
                else if (subject.includes('GCSE')) setHourlyRate(30);
                else if (subject.includes('A-Level') || subject.includes('A Level')) setHourlyRate(40);
                else setHourlyRate(30);
            }

            const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
            const myBookings = allBookings.filter(b => {
                const studentMatch = b.student?.toLowerCase().includes(studentName.toLowerCase()) ||
                    b.studentName?.toLowerCase().includes(studentName.toLowerCase());
                const idMatch = myProfile && b.studentId === myProfile.id;
                return studentMatch || idMatch;
            });
            setBookings(myBookings.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)));

            const messages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
            setChatMessages(messages[studentName] || []);

            const allLessonSlots = JSON.parse(localStorage.getItem('tutor_all_lesson_slots')) || [];
            const available = allLessonSlots.filter(l => !l.bookedBy && new Date(l.date + 'T' + l.time) > new Date());
            setAvailableLessons(available.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)));
        };

        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, [studentName, displayName]);

    useEffect(() => {
        if (activeTab === 'messages' && studentName) {
            const messages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
            const thread = messages[studentName] || [];
            const hasUnread = thread.some(m => m.sender === 'Davina' && !m.read);

            if (hasUnread) {
                const updatedThread = thread.map(m =>
                    m.sender === 'Davina' ? { ...m, read: true } : m
                );
                const updatedMessages = { ...messages, [studentName]: updatedThread };
                localStorage.setItem('chat_messages_v2', JSON.stringify(updatedMessages));
                setChatMessages(updatedThread);
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, [activeTab, studentName]);

    const handleJoinLesson = (booking) => {
        const isPaid = booking.paymentStatus?.toLowerCase() === 'paid';
        const isException = booking.paymentStatus === 'Due (Exception)';
        const isFree = booking.type === 'consultation';

        if (!isPaid && !isException && !isFree) {
            setNotification({ type: 'error', message: 'Please pay for this lesson before starting. You can pay in the Invoices tab.' });
            setActiveTab('invoices');
            return;
        }
        // Use booking.id as standardized roomId
        navigate(`/session/${booking.id}?student=${encodeURIComponent(studentName)}`);
    };

    const handleApproval = (lesson) => {
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const updatedBookings = allBookings.map(b => {
            if (lesson.recurringId && b.recurringId === lesson.recurringId) {
                return { ...b, status: 'confirmed' };
            }
            if (b.id === lesson.id) {
                return { ...b, status: 'confirmed' };
            }
            return b;
        });
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        window.dispatchEvent(new Event('storage'));
        setNotification({ type: 'success', message: 'Lesson(s) approved and confirmed!' });
    };

    const handleDenial = (lesson) => {
        if (!window.confirm('Are you sure you want to deny this lesson proposal?')) return;
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const updatedBookings = allBookings.map(b => {
            if (lesson.recurringId && b.recurringId === lesson.recurringId) {
                return { ...b, status: 'cancelled' };
            }
            if (b.id === lesson.id) {
                return { ...b, status: 'cancelled' };
            }
            return b;
        });
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        window.dispatchEvent(new Event('storage'));
        setNotification({ type: 'info', message: 'Lesson proposal denied.' });
    };

    const handlePay = (invoice) => {
        setPaymentTarget(invoice);
    };

    const handleSaveNote = (e) => {
        if (e) e.preventDefault();
        if (!editNoteTarget) return;

        const updated = bookings.map(b =>
            b.id === editNoteTarget.booking.id ? { ...b, subject: editNoteTarget.currentNote } : b
        );
        setBookings(updated);
        localStorage.setItem('tutor_bookings', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        setEditNoteTarget(null);
    };

    const markAsPaid = (invoiceId) => {
        const paymentDate = new Date().toISOString();
        const allHistory = JSON.parse(localStorage.getItem('tutor_session_history') || '[]');
        const updatedHistory = allHistory.map(h => h.id === invoiceId ? { ...h, paymentStatus: 'Paid', paymentDate } : h);
        localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));

        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
        const updatedBookings = allBookings.map(b => b.id === invoiceId ? { ...b, paymentStatus: 'Paid', paymentDate } : b);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

        window.dispatchEvent(new Event('storage'));
    };

    const handleBookLesson = (slot) => {
        setRescheduleTarget(null); // Clear any pending reschedule request
        setSelectedSlot(slot);
        // Default to student's subject or generic valid type
        const allStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
        const student = allStudents.find(s => s.name === displayName);
        setBookingSubject(student?.subject || 'KS3 Maths');
        setIsRecurring(false);
        setRecurringType('weekly');
        setShowBookingModal(true);
    };

    const confirmBooking = () => {
        if (!rescheduleTarget && !bookingSubject.trim()) {
            setNotification({ type: 'error', message: 'Please enter what you\'d like to cover.' });
            return;
        }

        const allSlots = JSON.parse(localStorage.getItem('tutor_lesson_slots')) || [];
        const updatedSlots = allSlots.map(s => s.id === selectedSlot.id ? { ...s, bookedBy: displayName } : s);
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));

        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];

        if (rescheduleTarget) {
            const updatedBookings = allBookings.map(b => {
                if (b.id === rescheduleTarget.id) {
                    return {
                        ...b,
                        status: 'pending_reschedule',
                        requestedDate: selectedSlot.date,
                        requestedTime: selectedSlot.time,
                        requestedSlotId: selectedSlot.id
                    };
                }
                return b;
            });
            localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

            // Notify Tutor
            emailService.sendRescheduleRequest({
                ...rescheduleTarget,
                requestedDate: selectedSlot.date,
                requestedTime: selectedSlot.time
            }, 'student').then(() => {
                // Also notify teacher via standardized method
                emailService.sendRescheduleResponseToTeacher({
                    ...rescheduleTarget,
                    date: selectedSlot.date,
                    time: selectedSlot.time
                }, 'Proposed by Student');
            });

            setNotification({ type: 'success', message: 'Reschedule Request Sent!' });
            setShowBookingModal(false);
        } else {
            const newBooking = {
                id: selectedSlot.id,
                date: selectedSlot.date,
                time: selectedSlot.time,
                student: displayName,
                studentId: studentId,
                subject: bookingSubject,
                type: isRecurring ? (recurringType === 'pack' ? 'pack' : 'weekly') : 'lesson',
                bookedAt: new Date().toISOString(),
                status: 'confirmed',
                paymentStatus: 'Due',
                cost: isRecurring && recurringType === 'pack' ? getBundlePrice(bookingSubject) : hourlyRate
            };

            if (isRecurring) {
                const bookingsToCreate = [];
                const recurringId = `recurring_${Date.now()}`;

                for (let i = 0; i < 10; i++) {
                    const date = new Date(selectedSlot.date);
                    date.setDate(date.getDate() + (i * 7));

                    bookingsToCreate.push({
                        ...newBooking,
                        id: `${selectedSlot.id}_${i}_${Date.now()}`,
                        date: date.toISOString().split('T')[0],
                        recurringId: recurringId,
                        paymentStatus: i === 0 ? 'Due' : (recurringType === 'pack' ? 'Paid' : 'Upcoming'),
                        cost: i === 0 ? (recurringType === 'pack' ? getBundlePrice(bookingSubject) : hourlyRate) : (recurringType === 'pack' ? 0 : hourlyRate)
                    });
                }
                localStorage.setItem('tutor_bookings', JSON.stringify([...allBookings, ...bookingsToCreate]));
            } else {
                localStorage.setItem('tutor_bookings', JSON.stringify([...allBookings, newBooking]));
            }

            // Notify Teacher
            emailService.sendNewBookingNotificationToTeacher({
                ...newBooking,
                recurringId: isRecurring ? `recurring_${Date.now()}` : undefined
            });

            setNotification({ type: 'success', message: isRecurring ? '10-Week Lesson Bundle Booked!' : 'Lesson Booked!' });
            setShowBookingModal(false);
        }
        window.dispatchEvent(new Event('storage'));
        setActiveTab('overview');
    };

    const initiateReview = (lesson) => {
        setReviewTarget(lesson);
        setReviewRating(0);
        setReviewComment('');
        setShowReviewModal(true);
    };

    const submitReview = () => {
        if (!reviewTarget || !reviewRating) return;
        const newReview = {
            id: Date.now(),
            studentName: displayName,
            date: new Date().toISOString(),
            rating: reviewRating,
            comment: reviewComment,
            lessonId: reviewTarget.id,
            subject: reviewTarget.subject
        };
        const existingReviews = JSON.parse(localStorage.getItem('tutor_public_reviews')) || [];
        localStorage.setItem('tutor_public_reviews', JSON.stringify([...existingReviews, newReview]));

        const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        const updatedHistory = allHistory.map(h => h.id === reviewTarget.id ? { ...h, hasReview: true } : h);
        localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));

        setShowReviewModal(false);
        window.dispatchEvent(new Event('storage'));
        setNotification({ type: 'success', message: 'Thank you for your review!' });
    };

    const initiateReschedule = (booking) => {
        setRescheduleTarget(booking);
        setShowRescheduleModal(true);
    };

    const confirmRescheduleStart = () => {
        setShowRescheduleModal(false);
        setActiveTab('booking');
    };

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        const msg = {
            sender: displayName,
            message: newMessage,
            timestamp: new Date().toISOString()
        };
        const allMessages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
        const studentMessages = allMessages[studentName] || [];
        const updatedMessages = { ...allMessages, [studentName]: [...studentMessages, msg] };
        localStorage.setItem('chat_messages_v2', JSON.stringify(updatedMessages));
        setChatMessages([...studentMessages, msg]);
        setNewMessage('');
        window.dispatchEvent(new Event('storage'));
    };

    const handleConfirmCancellation = (cancelSeries = false) => {
        if (!cancelTarget) return;
        const booking = cancelTarget;
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];

        let updatedBookings;
        let cancelledBookings = [];

        if (cancelSeries && booking.recurringId) {
            updatedBookings = allBookings.map(b =>
                (b.recurringId === booking.recurringId && new Date(b.date) >= new Date(booking.date))
                    ? { ...b, status: 'cancelled' }
                    : b
            );
            cancelledBookings = allBookings.filter(b => b.recurringId === booking.recurringId && new Date(b.date) >= new Date(booking.date));
        } else {
            updatedBookings = allBookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b);
            cancelledBookings = [booking];
        }

        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

        const allSlots = JSON.parse(localStorage.getItem('tutor_all_lesson_slots')) || [];
        const updatedSlots = allSlots.map(s => {
            if (cancelledBookings.some(cb => cb.date === s.date && cb.time === s.time)) {
                return { ...s, bookedBy: null };
            }
            return s;
        });
        localStorage.setItem('tutor_all_lesson_slots', JSON.stringify(updatedSlots));

        // Notify Tutor
        cancelledBookings.forEach(b => {
            emailService.sendCancellationNotice(b, 'student');
        });

        window.dispatchEvent(new Event('storage'));
        setNotification({ type: 'success', message: cancelSeries ? 'Entire series cancelled.' : 'Lesson cancelled.' });
        setCancelTarget(null);
    };

    const handleStudentResponse = (booking, accepted) => {
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const updatedBookings = allBookings.map(b => {
            if (b.id === booking.id) {
                if (accepted) {
                    return { ...b, status: 'confirmed', date: booking.teacherProposed.newDate, time: booking.teacherProposed.newTime, teacherProposed: undefined };
                }
                return { ...b, status: 'confirmed', teacherProposed: undefined };
            }
            return b;
        });
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        window.dispatchEvent(new Event('storage'));

        // Notify Teacher
        emailService.sendRescheduleResponseToTeacher(booking, accepted ? 'Accepted' : 'Declined');

        setNotification({ type: 'success', message: accepted ? 'Reschedule Accepted!' : 'Reschedule Declined.' });
    };

    const nextLesson = bookings.find(b => new Date(b.date + 'T' + b.time) > new Date() && b.status !== 'cancelled');
    const unpaidInvoices = history.filter(h => h.paymentStatus === 'Due').length;
    const unreadMessages = chatMessages.filter(m => m.sender === 'Davina' && !m.read).length;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
            {/* Navigation Bar */}
            <nav className="bg-white sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 flex items-center justify-center text-teal-600 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <h1 className="text-lg font-black text-teal-600 tracking-tight">Student dashboard for Davinas Tutoring Platform</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="font-bold text-gray-500 hidden md:block text-sm">Welcome, {displayName}</span>
                        <button onClick={() => navigate('/')} className="text-red-400 hover:text-red-500 flex items-center gap-2 text-xs font-bold bg-red-50 px-3 py-1.5 rounded-lg transition-all">
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Dashboard Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
                {/* Pending Approvals */}
                {bookings.some(b => b.status === 'pending_student_approval') && (
                    <div className="space-y-3">
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <AlertCircle className="text-orange-500" size={18} /> Action Required
                        </h2>
                        {bookings.filter(b => b.status === 'pending_student_approval').map(booking => (
                            <div key={booking.id} className="bg-white border-l-4 border-orange-500 rounded-xl shadow-md p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-sm">Reschedule Proposal</h3>
                                    <p className="text-gray-400 text-xs mt-1">New time: {new Date(booking.teacherProposed.newDate).toLocaleDateString('en-GB')} at {booking.teacherProposed.newTime}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleStudentResponse(booking, true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm"><CheckCircle size={14} /> Accept</button>
                                    <button onClick={() => handleStudentResponse(booking, false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-500 rounded-lg font-bold text-xs">Decline</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Grid Layout */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    {/* Sidebar Tabs (col-span-2) */}
                    <div className="col-span-12 lg:col-span-2 space-y-2">
                        <button onClick={() => setActiveTab('overview')} className={`w-full p-4 rounded-xl text-left font-black flex items-center gap-3 transition-all ${activeTab === 'overview' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <TrendingUp size={20} /> <span className="text-sm uppercase tracking-wider">Overview</span>
                        </button>
                        <button onClick={() => setActiveTab('booking')} className={`w-full p-4 rounded-xl text-left font-black flex items-center justify-between transition-all ${activeTab === 'booking' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3"><Calendar size={20} /> <span className="text-sm uppercase tracking-wider">Book</span></div>
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`w-full p-4 rounded-xl text-left font-black flex items-center gap-3 transition-all ${activeTab === 'history' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <Clock size={20} /> <span className="text-sm uppercase tracking-wider">History</span>
                        </button>
                        <button onClick={() => setActiveTab('invoices')} className={`w-full p-4 rounded-xl text-left font-black flex items-center justify-between transition-all ${activeTab === 'invoices' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3"><CreditCard size={20} /> <span className="text-sm uppercase tracking-wider">Invoices</span></div>
                        </button>
                        <button onClick={() => setActiveTab('messages')} className={`w-full p-4 rounded-xl text-left font-black flex items-center justify-between transition-all ${activeTab === 'messages' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3"><MessageSquare size={20} /> <span className="text-sm uppercase tracking-wider">Messages</span></div>
                            {unreadMessages > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'messages' ? 'bg-white text-teal-600' : 'bg-red-500 text-white'}`}>
                                    {unreadMessages}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Content Pane (col-span-10) */}
                    <div className="col-span-12 lg:col-span-10">
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                {/* Next Focus Hero */}
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex-1 text-center md:text-left">
                                            <h3 className="text-teal-300 font-black uppercase tracking-[0.2em] text-[10px] mb-2 flex items-center gap-2 justify-center md:justify-start">
                                                <Star size={14} fill="currentColor" /> Next Lesson Focus
                                            </h3>
                                            <div className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight min-h-[40px]">
                                                {history.length > 0 && history[0].next_steps && !history[0].next_steps.toUpperCase().includes('SSSS')
                                                    ? history[0].next_steps
                                                    : "N/A - No specific focus set"}
                                            </div>
                                            <div className="flex items-center gap-3 text-purple-100 font-bold opacity-80 text-xs justify-center md:justify-start">
                                                <Calendar size={12} /> <span>Next Lesson: {nextLesson ? `${new Date(nextLesson.date).toLocaleDateString('en-GB')} at ${nextLesson.time}` : "Not Scheduled"}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => {
                                            if (nextLesson) {
                                                handleJoinLesson(nextLesson);
                                            } else {
                                                setActiveTab('booking');
                                            }
                                        }} className="bg-white text-purple-600 px-8 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:bg-teal-50 transition-all shadow-xl hover:scale-105 active:scale-95 text-lg">
                                            {nextLesson ? 'Start Lesson' : 'Book Lesson'} <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Upcoming Lessons */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                            <Video className="text-teal-500" size={24} /> Upcoming Lessons
                                        </h2>
                                    </div>

                                    {bookings.filter(b => new Date(b.date + 'T' + b.time) > new Date() && b.status !== 'cancelled').length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                            <Calendar size={48} className="mx-auto mb-4 text-gray-100" />
                                            <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No upcoming lessons</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {bookings.filter(b => new Date(b.date + 'T' + b.time) > new Date() && b.status !== 'cancelled').map(booking => (
                                                <div key={booking.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all duration-500 group">
                                                    <div className="flex items-center gap-6 min-w-[200px]">
                                                        <div className="bg-teal-50 text-teal-600 p-4 rounded-2xl text-center min-w-[80px] shadow-sm group-hover:bg-teal-500 group-hover:text-white transition-all duration-500">
                                                            <div className="text-[10px] font-black uppercase tracking-widest mb-1">{new Date(booking.date).toLocaleDateString('en-GB', { month: 'short' })}</div>
                                                            <div className="text-2xl font-black">{new Date(booking.date).getDate()}</div>
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-lg text-gray-900 tracking-tighter">{new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                                                            <div className="text-gray-400 font-bold flex items-center gap-2 mt-0.5 text-sm"><Clock size={16} className="text-teal-500" /> {booking.time}</div>

                                                            {/* Status Badge */}
                                                            <div className="mt-2">
                                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${booking.status === 'pending_approval'
                                                                    ? 'bg-purple-100 text-purple-700'
                                                                    : booking.type === 'consultation'
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : booking.paymentStatus?.toLowerCase() === 'paid'
                                                                            ? 'bg-green-100 text-green-700'
                                                                            : 'bg-red-50 text-red-600'
                                                                    }`}>
                                                                    {booking.status === 'pending_approval' ? 'Pending Approval' : (booking.type === 'consultation' ? 'Free Consultation' : (booking.paymentStatus === 'Due' ? 'Payment Due' : booking.paymentStatus))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 w-full">
                                                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 ml-1">Lesson Focus</div>
                                                        <div onClick={() => setEditNoteTarget({ booking, currentNote: booking.subject || '' })} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-start justify-between group cursor-pointer hover:border-teal-200 transition-all shadow-inner bg-white min-h-[80px]">
                                                            <p className={`text-sm leading-relaxed font-bold tracking-tight ${booking.subject ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                                                                {booking.subject || "Add notes for your tutor..."}
                                                            </p>
                                                            <div className="text-teal-500 bg-teal-50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"><FileText size={18} /></div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-center lg:items-end gap-3 min-w-[280px]">
                                                        <div className="flex items-center gap-2 w-full">
                                                            {booking.status === 'pending_approval' ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApproval(booking)}
                                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest"
                                                                    >
                                                                        Approve {booking.recurringId && 'Series'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDenial(booking)}
                                                                        className="bg-red-50 text-red-600 px-5 py-3 rounded-xl font-black text-xs hover:bg-red-600 hover:text-white transition-all border border-red-100 uppercase tracking-widest"
                                                                    >
                                                                        Deny
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const url = generateGoogleCalendarUrl({
                                                                                date: booking.date,
                                                                                time: booking.time,
                                                                                subject: booking.subject || 'Tutoring Session'
                                                                            });
                                                                            window.open(url, '_blank');
                                                                        }}
                                                                        className="flex items-center justify-center p-3 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-gray-100"
                                                                        title="Add to Calendar"
                                                                    >
                                                                        <Calendar size={18} />
                                                                    </button>
                                                                    <button onClick={() => handleJoinLesson(booking)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest">
                                                                        <Video size={16} /> Start Lesson
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full">
                                                            <button
                                                                onClick={() => initiateReschedule(booking)}
                                                                className="flex-1 py-2 text-xs font-black text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all border border-purple-100 flex items-center justify-center gap-2 uppercase tracking-widest"
                                                            >
                                                                <Clock size={14} /> Reschedule
                                                            </button>
                                                            <button onClick={() => { setCancelTarget(booking); }} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-gray-100" title="Cancel"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'booking' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3"><Calendar className="text-purple-600" size={24} /> Book New Lesson</h2>
                                {availableLessons.length === 0 ? (
                                    <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm">
                                        <Clock size={48} className="mx-auto mb-4 text-gray-100" />
                                        <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No slots found</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        {Object.entries(availableLessons
                                            .filter(slot => {
                                                if (selectedSlot) {
                                                    return slot.id === selectedSlot.id;
                                                }
                                                return true;
                                            })
                                            .reduce((groups, slot) => {
                                                const dateKey = slot.date;
                                                if (!groups[dateKey]) groups[dateKey] = [];
                                                groups[dateKey].push(slot);
                                                return groups;
                                            }, {})).map(([date, slots]) => (
                                                <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                                        <h3 className="text-lg font-black text-gray-900">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                                                        <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 shadow-sm">{slots.length} SLOTS</span>
                                                    </div>
                                                    <div className="p-6">
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                            {slots.map(slot => {
                                                                const isSelected = selectedSlot?.id === slot.id;
                                                                return (
                                                                    <button
                                                                        key={slot.id}
                                                                        onClick={() => isSelected ? setSelectedSlot(null) : handleBookLesson(slot)}
                                                                        className={`p-4 rounded-xl font-black text-sm transition-all text-center shadow-sm border ${isSelected
                                                                            ? 'bg-teal-500 border-teal-600 text-white'
                                                                            : 'bg-blue-50/80 border-blue-100 text-blue-700 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/50'
                                                                            }`}
                                                                    >
                                                                        {new Date(`2000-01-01T${slot.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3"><Clock className="text-purple-600" size={24} /> Learning History</h2>
                                {history.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
                                        <p className="text-gray-400 font-black text-xs uppercase tracking-widest">No past sessions yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 relative before:absolute before:left-[35px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100">
                                        {history.map((session, idx) => (
                                            <div key={idx} className="relative pl-16">
                                                <div className="absolute left-[28px] top-6 w-4 h-4 bg-white border-2 border-purple-500 rounded-full z-10 shadow-sm" />
                                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 transition-all overflow-hidden relative">

                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                                        <div>
                                                            <h4 className="text-lg font-black text-gray-900 mb-0.5">{session.topic || session.subject || "Session"}</h4>
                                                            <div className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                                                <span>{new Date(session.date).toLocaleDateString('en-GB')}</span>
                                                                <span>•</span>
                                                                <span>{session.duration || '60'} MINS</span>
                                                            </div>
                                                        </div>
                                                        {session.rating ? (
                                                            <div className="flex gap-0.5 bg-yellow-50 px-3 py-1.5 rounded-lg">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} size={14} className={i < session.rating ? "text-yellow-400 fill-current" : "text-gray-200"} />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => initiateReview(session)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest">Rate Lesson</button>
                                                        )}
                                                    </div>

                                                    {/* 4 Feedback Boxes as requested */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                                            <h5 className="font-black text-green-700 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><CheckCircle size={14} /> Went Well</h5>
                                                            <p className="text-gray-700 font-semibold text-xs leading-relaxed">{session.feedback_well || "No comment."}</p>
                                                        </div>
                                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                                            <h5 className="font-black text-orange-700 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowRight size={14} /> To Improve</h5>
                                                            <p className="text-gray-700 font-semibold text-xs leading-relaxed">{session.feedback_improve || "No comment."}</p>
                                                        </div>
                                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                                            <h5 className="font-black text-blue-700 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><Star size={14} /> Focus</h5>
                                                            <p className="text-gray-700 font-semibold text-xs leading-relaxed">{session.feedback_focus || "General improvement areas."}</p>
                                                        </div>
                                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                            <h5 className="font-black text-purple-700 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={14} /> Next Steps</h5>
                                                            <p className="text-gray-700 font-semibold text-xs leading-relaxed">{session.next_steps || session.nextSteps || "Continue regular practice."}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'invoices' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3"><CreditCard className="text-teal-600" size={24} /> Invoices & Billing</h2>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 font-black text-gray-400 text-[9px] uppercase tracking-widest">Date</th>
                                                    <th className="p-4 font-black text-gray-400 text-[9px] uppercase tracking-widest">Description</th>
                                                    <th className="p-4 font-black text-gray-400 text-[9px] uppercase tracking-widest">Amount</th>
                                                    <th className="p-4 font-black text-gray-400 text-[9px] uppercase tracking-widest">Status</th>
                                                    <th className="p-4 font-black text-gray-400 text-[9px] uppercase tracking-widest text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {[...bookings, ...history].sort((a, b) => new Date(a.date) - new Date(b.date)).map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-4"><div className="font-bold text-gray-900 text-xs">{new Date(item.date).toLocaleDateString('en-GB')}</div></td>
                                                        <td className="p-4"><div className="font-bold text-gray-600 text-xs">{item.subject || item.topic || "Tutoring Session"}</div></td>
                                                        <td className="p-4 font-black text-gray-900 text-sm">£{item.cost || 30}</td>
                                                        <td className="p-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-100'}`}>{item.paymentStatus || 'Due'}</span></td>
                                                        <td className="p-4 text-right">
                                                            {item.paymentStatus !== 'Paid' ? (
                                                                <button onClick={() => handlePay(item)} className="text-[10px] font-black text-teal-600 underline uppercase tracking-widest">Pay via Stripe</button>
                                                            ) : (
                                                                <button onClick={() => setReceiptTarget(item)} className="text-[10px] font-black text-gray-400 underline uppercase tracking-widest">Receipt</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'messages' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3"><MessageSquare className="text-teal-500" size={24} /> Messaging</h2>
                                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden flex flex-col" style={{ height: '600px' }}>
                                    <div className="p-6 bg-teal-500 text-white flex items-center gap-3 shadow-md">
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-black text-lg">D</div>
                                        <div>
                                            <div className="font-black text-lg leading-none">Davina (Your Tutor)</div>
                                            <div className="text-teal-100 text-[10px] font-bold uppercase tracking-widest mt-1">Direct Message Channel</div>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                                        {chatMessages.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-gray-300 font-black uppercase tracking-[0.2em] italic text-xs">No messages yet. Say hello!</div>
                                        ) : (
                                            chatMessages.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.sender === displayName ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.sender === displayName ? 'bg-teal-600 text-white rounded-br-md' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'}`}>
                                                        <p className="text-sm font-bold leading-relaxed">{msg.message}</p>
                                                        <div className={`text-[9px] mt-2 font-black uppercase opacity-60`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-6 bg-white border-t border-gray-100">
                                        <div className="flex gap-3">
                                            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-teal-500 transition-all font-bold text-sm" />
                                            <button onClick={handleSendMessage} className="bg-teal-500 text-white px-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-md active:scale-95">Send</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showRescheduleModal && rescheduleTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
                        <Clock className="mx-auto text-purple-600 mb-4" size={40} />
                        <h3 className="text-xl font-black mb-2">Reschedule Lesson?</h3>
                        <p className="text-gray-500 mb-6 font-bold text-sm">
                            Select a new time slot from the booking calendar. Your tutor will be notified of the change request.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmRescheduleStart} className="w-full py-3 bg-purple-600 text-white rounded-xl font-black shadow-lg uppercase tracking-widest text-xs hover:bg-purple-700 transition-all">Choose New Slot</button>
                            <button onClick={() => setShowRescheduleModal(false)} className="w-full py-3 text-gray-400 font-black uppercase tracking-widest text-xs">Nevermind</button>
                        </div>
                    </div>
                </div>
            )}

            {showBookingModal && selectedSlot && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-y-auto max-h-[90vh] animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="bg-teal-600 p-6 text-white relative">
                            <h3 className="text-xl font-black mb-1">{rescheduleTarget ? 'Confirm Reschedule' : 'Secure Your Lesson'}</h3>
                            <p className="text-teal-100 font-bold opacity-80 uppercase tracking-widest text-[10px]">{new Date(selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedSlot.time}</p>
                            {!rescheduleTarget && <div className="absolute top-6 right-6 font-black text-2xl">£{hourlyRate}</div>}
                        </div>
                        <div className="p-6 space-y-4">
                            {rescheduleTarget && (
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <h4 className="font-black text-purple-800 text-[10px] uppercase tracking-widest mb-1">Current Lesson:</h4>
                                    <p className="text-gray-600 font-bold text-sm">{new Date(rescheduleTarget.date).toLocaleDateString('en-GB')} at {rescheduleTarget.time}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-gray-400 font-black uppercase tracking-widest text-[9px] mb-2 ml-1">What would you like to cover?</label>
                                <textarea value={bookingSubject} onChange={(e) => setBookingSubject(e.target.value)} placeholder="E.g. Quadratic Equations..." className="w-full border border-gray-200 rounded-xl p-4 focus:border-teal-500 transition-all font-bold text-sm min-h-[100px] bg-gray-50" />
                            </div>
                            {!rescheduleTarget && (
                                <div className="space-y-3">
                                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center justify-between">
                                        <div>
                                            <p className="font-black text-teal-800 text-[10px] uppercase tracking-widest">Enable Recurring?</p>
                                            <p className="text-gray-500 text-[10px] font-bold">Secure this slot weekly</p>
                                        </div>
                                        <button
                                            onClick={() => setIsRecurring(!isRecurring)}
                                            className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all border-2 ${isRecurring
                                                ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                                                : 'bg-white border-gray-200 text-gray-400 hover:border-teal-500 hover:text-teal-500'
                                                }`}
                                        >
                                            {isRecurring ? 'Active' : 'Enable'}
                                        </button>
                                    </div>

                                    {isRecurring && (
                                        <div className="bg-white p-4 rounded-xl border-2 border-teal-500 animate-in slide-in-from-top-2 space-y-4">
                                            <div className="flex items-center gap-2 text-teal-600">
                                                <Star size={16} fill="currentColor" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Recurring Options</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setRecurringType('weekly')}
                                                    className={`p-3 rounded-xl border-2 transition-all text-center ${recurringType === 'weekly' ? 'border-teal-600 bg-teal-50' : 'border-gray-100 hover:border-teal-200'}`}
                                                >
                                                    <div className="text-[10px] font-black uppercase tracking-widest mb-1">Pay Weekly</div>
                                                    <div className="text-lg font-black text-teal-600">£{hourlyRate}</div>
                                                </button>
                                                <button
                                                    onClick={() => setRecurringType('pack')}
                                                    className={`p-3 rounded-xl border-2 transition-all text-center ${recurringType === 'pack' ? 'border-teal-600 bg-teal-50' : 'border-gray-100 hover:border-teal-200'}`}
                                                >
                                                    <div className="text-[10px] font-black uppercase tracking-widest mb-1">Pay Upfront</div>
                                                    <div className="text-lg font-black text-teal-600">£{getBundlePrice(bookingSubject)}</div>
                                                    <div className="text-[8px] font-bold text-teal-500 uppercase mt-1">10-Week Bundle</div>
                                                </button>
                                            </div>

                                            <p className="text-[11px] text-gray-700 font-bold leading-relaxed">
                                                {recurringType === 'pack'
                                                    ? 'Pay for all 10 sessions now and save! Subsequent sessions will be marked as Paid.'
                                                    : 'Secure this slot for the next 9 weeks. You only pay for each lesson as it comes.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => setShowBookingModal(false)} className="flex-1 py-3 text-gray-400 font-black uppercase tracking-widest text-xs">Cancel</button>
                                <button onClick={confirmBooking} className="flex-[2] bg-teal-600 text-white py-3 rounded-xl font-black shadow-lg uppercase tracking-widest text-xs">Confirm {rescheduleTarget ? 'Change' : 'Booking'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editNoteTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black tracking-tight mb-4 text-gray-900">Lesson Notes</h3>
                        <textarea value={editNoteTarget.currentNote} onChange={e => setEditNoteTarget({ ...editNoteTarget, currentNote: e.target.value })} className="w-full border-2 border-gray-50 rounded-2xl p-6 min-h-[160px] font-bold text-lg text-gray-800 bg-gray-50 mb-6" placeholder="Type your notes here..." />
                        <div className="flex gap-4">
                            <button onClick={() => setEditNoteTarget(null)} className="flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-xs">Discard</button>
                            <button onClick={handleSaveNote} className="flex-[2] py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">Save Notes</button>
                        </div>
                    </div>
                </div>
            )}

            {showReviewModal && reviewTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-black tracking-tight mb-6">How was your lesson?</h3>
                        <div className="flex justify-center gap-1 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setReviewRating(star)} className={`p-1 transition-all ${reviewRating >= star ? 'text-yellow-400' : 'text-gray-200'}`}>
                                    <Star size={32} fill="currentColor" />
                                </button>
                            ))}
                        </div>
                        <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Describe your experience..." className="w-full border border-gray-200 bg-gray-50 rounded-2xl p-5 min-h-[120px] mb-6 font-bold text-sm" />
                        <button onClick={submitReview} disabled={!reviewRating} className="w-full py-4 bg-yellow-400 text-gray-900 rounded-2xl font-black disabled:opacity-30 uppercase tracking-widest text-sm shadow-lg">Submit Review</button>
                    </div>
                </div>
            )}

            {notification && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10">
                    <div className={`px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border-2 ${notification.type === 'error' ? 'bg-red-500 border-red-400 text-white' : 'bg-teal-600 border-teal-500 text-white'}`}>
                        {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        <span className="font-black text-sm tracking-tight">{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="ml-2 opacity-50 text-xl">×</button>
                    </div>
                </div>
            )}

            {paymentTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-y-auto max-h-[90vh] text-center p-8">
                        <h3 className="text-2xl font-black mb-6">Make Payment</h3>
                        <div className="bg-gray-50 p-6 rounded-2xl mb-6">
                            <div className="text-3xl font-black text-gray-900">£{paymentTarget.cost || 30}.00</div>
                        </div>
                        <a
                            href={(() => {
                                const subject = (paymentTarget.subject || '').toLowerCase();
                                const isALevel = subject.includes('a-level') || subject.includes('alevel') || subject.includes('a level') || subject.includes('a-lvl');
                                const isGCSE = subject.includes('gcse');
                                const isPack = paymentTarget.cost >= 280;

                                if (isPack) {
                                    if (isALevel) return "https://buy.stripe.com/bJe9ATbUXed93oG4XNeIw03";
                                    if (isGCSE) return "https://buy.stripe.com/9AQ3cv9MT7OP5mE3cl";
                                    return "https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01"; // KS3 Pack
                                } else {
                                    if (isALevel) return "https://buy.stripe.com/9B6fZhgbdd956ASdujeIw02";
                                    if (isGCSE) return "https://buy.stripe.com/14AdR9fjjclh8yQfZ1";
                                    return "https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00"; // KS3 Single
                                }
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs"
                        >
                            Pay via Stripe
                        </a>
                        <button onClick={() => { markAsPaid(paymentTarget.id); setPaymentTarget(null); setNotification({ type: 'success', message: 'Payment recorded!' }); }} className="w-full py-3 text-gray-400 font-black uppercase tracking-widest text-[9px] mt-4">Mark Paid Manually</button>
                        <button onClick={() => setPaymentTarget(null)} className="text-gray-400 font-black uppercase tracking-widest text-[9px] mt-4 block mx-auto">Cancel</button>
                    </div>
                </div>
            )}

            {receiptTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-black mb-6 text-center">Receipt</h3>
                        <div className="space-y-3 border-t border-b border-dashed border-gray-200 py-4 mb-6 text-center">
                            <div className="flex justify-between font-bold text-sm"><span className="text-gray-400 uppercase text-[9px]">Date</span><span>{new Date(receiptTarget.date).toLocaleDateString('en-GB')}</span></div>
                            <div className="flex justify-between font-bold text-sm"><span className="text-gray-400 uppercase text-[9px]">Lesson</span><span>{receiptTarget.subject || "Session"}</span></div>
                            <div className="flex justify-between font-black text-lg"><span className="text-gray-400 uppercase text-[9px] font-bold">Amount</span><span className="text-teal-600">£{receiptTarget.cost || 30}.00</span></div>
                        </div>
                        <button onClick={() => setReceiptTarget(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Close</button>
                    </div>
                </div>
            )}

            {cancelTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center max-h-[90vh] overflow-y-auto">
                        <Trash2 className="mx-auto text-red-500 mb-4" size={40} />
                        <h3 className="text-xl font-black mb-2">Cancel Lesson?</h3>
                        <p className="text-gray-500 mb-6 font-bold text-sm">
                            {cancelTarget.recurringId
                                ? "This session is part of a recurring series. Would you like to cancel just this one, or the entire series?"
                                : `Are you sure you want to cancel your session on ${new Date(cancelTarget.date).toLocaleDateString('en-GB')} at ${cancelTarget.time}?`}
                        </p>
                        <div className="flex flex-col gap-3">
                            {cancelTarget.recurringId ? (
                                <>
                                    <button onClick={() => handleConfirmCancellation(false)} className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-200 transition-all">Cancel Just This One</button>
                                    <button onClick={() => handleConfirmCancellation(true)} className="w-full py-3 bg-red-600 text-white rounded-xl font-black shadow-lg uppercase tracking-widest text-xs hover:bg-red-700 transition-all">Cancel Entire Series</button>
                                </>
                            ) : (
                                <button onClick={() => handleConfirmCancellation()} className="w-full py-3 bg-red-600 text-white rounded-xl font-black shadow-lg uppercase tracking-widest text-xs">Cancel Session</button>
                            )}
                            <button onClick={() => setCancelTarget(null)} className="w-full py-3 text-gray-400 font-black uppercase tracking-widest text-xs">Keep Session</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
