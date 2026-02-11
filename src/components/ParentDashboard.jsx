import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Clock, Calendar, Video, Star, CheckCircle, User, Users,
    TrendingUp, CreditCard, FileText, LogOut, BookOpen,
    PoundSterling, Mail, ArrowRight, Shield, MessageSquare
} from 'lucide-react';
import { emailService } from '../utils/email';

const ParentDashboard = () => {
    const navigate = useNavigate();
    const formatName = (str) => {
        if (!str) return '';
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getStudentLevel = (student) => {
        const subject = (student?.subject || '').toLowerCase();
        if (subject.includes('a-level') || subject.includes('alevel') || subject.includes('a level')) return 'A-Level';
        if (subject.includes('gcse')) return 'GCSE';
        return 'KS3'; // Default to KS3
    };
    const { parentEmail } = useParams();
    const [parent, setParent] = useState(null);
    const [linkedStudents, setLinkedStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [upcomingLessons, setUpcomingLessons] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [notification, setNotification] = useState(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [bookingStep, setBookingStep] = useState('options'); // 'options', 'select'
    const [bookingType, setBookingType] = useState('single'); // 'single', 'pack'
    const [lessonFrequency, setLessonFrequency] = useState('once'); // 'once', 'twice'
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [bookingSubject, setBookingSubject] = useState('');

    useEffect(() => {
        const loadParentData = () => {
            // Load parent account
            const parents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
            const parentAccount = parents.find(p => p.email.toLowerCase() === decodeURIComponent(parentEmail).toLowerCase());

            if (!parentAccount) {
                navigate('/');
                return;
            }

            setParent(parentAccount);

            // Load linked students
            const allStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
            const children = allStudents.filter(s => parentAccount.linkedStudents.includes(s.id));
            setLinkedStudents(children);

            // Auto-select first student
            if (children.length > 0 && !selectedStudent) {
                setSelectedStudent(children[0]);
            }
        };

        loadParentData();
        window.addEventListener('storage', loadParentData);
        return () => window.removeEventListener('storage', loadParentData);
    }, [parentEmail, navigate]);

    useEffect(() => {
        if (!selectedStudent) return;

        const loadStudentData = () => {
            // Load session history
            const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
            const studentHistory = allHistory.filter(h =>
                h.studentId === selectedStudent.id ||
                h.studentName.toLowerCase() === selectedStudent.name.toLowerCase()
            );
            setSessionHistory(studentHistory.reverse()); // Newest first

            // Load upcoming lessons
            const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
            const studentBookings = allBookings.filter(b =>
                (b.studentId === selectedStudent.id ||
                    b.student.toLowerCase() === selectedStudent.name.toLowerCase()) &&
                b.status !== 'cancelled'
            );

            const now = new Date();
            const upcoming = studentBookings
                .filter(b => new Date(b.date + 'T' + b.time) >= now)
                .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

            setUpcomingLessons(upcoming);
        };

        loadStudentData();
        window.addEventListener('storage', loadStudentData);
        return () => window.removeEventListener('storage', loadStudentData);
    }, [selectedStudent]);

    // Update booking subject when student changes
    useEffect(() => {
        if (selectedStudent?.subject) {
            setBookingSubject(selectedStudent.subject);
        }
    }, [selectedStudent]);

    const handlePayment = (invoice) => {
        setIsProcessingPayment(true);

        // Simulate payment processing
        setTimeout(() => {
            // Mark invoice(s) as paid
            if (invoice.id.startsWith('bulk-payment')) {
                // Mark all unpaid invoices as paid
                const paymentDate = new Date().toISOString();

                // Update history
                const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
                const updatedHistory = allHistory.map(h =>
                    h.paymentStatus === 'Due' && (h.studentId === selectedStudent.id || h.studentName === selectedStudent.name)
                        ? { ...h, paymentStatus: 'Paid', paymentDate }
                        : h
                );
                localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));

                // Update bookings
                const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
                const updatedBookings = allBookings.map(b =>
                    b.paymentStatus === 'Due' && (b.studentId === selectedStudent.id || b.student === selectedStudent.name)
                        ? { ...b, paymentStatus: 'Paid', paymentDate }
                        : b
                );
                localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

                setNotification({ type: 'success', message: `Payment of £${invoice.cost} successful! All invoices paid.` });
            } else {
                // Mark single invoice as paid
                const paymentDate = new Date().toISOString();

                // Update history
                const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
                const updatedHistory = allHistory.map(h =>
                    h.id === invoice.id ? { ...h, paymentStatus: 'Paid', paymentDate } : h
                );
                localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));

                // Update bookings
                const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
                const updatedBookings = allBookings.map(b =>
                    b.id === invoice.id ? { ...b, paymentStatus: 'Paid', paymentDate } : b
                );
                localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

                setNotification({ type: 'success', message: `Payment of £${invoice.cost} successful!` });
            }

            window.dispatchEvent(new Event('storage'));
            setIsProcessingPayment(false);
        }, 1500);
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

        // Notify Teacher
        if (lesson.status === 'pending_reschedule') {
            emailService.sendRescheduleResponseToTeacher(lesson, 'Accepted');
        } else {
            emailService.sendNewBookingNotificationToTeacher({
                ...lesson,
                student: lesson.student || selectedStudent?.name
            });
        }

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

        // Notify Teacher
        if (lesson.status === 'pending_reschedule') {
            emailService.sendRescheduleResponseToTeacher(lesson, 'Declined');
        }

        setNotification({ type: 'info', message: 'Lesson proposal denied.' });
    };

    const handleParentReschedule = (lesson) => {
        setRescheduleTarget(lesson);
        setBookingStep('select');
        setBookingType('single');
        setShowRescheduleModal(true);
        setActiveTab('booking');
    };

    const handleParentCancel = (lesson) => {
        if (!window.confirm('Are you sure you want to cancel this lesson?')) return;
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const updatedBookings = allBookings.map(b => b.id === lesson.id ? { ...b, status: 'cancelled' } : b);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        window.dispatchEvent(new Event('storage'));

        // Notify Teacher
        emailService.sendCancellationNotice(lesson, 'student'); // Reuse 'student' logic for parent too
        setNotification({ type: 'info', message: 'Lesson cancelled successfully.' });
    };

    useEffect(() => {
        const slots = JSON.parse(localStorage.getItem('tutor_all_lesson_slots')) || [];
        const bookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const filteredSlots = slots.filter(s =>
            !s.bookedBy && !bookings.some(b => b.date === s.date && b.time === s.time && b.status !== 'cancelled')
        );
        setAvailableSlots(filteredSlots);
    }, [activeTab]);

    useEffect(() => {
        if (!parent) return;

        const loadMessages = () => {
            const allMessages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
            const threadKey = `parent_${parent.email}`;
            setMessages(allMessages[threadKey] || []);
        };

        loadMessages();
        window.addEventListener('storage', loadMessages);
        return () => window.removeEventListener('storage', loadMessages);
    }, [parent]);

    // Mark messages as read when messages tab is active
    useEffect(() => {
        if (activeTab === 'messages' && parent) {
            const allMessages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
            const threadKey = `parent_${parent.email}`;
            const thread = allMessages[threadKey] || [];

            const hasUnread = thread.some(m => m.sender === 'Davina' && !m.read);

            if (hasUnread) {
                const updatedThread = thread.map(m =>
                    m.sender === 'Davina' ? { ...m, read: true } : m
                );
                allMessages[threadKey] = updatedThread;
                localStorage.setItem('chat_messages_v2', JSON.stringify(allMessages));
                setMessages(updatedThread);
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, [activeTab, parent]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !parent) return;

        const allMessages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
        const threadKey = `parent_${parent.email}`;
        const currentThread = allMessages[threadKey] || [];

        const msgObj = {
            id: Date.now(),
            sender: parent.email,
            senderName: parent.email,
            message: newMessage.trim(),
            timestamp: new Date().toISOString(),
            read: false
        };

        const updatedThread = [...currentThread, msgObj];
        allMessages[threadKey] = updatedThread;

        localStorage.setItem('chat_messages_v2', JSON.stringify(allMessages));
        setMessages(updatedThread);
        const sentContent = newMessage.trim();
        setNewMessage('');
        window.dispatchEvent(new Event('storage'));

        // Notify Teacher
        emailService.sendMessageNotification(parent.name, 'davina.potter@outlook.com', sentContent);
    };

    const calculateStats = () => {
        const completed = sessionHistory.length;
        const unpaidInvoices = [...sessionHistory, ...upcomingLessons].filter(item => item.paymentStatus === 'Due');
        const totalDue = unpaidInvoices.reduce((sum, item) => sum + (item.cost || 0), 0);
        const nextLesson = upcomingLessons.length > 0 ? upcomingLessons[0] : null;

        return { completed, unpaidCount: unpaidInvoices.length, totalDue, nextLesson, unpaidInvoices };
    };

    const stats = selectedStudent ? calculateStats() : {};

    if (!parent) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
            {/* Navigation Bar */}
            <nav className="bg-white sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 flex items-center justify-center text-blue-600 rounded-full">
                            <User size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-blue-600 tracking-tight">
                                Parent Portal
                            </h1>
                            <p className="text-xs text-gray-500">Davina's Tutoring Platform</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <p className="font-bold text-gray-700 text-sm">{parent.email}</p>
                            <p className="text-xs text-gray-400">Parent Account</p>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="text-red-400 hover:text-red-500 flex items-center gap-2 text-sm font-bold"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 max-w-6xl mx-auto w-full p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 leading-tight">
                            Welcome back, {parent?.firstName || parent?.name?.split(' ')[0] || 'Parent'}!
                        </h2>
                        <p className="text-gray-500 font-medium">Manage your children's tutoring sessions and payments.</p>
                    </div>
                </div>

                {/* Student Selector */}
                {linkedStudents.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Users size={20} className="text-blue-600" />
                            My Children
                        </h2>
                        <div className="grid gap-3">
                            {linkedStudents.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selectedStudent?.id === student.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-blue-300 bg-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-900">{student.name}</p>
                                            <p className="text-sm text-gray-500">{student.email}</p>
                                        </div>
                                    </div>
                                    {selectedStudent?.id === student.id && (
                                        <CheckCircle className="text-blue-600" size={24} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Students Linked */}
                {linkedStudents.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                        <Users size={48} className="text-blue-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Students Linked</h3>
                        <p className="text-gray-600">Your account hasn't been linked to any students yet.</p>
                    </div>
                )}

                {/* Student Dashboard */}
                {selectedStudent && (
                    <>
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <BookOpen className="text-purple-500" size={24} />
                                    <span className="text-3xl font-bold text-gray-900">{stats.completed}</span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Sessions Completed</p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Calendar className="text-teal-500" size={24} />
                                    <span className="text-3xl font-bold text-gray-900">{upcomingLessons.length}</span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Upcoming Lessons</p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <FileText className="text-orange-500" size={24} />
                                    <span className="text-3xl font-bold text-gray-900">{stats.unpaidCount}</span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Unpaid Invoices</p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <PoundSterling className="text-red-500" size={24} />
                                    <span className="text-3xl font-bold text-gray-900">£{stats.totalDue}</span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Outstanding Balance</p>
                            </div>
                        </div>

                        {/* Quick Payment Section */}
                        {stats.totalDue > 0 && (
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Outstanding Balance</h3>
                                        <p className="text-orange-100 text-sm">Pay now to keep learning on track</p>
                                        <p className="text-3xl font-bold mt-3">£{stats.totalDue}</p>
                                        <p className="text-orange-100 text-xs mt-1">{stats.unpaidCount} unpaid {stats.unpaidCount === 1 ? 'lesson' : 'lessons'}</p>
                                    </div>
                                    <a
                                        href={(() => {
                                            const level = getStudentLevel(selectedStudent);
                                            if (stats.totalDue >= 280) {
                                                return level === 'A-Level' ? "https://buy.stripe.com/5kA6oLe0Y6GHchG4gn" : "https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01";
                                            }
                                            return level === 'A-Level' ? "https://buy.stripe.com/14AdRL4sv2ur9J63cf" : "https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00";
                                        })()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 text-center flex items-center justify-center"
                                    >
                                        {isProcessingPayment ? 'Processing...' : 'Pay via Stripe'}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Next Lesson Card */}
                        {stats.nextLesson && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Clock className="text-teal-600" size={20} />
                                    Next Lesson
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-teal-50 rounded-xl border border-teal-200">
                                    <div>
                                        <p className="font-bold text-gray-900 text-lg">{stats.nextLesson.subject}</p>
                                        <p className="text-gray-600 text-sm mt-1">
                                            {new Date(stats.nextLesson.date).toLocaleDateString('en-GB', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })} at {stats.nextLesson.time}
                                        </p>
                                    </div>
                                    <Calendar className="text-teal-600" size={32} />
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                            <div className="border-b border-gray-200 px-6 py-3">
                                <div className="flex gap-6">
                                    {['overview', 'book', 'messages', 'invoices', 'upcoming'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-3 px-4 font-bold transition-all border-b-2 ${activeTab === tab
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            {tab === 'book' ? 'Book Lesson' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Session History</h3>
                                            {sessionHistory.length > 0 ? (
                                                <div className="space-y-3">
                                                    {sessionHistory.map(session => (
                                                        <div key={session.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <p className="font-bold text-gray-900">{session.subject}</p>
                                                                    <p className="text-sm text-gray-500 mt-1">
                                                                        {new Date(session.endTime || session.date).toLocaleDateString('en-GB')} • {session.duration || '60'} mins
                                                                    </p>
                                                                    <div className="mt-3 space-y-2">
                                                                        {session.feedback_well && (
                                                                            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                                                                <p className="text-[10px] font-bold text-green-800 uppercase mb-0.5">Went Well</p>
                                                                                <p className="text-xs text-gray-700">{session.feedback_well}</p>
                                                                            </div>
                                                                        )}
                                                                        {session.feedback_improve && (
                                                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                                                <p className="text-[10px] font-bold text-amber-800 uppercase mb-0.5">To Improve</p>
                                                                                <p className="text-xs text-gray-700">{session.feedback_improve}</p>
                                                                            </div>
                                                                        )}
                                                                        {session.next_steps && (
                                                                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                                                <p className="text-[10px] font-bold text-blue-800 uppercase mb-0.5">Focus</p>
                                                                                <p className="text-xs text-gray-700">{session.next_steps}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    {session.rating && (
                                                                        <div className="flex items-center gap-1">
                                                                            <Star className="text-yellow-500 fill-yellow-500" size={16} />
                                                                            <span className="font-bold text-sm">{session.rating}/5</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-center py-8">No session history yet</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Book Tab */}
                                {activeTab === 'book' && (
                                    <div className="space-y-8">
                                        {bookingStep === 'options' ? (
                                            <>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Pay-As-You-Go Sessions</h3>
                                                    <p className="text-sm text-gray-500 mb-4">Targeted support without long-term commitments.</p>
                                                    <div className="flex flex-col gap-4">
                                                        <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-3 bg-white rounded-xl shadow-sm"><BookOpen className="text-blue-600" size={24} /></div>
                                                                <div>
                                                                    <p className="font-bold text-blue-900 text-lg">Single Lesson</p>
                                                                    <div className="flex flex-col text-blue-600 font-bold text-xs">
                                                                        {getStudentLevel(selectedStudent) === 'KS3' && <p>KS3: £30.00 / Session</p>}
                                                                        {getStudentLevel(selectedStudent) === 'GCSE' && <p>GCSE: £30.00 / Session</p>}
                                                                        {getStudentLevel(selectedStudent) === 'A-Level' && <p>A-Level: £40.00 / Session</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setBookingStep('select');
                                                                    setBookingType('single');
                                                                }}
                                                                className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md text-center"
                                                            >
                                                                Select Time & Book
                                                            </button>
                                                        </div>

                                                        <div className="p-6 bg-teal-50 rounded-2xl border-2 border-teal-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-3 bg-white rounded-xl shadow-sm"><Clock className="text-teal-600" size={24} /></div>
                                                                <div>
                                                                    <p className="font-bold text-teal-900 text-lg">Weekly Recurring (Pay Weekly)</p>
                                                                    <div className="flex flex-col text-teal-600 font-bold text-xs">
                                                                        {getStudentLevel(selectedStudent) === 'KS3' && <p>KS3: £30.00 / Week</p>}
                                                                        {getStudentLevel(selectedStudent) === 'GCSE' && <p>GCSE: £30.00 / Week</p>}
                                                                        {getStudentLevel(selectedStudent) === 'A-Level' && <p>A-Level: £40.00 / Week</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setBookingStep('select');
                                                                    setBookingType('weekly');
                                                                }}
                                                                className="w-full md:w-auto px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-md text-center"
                                                            >
                                                                Select Time & Book
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="text-lg font-bold text-gray-800">Recurring Weekly Slots</h3>
                                                        <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-purple-200">Recommended</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mb-4">Secure your preferred time slot every week and save with upfront payment.</p>
                                                    <div className="p-6 bg-purple-50 rounded-2xl border-2 border-purple-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-white rounded-xl shadow-sm"><Calendar className="text-purple-600" size={24} /></div>
                                                            <div>
                                                                <p className="font-bold text-purple-900 text-lg">10-Week Recurring Pack</p>
                                                                <div className="flex flex-col gap-1 text-purple-600 font-bold text-xs">
                                                                    {getStudentLevel(selectedStudent) === 'KS3' && (
                                                                        <p>
                                                                            KS3: £280.00 <span className="text-purple-300 line-through text-[10px] ml-1">£300.00</span>
                                                                            <span className="ml-1 bg-purple-200 text-purple-800 text-[8px] px-1 py-0.5 rounded">SAVE £20</span>
                                                                        </p>
                                                                    )}
                                                                    {getStudentLevel(selectedStudent) === 'GCSE' && (
                                                                        <p>
                                                                            GCSE: £280.00 <span className="text-purple-300 line-through text-[10px] ml-1">£300.00</span>
                                                                            <span className="ml-1 bg-purple-200 text-purple-800 text-[8px] px-1 py-0.5 rounded">SAVE £20</span>
                                                                        </p>
                                                                    )}
                                                                    {getStudentLevel(selectedStudent) === 'A-Level' && (
                                                                        <p>
                                                                            A-Level: £370.00 <span className="text-purple-300 line-through text-[10px] ml-10">£400.00</span>
                                                                            <span className="ml-1 bg-purple-200 text-purple-800 text-[8px] px-1 py-0.5 rounded">SAVE £30</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setBookingStep('select');
                                                                setBookingType('pack');
                                                                setLessonFrequency('once');
                                                            }}
                                                            className="w-full md:w-auto px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md text-center"
                                                        >
                                                            Select Time & Book
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
                                                    <Shield className="text-gray-400 mt-1" size={20} />
                                                    <div>
                                                        <p className="font-bold text-gray-700 text-sm">Payment Options</p>
                                                        <p className="text-xs text-gray-500 leading-relaxed mt-1">
                                                            Payments are processed securely via Stripe. We support all major Credit/Debit cards and **Bacs Direct Debit** for automated recurring payments.
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <button onClick={() => setBookingStep('options')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                                        <ArrowRight className="rotate-180" size={24} />
                                                    </button>
                                                    <h3 className="text-xl font-bold text-gray-800">Select an Available Slot</h3>
                                                </div>

                                                {bookingType === 'pack' && (
                                                    <div className="bg-purple-50 p-4 rounded-xl mb-6">
                                                        <label className="block text-xs font-bold text-purple-700 uppercase mb-2">Scheduling Frequency</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => { setLessonFrequency('once'); setSelectedSlots([]); setSelectedSlot(null); }}
                                                                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${lessonFrequency === 'once' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 border border-purple-200'}`}
                                                            >
                                                                Once a Week (10 Weeks)
                                                            </button>
                                                            <button
                                                                onClick={() => { setLessonFrequency('twice'); setSelectedSlots([]); setSelectedSlot(null); }}
                                                                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${lessonFrequency === 'twice' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 border border-purple-200'}`}
                                                            >
                                                                Twice a Week (5 Weeks)
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-purple-500 mt-2 italic text-center">
                                                            {lessonFrequency === 'once' ? "1 lesson per week for 10 consecutive weeks." : "2 lessons per week for 5 consecutive weeks."}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="mb-4">
                                                    {bookingType === 'pack' && lessonFrequency === 'twice' ? (
                                                        <p className="text-sm font-bold text-purple-700">Please select TWO weekly slots:</p>
                                                    ) : (
                                                        <p className="text-sm font-bold text-blue-700">Please select your preferred time slot:</p>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                                    {availableSlots.length === 0 ? (
                                                        <div className="col-span-full p-12 text-center text-gray-400 italic bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                                            No open slots currently available. Please contact Davina.
                                                        </div>
                                                    ) : (
                                                        availableSlots.filter(slot => {
                                                            if (selectedSlot && (bookingType === 'single' || bookingType === 'weekly')) {
                                                                return slot.id === selectedSlot.id;
                                                            }
                                                            return true;
                                                        }).map(slot => {
                                                            const isSelected = bookingType === 'pack' && lessonFrequency === 'twice'
                                                                ? selectedSlots.some(s => s.id === slot.id)
                                                                : selectedSlot?.id === slot.id;

                                                            return (
                                                                <button
                                                                    key={slot.id}
                                                                    onClick={() => {
                                                                        if (bookingType === 'pack' && lessonFrequency === 'twice') {
                                                                            if (selectedSlots.find(s => s.id === slot.id)) {
                                                                                setSelectedSlots(selectedSlots.filter(s => s.id !== slot.id));
                                                                            } else if (selectedSlots.length < 2) {
                                                                                setSelectedSlots([...selectedSlots, slot]);
                                                                            } else {
                                                                                setSelectedSlots([selectedSlots[1], slot]); // Cycle
                                                                            }
                                                                        } else if (selectedSlot?.id === slot.id) {
                                                                            setSelectedSlot(null); // Deselect
                                                                        } else {
                                                                            setSelectedSlot(slot);
                                                                        }
                                                                    }}
                                                                    className={`p-4 rounded-2xl border-2 transition-all text-left ${isSelected
                                                                        ? 'border-blue-600 bg-blue-50'
                                                                        : 'border-gray-100 hover:border-blue-200 bg-white'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="font-bold text-gray-900">{new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                                        {isSelected && (bookingType === 'single' || bookingType === 'weekly') ? (
                                                                            <ArrowRight size={16} className="text-blue-500 rotate-180" onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); }} title="Change time" />
                                                                        ) : (
                                                                            <Clock size={16} className="text-blue-500" />
                                                                        )}
                                                                    </div>
                                                                    <div className="text-lg font-black text-blue-600">{slot.time}</div>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {((bookingType === 'pack' && lessonFrequency === 'twice' && selectedSlots.length === 2) || (selectedSlot)) && (
                                                    <div className="bg-blue-600 p-6 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl animate-in slide-in-from-bottom-4">
                                                        <div>
                                                            <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mb-1">Confirm Selection</p>
                                                            <h4 className="text-xl font-black">
                                                                {bookingType === 'pack' && lessonFrequency === 'twice' ? (
                                                                    `Recurring: ${selectedSlots[0].time} & ${selectedSlots[1].time}`
                                                                ) : (
                                                                    `${new Date(selectedSlot.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} at ${selectedSlot.time}`
                                                                )}
                                                            </h4>
                                                            {(bookingType === 'pack' || bookingType === 'weekly') && (
                                                                <p className="text-sm text-blue-100 mt-1 font-medium">
                                                                    Repeats weekly on {new Date(selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'long' })}s
                                                                    {bookingType === 'pack' ? ` for ${lessonFrequency === 'twice' ? '5' : '10'} weeks` : ''}
                                                                </p>
                                                            )}
                                                            <div className="mt-2">
                                                                <select
                                                                    value={bookingSubject}
                                                                    onChange={(e) => setBookingSubject(e.target.value)}
                                                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-white/50 w-full"
                                                                >
                                                                    <option value="KS3 Maths" className="text-gray-900">KS3 Maths</option>
                                                                    <option value="GCSE Maths" className="text-gray-900">GCSE Maths</option>
                                                                    <option value="GCSE Sociology" className="text-gray-900">GCSE Sociology</option>
                                                                    <option value="A-Level Sociology" className="text-gray-900">A-Level Sociology</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 w-full md:w-auto">
                                                            <button
                                                                onClick={() => {
                                                                    // We register the booking and notify teacher
                                                                    const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];

                                                                    if (rescheduleTarget) {
                                                                        const updatedBookings = allBookings.map(b => {
                                                                            if (b.id === rescheduleTarget.id) {
                                                                                return {
                                                                                    ...b,
                                                                                    status: 'pending_reschedule',
                                                                                    requestedDate: selectedSlot.date,
                                                                                    requestedTime: selectedSlot.time,
                                                                                    requestedSlotId: selectedSlot.id,
                                                                                    paymentStatus: b.paymentStatus || 'Due' // Preserve payment status
                                                                                };
                                                                            }
                                                                            return b;
                                                                        });
                                                                        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

                                                                        emailService.sendRescheduleRequest({
                                                                            ...rescheduleTarget,
                                                                            requestedDate: selectedSlot.date,
                                                                            requestedTime: selectedSlot.time
                                                                        }, 'student'); // teacher Notification triggered within

                                                                        setNotification({ type: 'success', message: 'Reschedule request sent to Davina!' });
                                                                        setRescheduleTarget(null);
                                                                        setActiveTab('upcoming');
                                                                    } else {
                                                                        const bookingId = selectedSlot.id;
                                                                        const newBooking = {
                                                                            id: bookingId,
                                                                            date: selectedSlot.date,
                                                                            time: selectedSlot.time,
                                                                            student: selectedStudent.name,
                                                                            studentId: selectedStudent.id,
                                                                            type: bookingType === 'pack' ? 'pack' : (bookingType === 'weekly' ? 'weekly' : 'lesson'),
                                                                            bookedAt: new Date().toISOString(),
                                                                            status: 'confirmed',
                                                                            paymentStatus: 'Due',
                                                                            cost: (() => {
                                                                                const level = getStudentLevel(selectedStudent);
                                                                                const isGCSE = level === "GCSE";
                                                                                const isALevel = level === "A-Level";

                                                                                if (bookingType === 'pack') {
                                                                                    if (isALevel) return 370;
                                                                                    if (isGCSE) return 280;
                                                                                    return 280;
                                                                                } else {
                                                                                    if (isALevel) return 40;
                                                                                    if (isGCSE) return 30;
                                                                                    return 30;
                                                                                }
                                                                            })()
                                                                        };

                                                                        // Handle Recurring (10 weeks)
                                                                        // Handle Recurring (10 weeks)
                                                                        if (bookingType === 'pack' || bookingType === 'weekly') {
                                                                            const bookingsToCreate = [];
                                                                            // Always book 10 sessions (1 current + 9 future)
                                                                            const slotsToBook = [selectedSlot];
                                                                            const recurringId = `rec_${Date.now()}`;
                                                                            let totalCreated = 0;

                                                                            slotsToBook.forEach((baseSlot, slotIdx) => {
                                                                                // Loop 10 times for 10 weeks
                                                                                for (let i = 0; i < 10; i++) {
                                                                                    const date = new Date(baseSlot.date);
                                                                                    date.setDate(date.getDate() + (i * 7));

                                                                                    bookingsToCreate.push({
                                                                                        ...newBooking,
                                                                                        id: `${baseSlot.id}_${i}_${Date.now()}_${slotIdx}`,
                                                                                        date: date.toISOString().split('T')[0],
                                                                                        time: baseSlot.time,
                                                                                        subject: bookingSubject,
                                                                                        recurringId: recurringId,
                                                                                        status: 'confirmed',
                                                                                        paymentStatus: totalCreated === 0 ? 'Due' : (bookingType === 'pack' ? 'Paid' : 'Upcoming'),
                                                                                        cost: totalCreated === 0 ? newBooking.cost : (bookingType === 'pack' ? 0 : newBooking.cost)
                                                                                    });
                                                                                    totalCreated++;
                                                                                }
                                                                            });
                                                                            localStorage.setItem('tutor_bookings', JSON.stringify([...allBookings, ...bookingsToCreate]));
                                                                        } else {
                                                                            localStorage.setItem('tutor_bookings', JSON.stringify([...allBookings, { ...newBooking, subject: bookingSubject }]));
                                                                        }

                                                                        // Mark slot as booked
                                                                        const allSlots = JSON.parse(localStorage.getItem('tutor_all_lesson_slots')) || [];
                                                                        const updatedSlots = allSlots.map(s => s.id === selectedSlot.id ? { ...s, bookedBy: selectedStudent.name } : s);
                                                                        localStorage.setItem('tutor_all_lesson_slots', JSON.stringify(updatedSlots));

                                                                        // Auto-populate Teacher Student Roster
                                                                        const allStudents = JSON.parse(localStorage.getItem('tutor_students') || '[]');
                                                                        const studentExists = allStudents.some(s => s.id === selectedStudent.id || s.name === selectedStudent.name);

                                                                        if (!studentExists) {
                                                                            const newStudent = {
                                                                                id: selectedStudent.id || Date.now(),
                                                                                name: selectedStudent.name,
                                                                                email: parent.email, // Link to parent's email for now
                                                                                joinedAt: new Date().toISOString(),
                                                                                isNew: true
                                                                            };
                                                                            allStudents.push(newStudent);
                                                                            localStorage.setItem('tutor_students', JSON.stringify(allStudents));

                                                                            // Ensure parent is linked
                                                                            const parents = JSON.parse(localStorage.getItem('tutor_parents') || '[]');
                                                                            const pIndex = parents.findIndex(p => p.email === parent.email);
                                                                            if (pIndex !== -1) {
                                                                                if (!parents[pIndex].linkedStudents.includes(newStudent.id)) {
                                                                                    parents[pIndex].linkedStudents.push(newStudent.id);
                                                                                    localStorage.setItem('tutor_parents', JSON.stringify(parents));
                                                                                }
                                                                            }
                                                                        }

                                                                        // Notify Teacher
                                                                        emailService.sendNewBookingNotificationToTeacher({
                                                                            ...newBooking,
                                                                            recurringId: bookingType !== 'single' ? `recurring_${Date.now()}` : undefined
                                                                        });

                                                                        // Open Stripe in new tab
                                                                        const stripeLink = (() => {
                                                                            const level = getStudentLevel(selectedStudent);
                                                                            const isGCSE = level === "GCSE";
                                                                            const isALevel = level === "A-Level";

                                                                            if (bookingType === 'pack') {
                                                                                if (isALevel) return "https://buy.stripe.com/14AdR95wz3yv5mE8wM"; // A-Level Pack
                                                                                if (isGCSE) return "https://buy.stripe.com/9AQ3cv9MT7OP5mE3cl"; // GCSE Pack
                                                                                return "https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01"; // KS3 Pack (fallback to single if pack not defined, but pack price is high so distinct link needed. Assuming provided links are correct)
                                                                                // Wait, user provided links in previous prompts. I trust these are correct.
                                                                            } else {
                                                                                if (isALevel) return "https://buy.stripe.com/bIY3cveff7OP8yQbIL"; // A-Level Single
                                                                                if (isGCSE) return "https://buy.stripe.com/14AdR9fjjclh8yQfZ1"; // GCSE Single
                                                                                return "https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00"; // KS3 Single
                                                                            }
                                                                        })();
                                                                        window.open(stripeLink, '_blank');

                                                                        setNotification({ type: 'success', message: 'Booking registered! Please complete payment in the new tab.' });
                                                                        setActiveTab('overview');
                                                                    }
                                                                    window.dispatchEvent(new Event('storage'));
                                                                }}
                                                                className="flex-1 md:flex-none px-10 py-4 bg-white text-blue-600 rounded-xl font-black hover:bg-gray-50 transition-all text-center shadow-lg"
                                                            >
                                                                {rescheduleTarget ? 'Confirm Reschedule' : 'Confirm & Pay via Stripe'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Messages Tab */}
                                {activeTab === 'messages' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-gray-800">Chat with Davina</h3>
                                            <span className="text-xs text-green-500 font-bold flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Davina is usually active
                                            </span>
                                        </div>

                                        <div className="bg-gray-50 rounded-2xl border border-gray-100 flex flex-col h-[500px]">
                                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                                {messages.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                                            <MessageSquare size={32} />
                                                        </div>
                                                        <p className="font-bold text-gray-900">No messages yet</p>
                                                        <p className="text-sm text-gray-500 mt-1">Send a message to Davina to start the conversation.</p>
                                                    </div>
                                                ) : (
                                                    messages.map(msg => (
                                                        <div key={msg.id} className={`flex ${msg.sender === parent.email ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.sender === parent.email
                                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                                }`}>
                                                                <p className="text-sm leading-relaxed">{msg.message}</p>
                                                                <p className={`text-[10px] mt-2 font-bold opacity-60 ${msg.sender === parent.email ? 'text-white' : 'text-gray-400'}`}>
                                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newMessage}
                                                        onChange={(e) => setNewMessage(e.target.value)}
                                                        placeholder="Type your message here..."
                                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!newMessage.trim()}
                                                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        Send <ArrowRight size={18} />
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* Invoices Tab */}
                                {activeTab === 'invoices' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">Payment History & Invoices</h3>
                                        {stats.unpaidInvoices && stats.unpaidInvoices.length > 0 ? (
                                            stats.unpaidInvoices.map(invoice => (
                                                <div key={invoice.id} className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{invoice.subject || 'Lesson'}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {new Date(invoice.date).toLocaleDateString()} • £{invoice.cost}
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={(() => {
                                                            const level = getStudentLevel(selectedStudent);
                                                            const isPack = invoice.cost >= 280;
                                                            if (isPack) {
                                                                return level === 'A-Level' ? "https://buy.stripe.com/5kA6oLe0Y6GHchG4gn" : "https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01";
                                                            } else {
                                                                return level === 'A-Level' ? "https://buy.stripe.com/14AdRL4sv2ur9J63cf" : "https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00";
                                                            }
                                                        })()}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-orange-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-700 transition-all inline-block text-center"
                                                    >
                                                        Pay via Stripe
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">All invoices are paid! 🎉</p>
                                        )}

                                        {/* Paid History */}
                                        <div className="mt-8">
                                            <h4 className="font-bold text-gray-700 mb-3">Paid Invoices</h4>
                                            <div className="space-y-2">
                                                {[...sessionHistory, ...upcomingLessons]
                                                    .filter(item => item.paymentStatus === 'Paid')
                                                    .slice(0, 10)
                                                    .map(invoice => (
                                                        <div key={invoice.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-gray-900 text-sm">{invoice.subject || 'Lesson'}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(invoice.date).toLocaleDateString('en-GB')}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-green-600">£{invoice.cost}</p>
                                                                <p className="text-xs text-gray-400">Paid</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Upcoming Tab */}
                                {activeTab === 'upcoming' && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">Upcoming Lessons</h3>
                                        {upcomingLessons.length > 0 ? (
                                            upcomingLessons.map(lesson => (
                                                <div key={lesson.id} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-black text-gray-900 leading-tight">{lesson.subject}</p>
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${lesson.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                    {lesson.paymentStatus === 'Due' ? 'Payment Due' : (lesson.paymentStatus || 'Payment Due')}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                                                                <Calendar size={12} className="text-blue-500" />
                                                                {new Date(lesson.date).toLocaleDateString('en-GB', {
                                                                    weekday: 'short',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })} at {lesson.time}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {lesson.status === 'pending_approval' ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApproval(lesson)}
                                                                        className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-sm"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDenial(lesson)}
                                                                        className="flex-1 md:flex-none bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                                                                    >
                                                                        Deny
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleParentReschedule(lesson)}
                                                                        className="flex-1 md:flex-none bg-blue-50 text-blue-600 border border-blue-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                                                    >
                                                                        Reschedule
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleParentCancel(lesson)}
                                                                        className="flex-1 md:flex-none bg-gray-50 text-gray-400 border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">No upcoming lessons scheduled</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Notification Modal */}
            {
                notification && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setNotification(null)}>
                        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                <CheckCircle className={notification.type === 'success' ? 'text-green-600' : 'text-red-600'} size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {notification.type === 'success' ? 'Success!' : 'Error'}
                            </h3>
                            <p className="text-gray-600 mb-6">{notification.message}</p>
                            <button
                                onClick={() => setNotification(null)}
                                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ParentDashboard;
