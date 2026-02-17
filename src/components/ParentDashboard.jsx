import React, { useState, useEffect, useRef } from 'react';
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

    const getStudentLevel = (student, subjectOverride = null) => {
        const subject = (subjectOverride || student?.subject || '').toLowerCase();
        if (subject.includes('a-level') || subject.includes('alevel') || subject.includes('a level') || subject.includes('a-lvl')) return 'A-Level';
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
    const [cancelTarget, setCancelTarget] = useState(null);
    const [editLessonSubjectTarget, setEditLessonSubjectTarget] = useState(null);
    const [invoiceMonth, setInvoiceMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const PARENT_NOTE_KEY = 'tutor_parent_notes';
    const [noteForTeacher, setNoteForTeacher] = useState('');
    const [upcomingMonth, setUpcomingMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [, setMsgTick] = useState(0);

    useEffect(() => {
        const onStorage = (e) => { if (e.key === 'chat_messages_v2') setMsgTick(t => t + 1); };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        const loadParentData = () => {
            const parents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
            const parentAccount = parents.find(p => p.email.toLowerCase() === decodeURIComponent(parentEmail).toLowerCase());

            if (!parentAccount) {
                navigate('/');
                return;
            }

            setParent(parentAccount);

            const allStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
            const children = allStudents.filter(s => parentAccount.linkedStudents.includes(s.id));
            setLinkedStudents(children);

            if (children.length > 0 && !selectedStudent) {
                setSelectedStudent(children[0]);
            }
        };

        loadParentData();
        window.addEventListener('storage', loadParentData);
        return () => window.removeEventListener('storage', loadParentData);
    }, [parentEmail, navigate]);

    const loadStudentData = () => {
        if (!selectedStudent) return;
        const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        const studentHistory = allHistory.filter(h =>
            h.studentId === selectedStudent.id ||
            h.studentName.toLowerCase() === selectedStudent.name.toLowerCase()
        ).sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));
        setSessionHistory(studentHistory);

        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const studentBookings = allBookings.filter(b =>
            (b.studentId === selectedStudent.id ||
                b.student.toLowerCase() === selectedStudent.name.toLowerCase() ||
                (b.parentId === parent.id && b.bookingFor === 'parent')) &&
            b.status !== 'cancelled'
        );

        const now = new Date();
        const upcoming = studentBookings
            .filter(b => new Date(b.date + 'T' + b.time) >= now)
            .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

        setUpcomingLessons(upcoming);
    };

    useEffect(() => {
        loadStudentData();
        window.addEventListener('storage', loadStudentData);
        return () => window.removeEventListener('storage', loadStudentData);
    }, [selectedStudent]);

    useEffect(() => {
        if (selectedStudent?.subject) {
            setBookingSubject(selectedStudent.subject);
        }
    }, [selectedStudent]);

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

        if (lesson.status === 'pending_reschedule') {
            emailService.sendRescheduleResponseToTeacher(lesson, 'Declined');
        }

        setNotification({ type: 'info', message: 'Lesson proposal denied.' });
    };

    const handleParentReschedule = (lesson) => {
        setRescheduleTarget(lesson);
        setBookingStep('select');
        setBookingType('single');
        setActiveTab('book');
    };

    const handleStartLesson = (lesson) => {
        if (!selectedStudent) return;
        const isPaid = lesson.paymentStatus?.toLowerCase() === 'paid';
        const isException = lesson.paymentStatus === 'Due (Exception)';
        const isInBundle = lesson.paymentStatus === 'In bundle';
        const isFree = lesson.type === 'consultation';
        if (!isPaid && !isException && !isInBundle && !isFree) {
            setNotification({ type: 'error', message: 'Please pay for this lesson before starting. You can pay in the Invoices tab.' });
            setActiveTab('invoices');
            return;
        }
        navigate(`/session/${lesson.id}?student=${encodeURIComponent(selectedStudent.name)}`);
    };

    const handleParentCancel = (cancelSeries = false) => {
        if (!cancelTarget) return;
        const lesson = cancelTarget;
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];

        let updatedBookings;
        let cancelledBookings = [];

        if (cancelSeries && lesson.recurringId) {
            updatedBookings = allBookings.map(b =>
                (b.recurringId === lesson.recurringId && new Date(b.date) >= new Date(lesson.date))
                    ? { ...b, status: 'cancelled' }
                    : b
            );
            cancelledBookings = allBookings.filter(b => b.recurringId === lesson.recurringId && new Date(b.date) >= new Date(lesson.date));
        } else {
            updatedBookings = allBookings.map(b => b.id === lesson.id ? { ...b, status: 'cancelled' } : b);
            cancelledBookings = [lesson];
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

        cancelledBookings.forEach(b => {
            emailService.sendCancellationNotice(b, 'student');
        });

        window.dispatchEvent(new Event('storage'));
        loadStudentData();
        setNotification({ type: 'info', message: cancelSeries ? 'Entire series cancelled.' : 'Lesson cancelled successfully.' });
        setCancelTarget(null);
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

    useEffect(() => {
        const email = parent?.email || parentEmail || '';
        if (!email) return;
        try {
            const raw = localStorage.getItem(PARENT_NOTE_KEY);
            const o = raw ? JSON.parse(raw) : {};
            setNoteForTeacher((o[email] && o[email].note) || '');
        } catch (_) {}
    }, [parent, parentEmail]);

    const saveNoteForTeacher = (note) => {
        const email = parent?.email || parentEmail || '';
        if (!email) return;
        try {
            const raw = localStorage.getItem(PARENT_NOTE_KEY) || '{}';
            const o = JSON.parse(raw);
            o[email] = { note: note || '', updated: new Date().toISOString() };
            localStorage.setItem(PARENT_NOTE_KEY, JSON.stringify(o));
        } catch (_) {}
    };
    const noteDebounceRef = useRef(null);
    useEffect(() => {
        if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
        noteDebounceRef.current = setTimeout(() => { saveNoteForTeacher(noteForTeacher); }, 500);
        return () => { if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current); };
    }, [noteForTeacher]);

    const handleSendMessage = () => {
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

        emailService.sendMessageNotification(parent.name, 'davina.potter@outlook.com', sentContent);
    };

    const getLessonRate = (item) => {
        if (item.type === 'consultation') return 0;
        if (item.cost != null && item.cost !== undefined) return Number(item.cost);
        const level = getStudentLevel(selectedStudent, item.subject);
        return level === 'A-Level' ? 40 : level === 'KS3' ? 25 : 30;
    };
    const getPackPrice = (subject) => {
        const level = getStudentLevel(selectedStudent, subject);
        return level === 'A-Level' ? 370 : level === 'KS3' ? 230 : 280;
    };
    const calculateStats = () => {
        const completed = sessionHistory.length;
        const unpaidInvoices = [];
        const seenPackIds = new Set();
        const byRecurring = {};
        upcomingLessons.forEach(b => {
            if (b.recurringId) {
                if (!byRecurring[b.recurringId]) byRecurring[b.recurringId] = [];
                byRecurring[b.recurringId].push(b);
            }
        });
        // One invoice per unpaid 10-lesson pack (so count matches packs, not individual lessons)
        Object.keys(byRecurring).forEach(rid => {
            const pack = byRecurring[rid].sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
            if (pack.length === 10) {
                const first = pack[0];
                if ((first.paymentStatus || '').toLowerCase() !== 'paid') {
                    seenPackIds.add(rid);
                    const amount = first.cost != null && first.cost !== undefined ? Number(first.cost) : getPackPrice(first.subject);
                    unpaidInvoices.push({
                        id: rid,
                        subject: first.subject,
                        cost: amount,
                        date: first.date,
                        paymentStatus: 'Due',
                        type: 'pack',
                        label: '10-lesson pack'
                    });
                }
            }
        });
        // Single upcoming lessons (not part of a 10-pack we already invoiced)
        upcomingLessons.forEach(item => {
            if (item.type === 'consultation') return;
            if (item.recurringId && seenPackIds.has(item.recurringId)) return;
            if (!item.recurringId || !byRecurring[item.recurringId] || byRecurring[item.recurringId].length !== 10) {
                if ((item.paymentStatus || '').toLowerCase() === 'due') {
                    unpaidInvoices.push({ ...item, cost: getLessonRate(item) });
                }
            }
        });
        // Completed sessions still due
        sessionHistory.forEach(item => {
            if (item.type === 'consultation') return;
            if ((item.paymentStatus || '').toLowerCase() === 'due') {
                unpaidInvoices.push({ ...item, cost: getLessonRate(item) });
            }
        });
        unpaidInvoices.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        const totalDue = unpaidInvoices.reduce((sum, item) => sum + (Number(item.cost) || getLessonRate(item)), 0);
        const nextLesson = upcomingLessons.length > 0 ? upcomingLessons[0] : null;
        return { completed, unpaidCount: unpaidInvoices.length, totalDue, nextLesson, unpaidInvoices };
    };

    const stats = selectedStudent ? calculateStats() : { completed: 0, unpaidCount: 0, totalDue: 0, nextLesson: null, unpaidInvoices: [] };

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
                            <h1 className="text-xl font-bold text-blue-600 tracking-tight">Parent Portal</h1>
                            <p className="text-xs text-gray-500">Davina's Tutoring Platform</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <p className="font-bold text-gray-700 text-sm">{parent.email}</p>
                            <p className="text-xs text-gray-400">Parent Account</p>
                        </div>
                        <button onClick={() => navigate('/')} className="text-red-400 hover:text-red-500 flex items-center gap-2 text-sm font-bold">
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
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-gray-400 font-medium">{student.email}</p>
                                                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{student.subject}</span>
                                            </div>
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

                {/* Student Dashboard Content */}
                {selectedStudent && (
                    <>
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                            <h2 className="text-2xl font-black text-slate-800">Dashboard for {selectedStudent.name}</h2>
                            <div className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                                {selectedStudent.subject}
                            </div>
                        </div>

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

                        {stats.totalDue > 0 && (
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg p-6 text-white text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Outstanding Balance</h3>
                                    <p className="text-orange-100 text-sm">Pay now to keep learning on track</p>
                                    <p className="text-3xl font-bold mt-2">£{stats.totalDue}</p>
                                </div>
                                <a
                                    href={(() => {
                                        const level = getStudentLevel(selectedStudent);
                                        if (stats.totalDue >= 280) {
                                            return level === 'A-Level' ? "https://buy.stripe.com/5kA6oLe0Y6GHchG4gn" : (level === 'KS3' ? "https://buy.stripe.com/28EbJ17EHed97EW9e3eIw04" : "https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01");
                                        }
                                        return level === 'A-Level' ? "https://buy.stripe.com/bJe9ATbUXed93oG4XNeIw03" : (level === 'KS3' ? "https://buy.stripe.com/eVq4gz3or5GDbVccqfeIw05" : "https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00");
                                    })()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all"
                                >
                                    Pay Outstanding via Stripe
                                </a>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                            <div className="border-b border-gray-200 px-6 py-3">
                                <div className="flex gap-6 overflow-x-auto">
                                    {['overview', 'upcoming', 'book', 'messages', 'invoices'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-3 px-4 font-bold transition-all border-b-2 whitespace-nowrap relative ${activeTab === tab
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            {tab === 'book' ? 'Book Lesson' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                            {tab === 'messages' && (() => {
                                                const threadKey = parent ? `parent_${parent.email}` : '';
                                                const allMsg = JSON.parse(localStorage.getItem('chat_messages_v2') || '{}');
                                                const thread = allMsg[threadKey] || [];
                                                const unread = thread.filter(m => m.sender !== parent?.email && !m.read).length;
                                                return unread > 0 ? <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">{unread > 9 ? '9+' : unread}</span> : null;
                                            })()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6">
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        {stats.nextLesson && (
                                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-100 mb-1">Next Lesson</h3>
                                                    <p className="text-xl font-bold">{stats.nextLesson.subject || 'Session'}</p>
                                                    <p className="text-blue-100 text-sm mt-1">{new Date(stats.nextLesson.date).toLocaleDateString('en-GB')} at {stats.nextLesson.time}</p>
                                                </div>
                                                {(() => {
                                                    const allB = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
                                                    const packBookings = stats.nextLesson.recurringId ? allB.filter(b => b.recurringId === stats.nextLesson.recurringId && b.status !== 'cancelled').sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)) : [];
                                                    const firstInPackPaid = packBookings.length === 10 && packBookings[0] && (packBookings[0].paymentStatus || '').toLowerCase() === 'paid';
                                                    const isIn10Pack = packBookings.length === 10;
                                                    const canStart = stats.nextLesson.type === 'consultation' || stats.nextLesson.paymentStatus === 'Due (Exception)' || (isIn10Pack ? firstInPackPaid : (stats.nextLesson.paymentStatus?.toLowerCase() === 'paid' || stats.nextLesson.paymentStatus === 'Due'));
                                                    return (
                                                        <button
                                                            onClick={() => handleStartLesson(stats.nextLesson)}
                                                            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${canStart ? 'bg-white text-blue-600 hover:shadow-lg' : 'bg-white/30 text-blue-100 cursor-not-allowed'}`}
                                                            disabled={!canStart}
                                                            title={!canStart ? 'Pay for the first lesson in the pack in Invoices first' : 'Start lesson as ' + selectedStudent.name}
                                                        >
                                                            <Video size={20} /> Start Lesson
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        <h3 className="text-lg font-bold text-gray-800">Recent Session History</h3>
                                        {sessionHistory.length > 0 ? (
                                            <div className="space-y-3">
                                                {[...sessionHistory].sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00'))).map(session => (
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
                                                                    {session.lessonPdfBase64 && (
                                                                        <a href={`data:application/pdf;base64,${session.lessonPdfBase64}`} download={`lesson-notes-${new Date(session.date).toISOString().split('T')[0]}.pdf`} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-xs">
                                                                            <FileText size={14} /> Download lesson notes (PDF)
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {session.rating && (
                                                                <div className="flex items-center gap-1 text-yellow-500">
                                                                    <Star size={16} fill="currentColor" />
                                                                    <span className="font-bold">{session.rating}/5</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">No session history yet</p>
                                        )}

                                        <h3 className="text-lg font-bold text-gray-800 mt-8">Note for teacher</h3>
                                        <p className="text-sm text-gray-500 mb-2">Leave a message for the teacher (e.g. goals, concerns). Only the teacher will see this.</p>
                                        <textarea
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-500 outline-none min-h-[80px] text-gray-800"
                                            placeholder="e.g. Please focus on algebra this week..."
                                            value={noteForTeacher}
                                            onChange={(e) => setNoteForTeacher(e.target.value)}
                                            onBlur={() => saveNoteForTeacher(noteForTeacher)}
                                        />
                                        <p className="text-[10px] text-blue-500 mt-1 italic">Saves automatically when you click away</p>
                                    </div>
                                )}

                                {activeTab === 'book' && (
                                    <div className="space-y-8">
                                        {bookingStep === 'options' ? (
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-bold text-gray-800 mb-2">Booking Options</h3>
                                                <div className="space-y-4">
                                                    <div className="p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-blue-50 rounded-xl"><BookOpen className="text-blue-600" size={24} /></div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-900 text-lg">Single Lesson</p>
                                                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Pay-as-you-go</span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-bold">£{getStudentLevel(selectedStudent) === 'A-Level' ? '40' : getStudentLevel(selectedStudent) === 'KS3' ? '25' : '30'} per session</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => { setBookingStep('select'); setBookingType('single'); }} className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-md text-sm uppercase tracking-widest">Book Single Time</button>
                                                    </div>

                                                    <div className="p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-teal-500 transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-teal-50 rounded-xl"><Clock className="text-teal-600" size={24} /></div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-900 text-lg">Recurring Lesson</p>
                                                                    <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Pay Weekly</span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-bold">Secure a weekly slot. Pay as you go.</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => { setBookingStep('select'); setBookingType('weekly'); }} className="w-full md:w-auto px-8 py-3 bg-teal-600 text-white rounded-xl font-black hover:bg-teal-700 transition-all shadow-md text-sm uppercase tracking-widest">Secure Weekly Slot</button>
                                                    </div>

                                                    <div className="p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-purple-500 transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-purple-50 rounded-xl"><Star className="text-purple-600" size={24} /></div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-900 text-lg">10-Week Bundle</p>
                                                                    <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Pay Upfront & Save</span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-bold">Pay for 10 sessions now and save £20-£30.</p>
                                                                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-left max-w-md">
                                                                    <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-0.5">Refund & Administrative Fee Policy</p>
                                                                    <p className="text-[9px] text-amber-900 font-medium leading-relaxed">A non-refundable £15.00 admin fee applies to bundle purchases. Refunds for unused sessions are calculated as remaining balance minus this fee. Used sessions are non-refundable.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => { setBookingStep('select'); setBookingType('pack'); setLessonFrequency('once'); }} className="w-full md:w-auto px-8 py-3 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 transition-all shadow-md text-sm uppercase tracking-widest">Book Bundle & Save</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-bold text-gray-800">Select Session Time</h3>
                                                    <button onClick={() => setBookingStep('options')} className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-all flex items-center gap-2">
                                                        <ArrowRight size={16} className="rotate-180" /> Change Option
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {availableSlots.length === 0 ? (
                                                        <p className="col-span-full text-center py-8 text-gray-400 font-bold">No available slots found. Contact Davina to open more times.</p>
                                                    ) : (
                                                        availableSlots
                                                            .filter(slot => {
                                                                if (selectedSlot) return slot.id === selectedSlot.id;
                                                                if (selectedSlots.length > 0) return selectedSlots.some(s => s.id === slot.id);
                                                                return true;
                                                            })
                                                            .map(slot => {
                                                                const isSelected = selectedSlot?.id === slot.id || selectedSlots.some(s => s.id === slot.id);
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
                                                                                    setSelectedSlots([selectedSlots[1], slot]);
                                                                                }
                                                                            } else {
                                                                                if (selectedSlot?.id === slot.id) {
                                                                                    setSelectedSlot(null);
                                                                                } else {
                                                                                    setSelectedSlot(slot);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-blue-200'}`}
                                                                    >
                                                                        <p className="font-bold text-gray-900 text-sm">{new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                                        <p className="text-lg font-black text-blue-600">{slot.time}</p>
                                                                    </button>
                                                                );
                                                            })
                                                    )}
                                                </div>

                                                {bookingType === 'pack' && !rescheduleTarget && (
                                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left mb-4">
                                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Refund & Administrative Fee Policy</p>
                                                        <p className="text-[10px] text-amber-900 font-medium leading-relaxed">
                                                            A non-refundable administrative fee of £15.00 applies to all bundle purchases to cover secure payment processing and account setup. In the event of a requested refund for unused sessions, the refund will be calculated based on the remaining balance minus this administrative fee. Please note that used sessions are non-refundable.
                                                        </p>
                                                    </div>
                                                )}
                                                {((bookingType === 'pack' && lessonFrequency === 'twice' && selectedSlots.length === 2) || (selectedSlot)) && (
                                                    <div className="bg-blue-600 p-6 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                                                        <div className="flex-1">
                                                            <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mb-1">Confirm Selection</p>
                                                            <h4 className="text-xl font-black">
                                                                {selectedSlot ? `${new Date(selectedSlot.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} at ${selectedSlot.time}` : 'Select Times'}
                                                            </h4>
                                                            {(bookingType === 'pack' || bookingType === 'weekly') && !rescheduleTarget && (
                                                                <p className="mt-2 text-xs font-bold text-blue-100 bg-white/10 p-2 rounded-lg inline-block">
                                                                    ✨ Lessons will recur weekly for 10 weeks at this time
                                                                </p>
                                                            )}
                                                            {rescheduleTarget && (
                                                                <p className="mt-2 text-xs font-bold text-blue-100">
                                                                    You are requesting to move your lesson to this new time.
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
                                                                const allSlots = JSON.parse(localStorage.getItem('tutor_all_lesson_slots')) || [];

                                                                if (rescheduleTarget) {
                                                                    // HANDLE RESCHEDULING
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

                                                                    // Notify Teacher
                                                                    emailService.sendRescheduleRequest({
                                                                        ...rescheduleTarget,
                                                                        requestedDate: selectedSlot.date,
                                                                        requestedTime: selectedSlot.time,
                                                                        student: selectedStudent.name
                                                                    }, 'parent');

                                                                    setNotification({ type: 'success', message: 'Reschedule request sent to Davina!' });
                                                                    setRescheduleTarget(null);
                                                                    setSelectedSlot(null);
                                                                    setBookingStep('options');
                                                                    setActiveTab('overview');
                                                                    window.dispatchEvent(new Event('storage'));
                                                                    return;
                                                                }

                                                                // HANDLE NEW BOOKING
                                                                const recurringId = (bookingType === 'pack' || bookingType === 'weekly') ? `rec_${Date.now()}` : null;
                                                                const bookingsToCreate = [];
                                                                const slotsToMark = [];

                                                                if (recurringId) {
                                                                    for (let i = 0; i < 10; i++) {
                                                                        const date = new Date(selectedSlot.date);
                                                                        date.setDate(date.getDate() + (i * 7));
                                                                        const dateStr = date.toISOString().split('T')[0];

                                                                        bookingsToCreate.push({
                                                                            id: `${selectedSlot.id}_${i}_${Date.now()}`,
                                                                            date: dateStr,
                                                                            time: selectedSlot.time,
                                                                            student: selectedStudent.name,
                                                                            studentId: selectedStudent.id,
                                                                            subject: bookingSubject,
                                                                            type: bookingType,
                                                                            status: 'confirmed',
                                                                            paymentStatus: i === 0 ? 'Due' : (bookingType === 'pack' ? 'In bundle' : 'Upcoming'),
                                                                            cost: i === 0 ? (getStudentLevel(selectedStudent, bookingSubject) === 'A-Level' ? (bookingType === 'pack' ? 370 : 40) : (getStudentLevel(selectedStudent, bookingSubject) === 'KS3' ? (bookingType === 'pack' ? 230 : 25) : (bookingType === 'pack' ? 280 : 30))) : (bookingType === 'weekly' ? (getStudentLevel(selectedStudent, bookingSubject) === 'A-Level' ? 40 : getStudentLevel(selectedStudent, bookingSubject) === 'KS3' ? 25 : 30) : 0),
                                                                            recurringId: recurringId
                                                                        });
                                                                        slotsToMark.push({ date: dateStr, time: selectedSlot.time });
                                                                    }
                                                                } else {
                                                                    bookingsToCreate.push({
                                                                        id: `${selectedSlot.id}_${Date.now()}`,
                                                                        date: selectedSlot.date,
                                                                        time: selectedSlot.time,
                                                                        student: selectedStudent.name,
                                                                        studentId: selectedStudent.id,
                                                                        subject: bookingSubject,
                                                                        type: 'single',
                                                                        status: 'confirmed',
                                                                        paymentStatus: 'Due',
                                                                        cost: getStudentLevel(selectedStudent, bookingSubject) === 'A-Level' ? 40 : (getStudentLevel(selectedStudent, bookingSubject) === 'KS3' ? 25 : 30)
                                                                    });
                                                                    slotsToMark.push({ date: selectedSlot.date, time: selectedSlot.time });
                                                                }

                                                                localStorage.setItem('tutor_bookings', JSON.stringify([...allBookings, ...bookingsToCreate]));

                                                                try {
                                                                    const allStudents = JSON.parse(localStorage.getItem('tutor_students') || '[]');
                                                                    const updated = allStudents.map(s => (s.id === selectedStudent?.id || s.name === selectedStudent?.name) && !s.subject ? { ...s, subject: bookingSubject } : s);
                                                                    if (updated.some((s, i) => s !== allStudents[i])) localStorage.setItem('tutor_students', JSON.stringify(updated));
                                                                } catch (_) {}

                                                                const updatedSlots = allSlots.map(s => {
                                                                    if (slotsToMark.some(sm => sm.date === s.date && sm.time === s.time)) {
                                                                        return { ...s, bookedBy: selectedStudent.name };
                                                                    }
                                                                    return s;
                                                                });
                                                                localStorage.setItem('tutor_all_lesson_slots', JSON.stringify(updatedSlots));

                                                                // Redirect to Stripe
                                                                const level = getStudentLevel(selectedStudent, bookingSubject);
                                                                let stripeUrl = "";
                                                                if (bookingType === 'pack') {
                                                                    stripeUrl = level === 'A-Level' ? "https://buy.stripe.com/5kA6oLe0Y6GHchG4gn" : (level === 'KS3' ? "https://buy.stripe.com/28EbJ17EHed97EW9e3eIw04" : "https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01");
                                                                } else {
                                                                    stripeUrl = level === 'A-Level' ? "https://buy.stripe.com/bJe9ATbUXed93oG4XNeIw03" : (level === 'KS3' ? "https://buy.stripe.com/eVq4gz3or5GDbVccqfeIw05" : "https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00");
                                                                }

                                                                window.open(stripeUrl, '_blank');

                                                                setNotification({ type: 'success', message: 'Booking confirmed! Redirecting to payment...' });
                                                                setSelectedSlot(null);
                                                                setBookingStep('options');
                                                                setActiveTab('overview');
                                                                window.dispatchEvent(new Event('storage'));
                                                            }}
                                                            className="px-8 py-3 bg-white text-blue-600 rounded-xl font-black hover:bg-gray-50 transition-all shadow-lg"
                                                        >
                                                            {rescheduleTarget ? 'Confirm Reschedule' : 'Confirm & Book'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                                        <MessageSquare size={32} className="text-gray-300 mb-4" />
                                                        <p className="text-gray-500 font-bold">No messages yet</p>
                                                    </div>
                                                ) : (
                                                    messages.map(msg => (
                                                        <div key={msg.id} className={`flex ${msg.sender === parent.email ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.sender === parent.email ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'}`}>
                                                                <p className="text-sm">{msg.message}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="p-4 bg-white border-t rounded-b-2xl">
                                                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl outline-none" />
                                                    <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Send</button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'invoices' && (() => {
                                    const allItems = [...upcomingLessons, ...sessionHistory].map(item => ({ ...item, date: item.date || item.sessionDate })).filter(i => i.date);
                                    const now = new Date();
                                    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                    const dataMonths = [...new Set(allItems.map(item => {
                                        const d = new Date(item.date);
                                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                    }))];
                                    const sixMonthKeys = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
                                    const months = [...new Set([...sixMonthKeys, ...dataMonths])].sort();
                                    const [y, m] = (invoiceMonth || currentMonthKey).split('-').map(Number);
                                    const filtered = allItems.filter(item => {
                                        const d = new Date(item.date);
                                        return d.getFullYear() === y && d.getMonth() + 1 === m;
                                    }).sort((a, b) => new Date(a.date) - new Date(b.date));
                                    return (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-gray-800">Invoices & History</h3>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Month</span>
                                            <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} className="rounded-xl border-2 border-gray-100 px-4 py-2 font-bold text-sm text-gray-800 bg-white focus:border-blue-500">
                                                {months.map(monthKey => {
                                                    const [yr, mo] = monthKey.split('-').map(Number);
                                                    const label = new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                                                    return <option key={monthKey} value={monthKey}>{label}</option>;
                                                })}
                                            </select>
                                        </div>
                                        {stats.unpaidInvoices.filter(inv => !inv.date || (() => { const d = new Date(inv.date); return d.getFullYear() === y && d.getMonth() + 1 === m; })()).length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-amber-700 uppercase">Due this month</p>
                                                {stats.unpaidInvoices.filter(invoice => {
                                                    const d = invoice.date ? new Date(invoice.date) : new Date();
                                                    return d.getFullYear() === y && d.getMonth() + 1 === m;
                                                }).map(invoice => {
                                                    const level = getStudentLevel(selectedStudent, invoice.subject);
                                                    const amount = getLessonRate(invoice);
                                                    const usePackLink = invoice.type === 'pack' || amount >= 230;
                                                    const stripeUrl = usePackLink
                                                        ? (level === 'A-Level' ? "https://buy.stripe.com/5kA6oLe0Y6GHchG4gn" : level === 'KS3' ? "https://buy.stripe.com/28EbJ17EHed97EW9e3eIw04" : "https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01")
                                                        : (level === 'A-Level' ? "https://buy.stripe.com/bJe9ATbUXed93oG4XNeIw03" : level === 'KS3' ? "https://buy.stripe.com/eVq4gz3or5GDbVccqfeIw05" : "https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00");
                                                    const lessonType = invoice.subject || 'Lesson';
                                                    return (
                                                    <div key={invoice.id} className="p-4 bg-orange-50 rounded-xl border-2 border-orange-100 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider">Lesson type</p>
                                                            <p className="font-bold text-purple-600">{lessonType}</p>
                                                            {invoice.type === 'pack' && <p className="text-xs text-gray-500 mt-0.5">10-lesson pack</p>}
                                                            <p className="text-sm text-gray-500 mt-1">£{amount} • Due</p>
                                                        </div>
                                                        <button onClick={() => window.open(stripeUrl, "_blank")} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-bold">Pay Now</button>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                            <div className="overflow-x-auto overflow-y-auto max-h-[50vh]">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50/50 border-b border-gray-100 sticky top-0">
                                                        <tr>
                                                            <th className="p-3 font-black text-gray-400 text-[9px] uppercase tracking-widest">Date</th>
                                                            <th className="p-3 font-black text-gray-400 text-[9px] uppercase tracking-widest">Lesson type</th>
                                                            <th className="p-3 font-black text-gray-400 text-[9px] uppercase tracking-widest">Description</th>
                                                            <th className="p-3 font-black text-gray-400 text-[9px] uppercase tracking-widest">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {filtered.map((item, idx) => {
                                                            const isPaid = (item.paymentStatus || '').toLowerCase() === 'paid';
                                                            const packBookings = item.recurringId ? (JSON.parse(localStorage.getItem('tutor_bookings') || '[]')).filter(b => b.recurringId === item.recurringId && b.status !== 'cancelled').sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)) : [];
                                                            const firstInPackPaid = packBookings.length === 10 && packBookings[0] && (packBookings[0].paymentStatus || '').toLowerCase() === 'paid';
                                                            const statusLabel = item.type === 'consultation' ? 'Paid' : isPaid ? 'Paid' : (item.paymentStatus === 'In bundle' ? (firstInPackPaid ? 'Paid in bulk' : 'Awaiting initial payment') : 'Due');
                                                            const lessonType = item.subject || '—';
                                                            const description = item.lessonNotes || item.topic || item.subject || '—';
                                                            return (
                                                            <tr key={item.id || idx} className="hover:bg-gray-50/50">
                                                                <td className="p-3 font-bold text-gray-900 text-xs">{new Date(item.date).toLocaleDateString('en-GB')}</td>
                                                                <td className="p-3 font-bold text-purple-600 text-xs">{lessonType}</td>
                                                                <td className="p-3 font-medium text-gray-600 text-xs">{description}</td>
                                                                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusLabel === 'Paid' || statusLabel === 'Paid in bulk' ? 'bg-green-100 text-green-700' : statusLabel === 'Awaiting initial payment' ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-700'}`}>{statusLabel}</span></td>
                                                            </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {filtered.length === 0 && <div className="p-6 text-center text-gray-400 font-bold text-sm">No sessions this month.</div>}
                                        </div>
                                    </div>
                                    );
                                })()}

                                {activeTab === 'upcoming' && (() => {
                                    const now = new Date();
                                    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                    const dataMonths = [...new Set(upcomingLessons.map(l => {
                                        const d = new Date(l.date);
                                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                    }))];
                                    const sixMonthKeys = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
                                    const months = [...new Set([...sixMonthKeys, ...dataMonths])].sort();
                                    const [uy, um] = (upcomingMonth || currentMonthKey).split('-').map(Number);
                                    const filteredUpcoming = upcomingLessons.filter(l => {
                                        const d = new Date(l.date);
                                        return d.getFullYear() === uy && d.getMonth() + 1 === um;
                                    }).sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
                                    return (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <h3 className="text-lg font-bold text-gray-800">Upcoming Lessons</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Month</span>
                                                <select value={upcomingMonth} onChange={(e) => setUpcomingMonth(e.target.value)} className="rounded-xl border-2 border-gray-100 px-4 py-2 font-bold text-sm text-gray-800 bg-white focus:border-blue-500">
                                                    {months.map(monthKey => {
                                                        const [yr, mo] = monthKey.split('-').map(Number);
                                                        const label = new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                                                        return <option key={monthKey} value={monthKey}>{label}</option>;
                                                    })}
                                                </select>
                                            </div>
                                        </div>
                                        {filteredUpcoming.map(lesson => {
                                            const allBookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
                                            const packBookings = lesson.recurringId ? allBookings.filter(b => b.recurringId === lesson.recurringId && b.status !== 'cancelled').sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)) : [];
                                            const lessonNum = packBookings.length === 10 ? (packBookings.findIndex(b => b.id === lesson.id) + 1) || null : null;
                                            const firstInPackPaid = packBookings.length === 10 && packBookings[0] && (packBookings[0].paymentStatus || '').toLowerCase() === 'paid';
                                            const showAsPaid = (lesson.paymentStatus || '').toLowerCase() === 'paid' && (!lesson.recurringId || firstInPackPaid);
                                            const bundleLabel = firstInPackPaid ? 'Paid in bulk' : 'Awaiting initial payment';
                                            const statusLabel = lesson.status === 'pending_approval' ? 'Pending Approval' : lesson.type === 'consultation' ? 'Free Consultation' : (lesson.paymentStatus === 'Due' ? 'Awaiting initial payment' : lesson.paymentStatus === 'In bundle' ? bundleLabel : (lesson.paymentStatus === 'Due (Exception)' ? 'Payment due' : (showAsPaid ? 'Paid' : (lesson.recurringId && !firstInPackPaid ? 'Awaiting initial payment' : (lesson.paymentStatus || 'Upcoming')))));
                                            return (
                                            <div key={lesson.id} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                <div className="flex justify-between items-center gap-4 flex-wrap">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lesson</div>
                                                        <p onClick={() => setEditLessonSubjectTarget({ lesson, currentNote: lesson.subject || '' })} className="font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors py-1 rounded border border-transparent hover:border-blue-200 px-2 -mx-2">
                                                            {lesson.subject || selectedStudent?.subject || 'Click to set lesson type'}
                                                        </p>
                                                        <p className="text-sm text-gray-500 mt-0.5">{new Date(lesson.date).toLocaleDateString('en-GB')} at {lesson.time}</p>
                                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                            {lessonNum != null && <span className="text-xs text-teal-600 font-bold">Lesson {lessonNum}/10</span>}
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${lesson.status === 'pending_approval' ? 'bg-purple-100 text-purple-700' :
                                                                lesson.type === 'consultation' ? 'bg-blue-100 text-blue-700' :
                                                                    showAsPaid ? 'bg-green-100 text-green-700' :
                                                                        lesson.paymentStatus === 'In bundle' ? (firstInPackPaid ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700') :
                                                                            lesson.paymentStatus === 'Due' || lesson.paymentStatus === 'Due (Exception)' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-red-50 text-red-600'
                                                                }`}>
                                                                {statusLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {lesson.status === 'pending_approval' ? (
                                                            <button onClick={() => handleApproval(lesson)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Approve</button>
                                                        ) : (
                                                            <>
                                                                {(() => {
                                                                    const isIn10Pack = packBookings.length === 10;
                                                                    const canStartLesson = lesson.type === 'consultation' || lesson.paymentStatus === 'Due (Exception)' || (isIn10Pack ? firstInPackPaid : (lesson.paymentStatus?.toLowerCase() === 'paid' || lesson.paymentStatus === 'Due'));
                                                                    return (
                                                                <button
                                                                    onClick={() => handleStartLesson(lesson)}
                                                                    title={!canStartLesson ? 'Pay for the first lesson in the pack in Invoices first' : 'Join as ' + selectedStudent.name}
                                                                    className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition-all ${canStartLesson ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                                                    disabled={!canStartLesson}
                                                                >
                                                                    <Video size={14} /> Start Lesson
                                                                </button>
                                                                    );
                                                                })()}
                                                                <button onClick={() => handleParentReschedule(lesson)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all">Reschedule</button>
                                                                <button onClick={() => setCancelTarget(lesson)} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-all">Cancel</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })}
                                        {filteredUpcoming.length === 0 && <div className="p-6 text-center text-gray-400 font-bold text-sm">No upcoming lessons this month.</div>}
                                    </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Modals */}
            {notification && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setNotification(null)}>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{notification.type === 'success' ? 'Success!' : 'Notice'}</h3>
                        <p className="text-gray-600 mb-6">{notification.message}</p>
                        <button onClick={() => setNotification(null)} className="bg-gray-900 text-white px-10 py-3 rounded-xl font-bold">Close</button>
                    </div>
                </div>
            )}

            {cancelTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-2">Cancel Lesson?</h3>
                        <p className="text-gray-600 mb-2">
                            {cancelTarget.recurringId ? "This is part of a series. Cancel just this one or all future sessions?" : "Are you sure you want to cancel this session?"}
                        </p>
                        {cancelTarget.recurringId && (() => {
                            const allBookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
                            const pack = allBookings.filter(b => b.recurringId === cancelTarget.recurringId && b.status !== 'cancelled').sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
                            const isPaidPack = pack.length === 10 && pack[0] && (pack[0].paymentStatus || '').toLowerCase() === 'paid';
                            return isPaidPack ? <p className="text-amber-700 text-sm font-medium mb-4 bg-amber-50 rounded-xl p-3">Part of a paid pack – no refund for individual lessons. Consider rescheduling instead.</p> : null;
                        })()}
                        <div className="flex flex-col gap-3">
                            {cancelTarget.recurringId ? (
                                <>
                                    <button onClick={() => handleParentCancel(false)} className="py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200">Cancel Only This One</button>
                                    <button onClick={() => handleParentCancel(true)} className="py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Cancel Entire Series</button>
                                </>
                            ) : (
                                <button onClick={() => handleParentCancel(false)} className="py-3 bg-red-600 text-white rounded-xl font-bold">Cancel Session</button>
                            )}
                            <button onClick={() => { const lesson = cancelTarget; setCancelTarget(null); handleParentReschedule(lesson); }} className="py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100">Reschedule instead</button>
                            <button onClick={() => setCancelTarget(null)} className="py-3 text-gray-400 font-bold">Keep Session</button>
                        </div>
                    </div>
                </div>
            )}

            {editLessonSubjectTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setEditLessonSubjectTarget(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Lesson (e.g. KS3 Maths, A-Level Sociology)</h3>
                        <p className="text-sm text-gray-500 mb-4">This will appear on the teacher dashboard.</p>
                        <textarea
                            value={editLessonSubjectTarget.currentNote}
                            onChange={e => setEditLessonSubjectTarget({ ...editLessonSubjectTarget, currentNote: e.target.value })}
                            className="w-full border-2 border-gray-100 rounded-xl p-4 min-h-[100px] font-bold text-gray-800 bg-gray-50 mb-6"
                            placeholder="e.g. KS3 Maths, A-Level Sociology"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => {
                                const all = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
                                const updated = all.map(b => b.id === editLessonSubjectTarget.lesson.id ? { ...b, subject: editLessonSubjectTarget.currentNote.trim() || b.subject } : b);
                                localStorage.setItem('tutor_bookings', JSON.stringify(updated));
                                setEditLessonSubjectTarget(null);
                                loadStudentData();
                                setNotification({ type: 'success', message: 'Lesson updated. Teacher will see this.' });
                            }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Save</button>
                            <button onClick={() => setEditLessonSubjectTarget(null)} className="py-3 text-gray-400 font-bold">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentDashboard;
