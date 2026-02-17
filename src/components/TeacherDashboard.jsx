import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Video, Trash2, GraduationCap, ArrowRight, Settings, Check, X, Clock, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Shield, Calendar, MessageSquare, TrendingUp, Mail, FileText } from 'lucide-react';
import { emailService } from '../utils/email';
import dataService from '../services/dataService';
import MigrateData from './MigrateData';

const NOTES_KEY = 'tutor_teacher_notes';

function TeacherPrivateNotesInput({ bookingId, initialValue }) {
    const [value, setValue] = useState(initialValue);
    const debounceRef = useRef(null);
    const save = (v) => {
        try {
            const raw = localStorage.getItem(NOTES_KEY);
            const o = raw ? JSON.parse(raw) : {};
            if (v) o[bookingId] = v; else delete o[bookingId];
            localStorage.setItem(NOTES_KEY, JSON.stringify(o));
        } catch (_) {}
    };
    useEffect(() => setValue(initialValue), [bookingId, initialValue]);
    return (
        <>
            <textarea
                className="w-full text-gray-600 bg-purple-50 rounded-lg px-2 py-1.5 mt-0.5 border border-purple-100 min-h-[3rem] text-xs resize-y focus:border-purple-400 outline-none"
                placeholder="Private notes — only you see these"
                value={value}
                onBlur={() => save(value.trim())}
                onChange={(e) => {
                    const v = e.target.value;
                    setValue(v);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => save(v.trim()), 400);
                }}
            />
            <p className="text-[10px] text-purple-400 mt-0.5 italic">Saves automatically</p>
        </>
    );
}

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('teacher_dashboard_unlocked') === 'true';
    });
    const [enteredPin, setEnteredPin] = useState('');
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('students'); // 'students', 'slots', 'earnings', 'messages'
    const [messageType, setMessageType] = useState('student'); // 'student' or 'parent'
    const [students, setStudents] = useState([]);
    const [newStudentName, setNewStudentName] = useState('');
    const [chatMessages, setChatMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [activeChatStudent, setActiveChatStudent] = useState(null);
    const [parents, setParents] = useState([]);
    const [activeChatParent, setActiveChatParent] = useState(null);
    const [sessionNotesStudent, setSessionNotesStudent] = useState(null);
    const [pendingFeedback, setPendingFeedback] = useState([]);
    const [completeNotesFor, setCompleteNotesFor] = useState(null);
    const [completeNotesTopic, setCompleteNotesTopic] = useState('');
    const [completeNotesWell, setCompleteNotesWell] = useState('');
    const [completeNotesImprove, setCompleteNotesImprove] = useState('');
    const [completeNotesFocus, setCompleteNotesFocus] = useState('');
    const [completeNotesNextSteps, setCompleteNotesNextSteps] = useState('');

    // Unified Schedule State (Used for both Consultations and Lessons)
    const [weeklySchedule, setWeeklySchedule] = useState(() => {
        const defaultSchedule = [
            { day: 'Monday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Tuesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Wednesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Thursday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Friday', intervals: [{ start: '09:00', end: '15:00' }], active: true },
            { day: 'Saturday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
            { day: 'Sunday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
        ];

        const saved = localStorage.getItem('tutor_weekly_schedule');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

                // Ensure we return exactly the 7 days in the correct order
                return daysOrder.map(dayName => {
                    const existingDay = parsed.find(d => d.day === dayName);
                    if (existingDay) {
                        // Migrate legacy format if needed
                        if (!existingDay.intervals) {
                            existingDay.intervals = (existingDay.start && existingDay.end)
                                ? [{ start: existingDay.start, end: existingDay.end }]
                                : [];
                        }
                        return existingDay;
                    }
                    // Fallback to default if a day is missing from saved data
                    return defaultSchedule.find(d => d.day === dayName);
                });
            } catch (e) {
                console.error("Failed to parse schedule", e);
                return defaultSchedule;
            }
        }
        return defaultSchedule;
    });

    // Notification State
    const [notification, setNotification] = useState(null);

    // Slots State
    const [slots, setSlots] = useState([]); // Consultation Slots (15m)
    const [lessonSlots, setLessonSlots] = useState([]); // Paid Lesson Slots (1h)

    // Calendar View State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null); // For modal
    const [showScheduleModal, setShowScheduleModal] = useState(false); // Consultation Hours Modal
    const [newLessonTime, setNewLessonTime] = useState('');
    const [sessionHistory, setSessionHistory] = useState([]);
    const [bookings, setBookings] = useState([]);

    // Recurring Booking State
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recurringConfig, setRecurringConfig] = useState({ studentId: '', startDate: '', time: '', weeks: 4, subject: 'Maths GCSE' });

    // Individual Booking State
    const [showIndividualBookingModal, setShowIndividualBookingModal] = useState(false);
    const [individualBookingConfig, setIndividualBookingConfig] = useState({ studentId: '', date: '', time: '14:00', subject: 'Maths GCSE' });

    // Reschedule Confirmation State
    const [rescheduleConfirm, setRescheduleConfirm] = useState(null); // { booking, action: 'approve' | 'deny' }
    const [scheduleUpdateTrigger, setScheduleUpdateTrigger] = useState(0); // Force re-render for calendar

    // Helper: Format Time to 12-hour
    const formatTime = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const formatName = (str) => {
        if (!str) return '';
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // The 4 lesson types you offer (prices flow to student/parent dash)
    const LESSON_TYPE_OPTIONS = ['Maths KS3', 'Maths GCSE', 'Sociology GCSE', 'Sociology A-Level'];
    const getRateFromSubject = (subject) => {
        if (!subject) return 30;
        const s = String(subject).toLowerCase();
        if (s.includes('ks3')) return 25;
        if (s.includes('a-level') || s.includes('alevel') || s.includes('a level') || s.includes('a-lvl')) return 40;
        return 30;
    };

    const generateTimeOptions = () => {
        const options = [];
        for (let h = 7; h <= 22; h++) {
            for (let m = 0; m < 60; m += 15) {
                if (h === 22 && m > 0) break;
                const hour = h.toString().padStart(2, '0');
                const min = m.toString().padStart(2, '0');
                const time = `${hour}:${min}`;
                options.push({ value: time, label: formatTime(time) });
            }
        }
        return options;
    };

    const timeOptions = generateTimeOptions();

    // Teacher Reschedule State
    const [rescheduleTarget, setRescheduleTarget] = useState(null); // { booking, mode: 'single' | 'series' }
    const [rescheduleConfig, setRescheduleConfig] = useState({ newDate: '', newTime: '14:00', applyToSeries: false });


    // Cancellation Confirmation State
    const [cancelConfirm, setCancelConfirm] = useState(null); // { booking, mode: 'single' | 'series' | null }
    const [upcomingMonthFilter, setUpcomingMonthFilter] = useState(() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    });

    const handleCancelClick = (booking) => {
        setCancelConfirm({ booking, mode: null });
    };

    const confirmCancellation = (cancelMode) => {
        if (!cancelConfirm) return;
        const { booking } = cancelConfirm;

        let updatedBookings;
        let bookingsToCancel = [];

        if (cancelMode === 'series' && booking.recurringId) {
            // Cancel all future lessons in the series starting from this date
            bookingsToCancel = bookings.filter(b =>
                b.recurringId === booking.recurringId &&
                b.status !== 'cancelled' &&
                new Date(b.date) >= new Date(booking.date)
            );
            updatedBookings = bookings.map(b =>
                (b.recurringId === booking.recurringId && new Date(b.date) >= new Date(booking.date))
                    ? { ...b, status: 'cancelled' }
                    : b
            );
        } else {
            bookingsToCancel = [booking];
            updatedBookings = bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b);
        }

        setBookings(updatedBookings);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

        // Also update lessonSlots if applicable
        const updatedSlots = lessonSlots.map(slot => {
            const isCancelled = bookingsToCancel.some(b => b.date === slot.date && b.time === slot.time);
            return isCancelled ? { ...slot, bookedBy: null } : slot;
        });
        setLessonSlots(updatedSlots);
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));

        // Notify Students
        bookingsToCancel.forEach(b => {
            emailService.sendCancellationNotice({
                student: b.student,
                email: 'student@example.com', // Real app would look up email
                date: b.date,
                time: b.time,
                topic: b.subject || 'Lesson'
            }).catch(err => console.error("Email error:", err));
        });

        window.dispatchEvent(new Event('storage'));
        setNotification({ type: 'success', message: cancelMode === 'series' ? 'Entire series cancelled.' : 'Booking cancelled.' });
        setCancelConfirm(null);
    };

    const confirmDelete = () => {
        if (!deleteConfirm) return;

        // deleteConfirm.id is the slot ID
        const updated = lessonSlots.filter(s => s.id !== deleteConfirm.id);
        setLessonSlots(updated);
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updated));

        // Also checks if there was a booking associated with this slot time?
        const slot = deleteConfirm.data;
        if (slot.bookedBy) {
            // Find booking
            const booking = bookings.find(b => b.date === slot.date && b.time === slot.time && b.student === slot.bookedBy && b.status !== 'cancelled');
            if (booking) {
                // Cancel booking
                const updatedBookings = bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b);
                setBookings(updatedBookings);
                localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

                // Notify Student
                emailService.sendCancellationNotice({
                    student: booking.student,
                    email: 'student@example.com',
                    date: booking.date,
                    time: booking.time,
                    topic: booking.topic || 'Lesson'
                });
            }
        }

        window.dispatchEvent(new Event('storage'));
        setDeleteConfirm(null);
    };

    const submitCompleteNotes = (e) => {
        e.preventDefault();
        if (!completeNotesFor) return;
        const consolidated = `${completeNotesWell} ${completeNotesImprove ? '| To Improve: ' + completeNotesImprove : ''} ${completeNotesFocus ? '| Focus: ' + completeNotesFocus : ''}`.trim();
        const sessionLog = {
            id: completeNotesFor.roomId || Date.now().toString(),
            date: completeNotesFor.date || new Date().toISOString(),
            endTime: completeNotesFor.date || new Date().toISOString(),
            studentName: completeNotesFor.studentName,
            studentId: (completeNotesFor.studentName || '').toLowerCase().replace(/\s+/g, '_'),
            subject: completeNotesTopic,
            topic: completeNotesTopic,
            feedback: consolidated,
            feedback_well: completeNotesWell,
            feedback_improve: completeNotesImprove,
            feedback_focus: completeNotesFocus,
            next_steps: completeNotesNextSteps,
            nextSteps: completeNotesNextSteps,
            cost: getRateFromSubject(completeNotesTopic),
            paymentStatus: 'Due',
            type: 'lesson',
            duration: '60',
        };
        const history = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        history.push(sessionLog);
        localStorage.setItem('tutor_session_history', JSON.stringify(history));
        setSessionHistory(history);
        const nextPending = pendingFeedback.filter(p => p.roomId !== completeNotesFor.roomId || p.date !== completeNotesFor.date);
        setPendingFeedback(nextPending);
        localStorage.setItem('tutor_pending_feedback', JSON.stringify(nextPending));
        setCompleteNotesFor(null);
        setCompleteNotesTopic('');
        setCompleteNotesWell('');
        setCompleteNotesImprove('');
        setCompleteNotesFocus('');
        setCompleteNotesNextSteps('');
        window.dispatchEvent(new Event('storage'));
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            // 1. Load Critical Data from Service (Backend or Local)
            const loadedStudents = await dataService.getStudents();
            setStudents(loadedStudents);

            const loadedBookings = await dataService.getBookings();
            loadedBookings.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
            setBookings(loadedBookings);

            const loadedHistory = await dataService.getSessionHistory();
            setSessionHistory(loadedHistory);

            // Prefer localStorage for schedule so Sat/Sun toggle (and other edits) aren't overwritten by stale DB
            const savedSchedule = localStorage.getItem('tutor_weekly_schedule');
            if (savedSchedule) {
                try {
                    const parsed = JSON.parse(savedSchedule);
                    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    const normalized = daysOrder.map(dayName => {
                        const found = parsed.find(d => d.day === dayName);
                        const def = { day: dayName, intervals: [{ start: '09:00', end: dayName === 'Friday' ? '15:00' : '17:00' }], active: true };
                        if (dayName === 'Saturday' || dayName === 'Sunday') def.intervals = [{ start: '09:00', end: '18:00' }];
                        return found ? { ...def, ...found, day: dayName } : def;
                    });
                    setWeeklySchedule(normalized);
                } catch (_) {
                    const loadedSchedule = await dataService.getWeeklySchedule();
                    setWeeklySchedule(loadedSchedule);
                }
            } else {
                const loadedSchedule = await dataService.getWeeklySchedule();
                setWeeklySchedule(loadedSchedule);
            }

            // 2. Load Local-Only / Less Critical Data
            // (Ideally these move to backend too, but keeping scope focused)
            const storedParents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
            setParents(storedParents);

            const storedSlots = JSON.parse(localStorage.getItem('tutor_slots')) || [];
            const storedLessonSlots = JSON.parse(localStorage.getItem('tutor_lesson_slots')) || [];
            setSlots(storedSlots);
            setLessonSlots(storedLessonSlots);

            const messages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
            setChatMessages(messages);

            const pending = JSON.parse(localStorage.getItem('tutor_pending_feedback') || '[]');
            setPendingFeedback(pending);
        };

        loadDashboardData();

        // Listen for storage events to update UI if changed elsewhere locally
        // (Note: Backend changes won't trigger 'storage' event across devices, 
        //  but dataService keeps local flush so this works for same-device tabs)
        window.addEventListener('storage', loadDashboardData);
        return () => window.removeEventListener('storage', loadDashboardData);
    }, []);

    // Mark messages as read when a chat is active
    useEffect(() => {
        if (activeTab === 'messages' && activeChatStudent) {
            const threadKey = activeChatStudent.threadKey;
            const messages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};

            // Check if there are any unread messages in the thread
            const thread = messages[threadKey] || [];
            const hasUnread = thread.some(m => m.sender !== 'Davina' && !m.read);

            if (hasUnread) {
                const updatedThread = thread.map(m =>
                    m.sender !== 'Davina' ? { ...m, read: true } : m
                );
                const updatedMessages = { ...messages, [threadKey]: updatedThread };

                // Update state and localStorage
                setChatMessages(updatedMessages);
                localStorage.setItem('chat_messages_v2', JSON.stringify(updatedMessages));
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, [activeTab, activeChatStudent]);

    // Earnings Calculations
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const now = new Date();

    const paidEarnings = sessionHistory
        .filter(s => s.paymentStatus && s.paymentStatus.toLowerCase() === 'paid')
        .reduce((sum, s) => sum + (s.cost !== undefined ? Number(s.cost) : (s.type === 'consultation' ? 0 : getRateFromSubject(s.subject || s.topic))), 0);

    // Outstanding = Completed lessons that are NOT marked as 'Paid'
    const completedUnpaid = sessionHistory
        .filter(s => (!s.paymentStatus || s.paymentStatus.toLowerCase() !== 'paid'))
        .reduce((sum, s) => sum + (s.cost !== undefined ? Number(s.cost) : (s.type === 'consultation' ? 0 : getRateFromSubject(s.subject || s.topic))), 0);

    // Upcoming = Bookings in the future
    const futureBookings = bookings.filter(b =>
        new Date(b.date + 'T' + b.time) > now &&
        b.type !== 'consultation' &&
        b.subject !== 'Free Consultation' &&
        b.status !== 'cancelled'
    );
    const futureEarnings = futureBookings.reduce((sum, b) => {
        if (b.paymentStatus === 'In bundle') return sum;
        return sum + (b.cost !== undefined ? Number(b.cost) : getRateFromSubject(b.subject));
    }, 0);

    // Real Outstanding = Completed Unpaid (Past)
    // Projected = Past Unpaid + Future Booked
    // Monthly Projections (Actual + Projected)
    const monthlyProjections = [0, 1, 2].map(offset => {
        const d = new Date(currentYear, currentMonth + offset, 1);
        const targetMonth = d.getMonth();
        const targetYear = d.getFullYear();
        const monthName = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        // Combined source for earnings calculation
        const allItems = [...bookings, ...sessionHistory];

        // Filter items that fall in this month and are not cancelled
        const monthItems = allItems.filter(item => {
            if (item.status === 'cancelled') return false;
            const lDate = new Date(item.date);
            return lDate.getMonth() === targetMonth && lDate.getFullYear() === targetYear;
        });

        const bookedLessons = monthItems.filter(i => i.type === 'lesson').length;
        const consultations = monthItems.filter(i => i.type === 'consultation').length;
        const projectedEarnings = monthItems.reduce((sum, item) => {
            if (item.type === 'consultation' || item.cost === 0) return sum;
            return sum + (item.cost !== undefined ? Number(item.cost) : getRateFromSubject(item.subject || item.topic));
        }, 0);

        return {
            monthName,
            projectedEarnings,
            bookedLessons,
            consultations
        };
    });

    const earnedThisMonth = sessionHistory
        .filter(s => {
            const lDate = new Date(s.date);
            return s.paymentStatus?.toLowerCase() === 'paid' &&
                lDate.getMonth() === currentMonth &&
                lDate.getFullYear() === currentYear;
        })
        .reduce((sum, s) => sum + (s.cost !== undefined ? Number(s.cost) : (s.type === 'consultation' ? 0 : getRateFromSubject(s.subject || s.topic))), 0);

    const projectedThisMonth = monthlyProjections[0].projectedEarnings;
    const lessonsThisMonth = monthlyProjections[0].bookedLessons;
    const outstandingEarnings = completedUnpaid;
    const totalPending = completedUnpaid + futureEarnings;
    const paidBookingsThisMonth = []; // Deprecated/Unused in new logic, keeping var structure if verified unused elsewhere


    // Save Unified Schedule
    useEffect(() => {
        dataService.saveWeeklySchedule(weeklySchedule);
    }, [weeklySchedule]);

    const saveStudents = (list) => {
        setStudents(list);
        localStorage.setItem('tutor_students', JSON.stringify(list));
    };

    const addStudent = async (e) => {
        e.preventDefault();
        if (!newStudentName.trim()) return;

        const newName = formatName(newStudentName);
        const newStudent = { name: newName }; // dataService will handle ID and backend

        try {
            const result = await dataService.createStudent(newStudent);
            // Result will be the new student (either from backend or local storage)
            const updated = [...students, result];
            setStudents(updated);
            setNewStudentName('');
            setNotification({ type: 'success', message: `${result.name} added to roster.` });
        } catch (err) {
            console.error("Failed to add student:", err);
            setNotification({ type: 'error', message: 'Failed to add student. Please try again.' });
        }
    };

    const removeStudent = async (id) => {
        if (!window.confirm("Are you sure you want to remove this student? All their local data will remain in bookings but they will be removed from your list.")) return;

        try {
            await dataService.deleteStudent(id);
            const updated = students.filter(s => s.id !== id);
            setStudents(updated);
        } catch (err) {
            console.error("Failed to remove student:", err);
            setNotification({ type: 'error', message: 'Failed to remove student.' });
        }
    };

    const startLesson = (student) => {
        // Create an ad-hoc session ID if no booking exists, but ideally we should have one
        const roomId = student.id || Date.now().toString();
        const sessionUrl = `/session/${roomId}?host=true&student=${encodeURIComponent(student.name)}&type=lesson`;
        window.open(sessionUrl, '_blank');
    };

    const handleJoinLesson = (booking) => {
        // Use booking.id as the definitive roomId for sync
        const roomId = booking.id;
        const type = booking.type || 'lesson';
        const sessionUrl = `/session/${roomId}?host=true&student=${encodeURIComponent(booking.student || booking.studentName)}&type=${type}`;
        navigate(sessionUrl);
    };

    // Weekly Schedule Logic (Unified)
    const updateInterval = (dayIndex, intervalIndex, field, value) => {
        const newSchedule = [...weeklySchedule];
        newSchedule[dayIndex].intervals[intervalIndex][field] = value;
        setWeeklySchedule(newSchedule);
    };

    const addInterval = (dayIndex) => {
        const newSchedule = [...weeklySchedule];
        newSchedule[dayIndex].intervals.push({ start: '09:00', end: '10:00' });
        setWeeklySchedule(newSchedule);
    };

    const removeInterval = (dayIndex, intervalIndex) => {
        const newSchedule = [...weeklySchedule];
        newSchedule[dayIndex].intervals.splice(intervalIndex, 1);
        setWeeklySchedule(newSchedule);
    };

    const toggleDay = (index) => {
        const newSchedule = [...weeklySchedule];
        newSchedule[index].active = !newSchedule[index].active;
        setWeeklySchedule(newSchedule);
    };

    // Generate 1-hour lesson slots from unified weekly schedule
    const generateLessonSlotsFromSchedule = () => {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const generatedSlots = [];
        const today = new Date();
        const daysToGenerate = 30; // Generate for next 30 days

        for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + dayOffset);
            const dayName = daysOfWeek[targetDate.getDay()];

            // Use the unified weeklySchedule
            const daySchedule = weeklySchedule.find(d => d.day === dayName);
            if (!daySchedule || !daySchedule.active) continue;

            daySchedule.intervals.forEach(interval => {
                const [startHour, startMin] = interval.start.split(':').map(Number);
                const [endHour, endMin] = interval.end.split(':').map(Number);

                // Generate 1-hour slots
                for (let hour = startHour; hour < endHour; hour++) {
                    // Check if a full hour fits
                    if (hour === endHour && endMin < 60) break; // Should be handled by loop condition mostly

                    const slotTime = `${String(hour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

                    // Logic check: Ensure the slot + 1 hour doesn't exceed the interval end
                    // (Simplified logic assuming intervals are usually hour-aligned for lessons, but safe to keep)

                    const dateStr = targetDate.toISOString().split('T')[0];

                    // Check if slot already exists in manual slots
                    const existingSlotIndex = lessonSlots.findIndex(s => s.date === dateStr && s.time === slotTime);
                    if (existingSlotIndex === -1) {
                        generatedSlots.push({
                            id: `gen-${dateStr}-${slotTime}`,
                            date: dateStr,
                            time: slotTime,
                            bookedBy: null,
                            generated: true
                        });
                    }
                }
            });
        }

        return generatedSlots;
    };

    // Save all lesson slots to localStorage for StudentDashboard
    useEffect(() => {
        const generatedSlots = generateLessonSlotsFromSchedule();
        const allSlots = [...lessonSlots, ...generatedSlots];
        localStorage.setItem('tutor_all_lesson_slots', JSON.stringify(allSlots));
        console.log('Saved lesson slots to localStorage:', allSlots.length, 'slots (Unified)');
        window.dispatchEvent(new Event('storage'));
    }, [lessonSlots, weeklySchedule]);

    // Merge manual and generated slots for display
    const allLessonSlots = [...lessonSlots, ...generateLessonSlotsFromSchedule()];

    // Slot Logic
    const addLessonSlot = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return;
        const newSlot = {
            id: Date.now() + 'L',
            date: dateStr,
            time: timeStr,
            bookedBy: null
        };
        // Conflict check
        if (lessonSlots.some(s => s.date === dateStr && s.time === timeStr)) {
            setNotification({ type: 'error', message: 'Slot already exists!' });
            return;
        }

        const updated = [...lessonSlots, newSlot];
        setLessonSlots(updated);
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        setNewLessonTime('');
    };

    const removeLessonSlot = (id) => {
        const updated = lessonSlots.filter(s => s.id !== id);
        setLessonSlots(updated);
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (enteredPin === '8138') {
            setIsAuthenticated(true);
            localStorage.setItem('teacher_dashboard_unlocked', 'true');
        } else {
            setError('Incorrect Code');
            setEnteredPin('');
        }
    };

    // Recurring Booking Logic
    const handleRecurringBooking = (e) => {
        e.preventDefault();
        try {
            const { studentId, startDate, time, weeks, subject } = recurringConfig;

            if (!studentId || !startDate || !time || !weeks) {
                setNotification({ type: 'error', message: "Please fill in all required fields." });
                return;
            }

            const student = students.find(s => s.id == studentId);
            if (!student) {
                setNotification({ type: 'error', message: "Student not found." });
                return;
            }

            const newBookings = [];
            const newSlots = [];
            const recurringId = Date.now().toString() + '-REC';

            let currentDate = new Date(startDate);
            if (isNaN(currentDate.getTime())) {
                setNotification({ type: 'error', message: "Invalid start date." });
                return;
            }

            for (let i = 0; i < weeks; i++) {
                const dateStr = currentDate.toISOString().split('T')[0];

                const existingSlot = (lessonSlots || []).find(s => s.date === dateStr && s.time === time);
                if (existingSlot && existingSlot.bookedBy) {
                    setNotification({ type: 'error', message: `Conflict on Week ${i + 1} (${new Date(dateStr).toLocaleDateString('en-GB')}): Slot already booked.` });
                    return;
                }

                newBookings.push({
                    id: `bk-${dateStr}-${time}-${Date.now()}-${i}`,
                    student: student.name,
                    studentId: student.id,
                    date: dateStr,
                    time: time,
                    subject: subject || 'Lesson',
                    type: 'lesson',
                    status: 'confirmed',
                    recurringId: recurringId,
                    seriesIndex: i + 1,
                    totalSeries: weeks,
                    cost: (weeks === 10) ? (i === 0 ? 280 : 0) : 30,
                    paymentStatus: (weeks === 10) ? (i === 0 ? 'Due' : 'In bundle') : 'Due'
                });

                if (existingSlot) {
                    newSlots.push({ ...existingSlot, bookedBy: student.name });
                } else {
                    newSlots.push({
                        id: `gen-${dateStr}-${time}`,
                        date: dateStr,
                        time: time,
                        bookedBy: student.name,
                        generated: false
                    });
                }

                currentDate.setDate(currentDate.getDate() + 7);
            }

            const updatedBookings = [...(bookings || []), ...newBookings];
            let updatedSlots = [...(lessonSlots || [])];

            newSlots.forEach(newSlot => {
                const idx = updatedSlots.findIndex(s => s.date === newSlot.date && s.time === newSlot.time);
                if (idx >= 0) {
                    updatedSlots[idx] = newSlot;
                } else {
                    updatedSlots.push(newSlot);
                }
            });

            setBookings(updatedBookings);
            setLessonSlots(updatedSlots);

            localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
            localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));

            window.dispatchEvent(new Event('storage'));
            setScheduleUpdateTrigger(prev => prev + 1);

            setShowRecurringModal(false);
            setRecurringConfig({ studentId: '', startDate: '', time: '', weeks: 4, subject: 'Maths GCSE' });

            // Success notification to confirm it worked
            setNotification({ type: 'success', message: `${weeks} lessons successfully booked!` });
        } catch (error) {
            console.error("Booking Error:", error);
            setNotification({ type: 'error', message: "Error creating bookings: " + error.message });
        }
    };

    // Individual Booking Logic
    const handleIndividualBooking = async (e) => {
        e.preventDefault();
        const { studentId, date, time, subject } = individualBookingConfig;
        if (!studentId || !date || !time || !subject) {
            setNotification({ type: 'error', message: "Please fill in all fields." });
            return;
        }

        const student = students.find(s => String(s.id) === String(studentId));
        if (!student) {
            setNotification({ type: 'error', message: "Student not found." });
            return;
        }

        const dateStr = date.includes('T') ? date.split('T')[0] : date;
        const existingBooking = bookings.find(b => b.date === dateStr && b.time === time && b.status !== 'cancelled');
        if (existingBooking) {
            setNotification({ type: 'error', message: `Conflict: This time slot is already booked for ${existingBooking.student}.` });
            return;
        }

        const newBooking = {
            id: `bk-${dateStr}-${time}-${Date.now()}`,
            student: student.name,
            studentId: student.id,
            date: dateStr,
            time: time,
            subject: subject,
            type: 'lesson',
            status: 'confirmed',
            recurringId: null,
            cost: 30,
            paymentStatus: 'Due'
        };

        try {
            await dataService.createBooking(newBooking);
        } catch (_) {
            const updatedBookings = [...bookings, newBooking];
            localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
            window.dispatchEvent(new Event('storage'));
        }

        const updatedBookings = [...bookings, newBooking];
        const updatedLessonSlots = lessonSlots.map(s =>
            (s.date === dateStr && s.time === time) ? { ...s, bookedBy: student.name } : s
        );
        setBookings(updatedBookings);
        setLessonSlots(updatedLessonSlots);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedLessonSlots));
        window.dispatchEvent(new Event('storage'));

        setShowIndividualBookingModal(false);
        setIndividualBookingConfig({ studentId: '', date: '', time: '14:00', subject: 'Maths GCSE' });
        setNotification({ type: 'success', message: `Lesson booked for ${student.name} on ${new Date(dateStr).toLocaleDateString('en-GB')} at ${formatTime(time)}.` });
    };

    // Teacher Reschedule Logic
    const initiateTeacherReschedule = (booking) => {
        setRescheduleTarget(booking);
        setRescheduleConfig({
            newDate: booking.date,
            newTime: booking.time,
            applyToSeries: !!booking.recurringId
        });
    };

    const allowPayLater = (booking) => {
        if (!window.confirm(`Allow ${booking.student} to pay later for this session?\n\nThis will grant them immediate access to the classroom.`)) return;

        const updatedHistory = (JSON.parse(localStorage.getItem('tutor_session_history')) || []).map(h =>
            h.id === booking.id ? { ...h, paymentStatus: 'Due (Exception)' } : h
        );
        localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));

        const updatedBookings = bookings.map(b =>
            b.id === booking.id ? { ...b, paymentStatus: 'Due (Exception)' } : b
        );
        setBookings(updatedBookings);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

        window.dispatchEvent(new Event('storage'));
        setNotification({ type: 'success', message: `Exception granted for ${booking.student}. They can now join the lesson.` });
    };

    const confirmTeacherReschedule = () => {
        if (!rescheduleTarget || !rescheduleConfig.newDate || !rescheduleConfig.newTime) return;

        const isSeries = rescheduleConfig.applyToSeries && rescheduleTarget.recurringId;
        const bookingsToUpdate = isSeries
            ? bookings.filter(b => b.recurringId === rescheduleTarget.recurringId && new Date(b.date) >= new Date(rescheduleTarget.date))
            : [rescheduleTarget];

        // 1. Check conflicts for NEW times
        // Logic: Calculate offset for series or just single check
        // ... (Simplified: For now, we only allow rescheduling Single instances or we'd need complex date math for series shifting)
        // Let's restrict Series Reschedule to "Cancel Future & Rebook" or just "Shift All by X days"?
        // SIMPLEST MVP: Only allow rescheduling ONE Lesson at a time for approval first.
        // OR: If it's a series, we just propose a change for THIS meeting.

        // Revised Plan from Implementation: "Single" or "Series" options.
        // If "Series", we'd logically move ALL future lessons? That's complex if they skip weeks.
        // Let's stick to SINGLE lesson reschedule for MVP stability, unless user insists.
        // User asked: "reschedule both one lesson and the whole lesson block too"
        // OK, for "Whole Block", we assume maintaining the same DAY/TIME pattern?
        // OR shifting the entire block to a new Day/Time pattern?
        // Let's assume shfting the PATTERN.

        // If shifting pattern: we need to find all future bookings and move them to same relative new day/time.
        // E.g. Mon 10am -> Tue 2pm. shift = +1 day, +4 hours.

        let proposedBookings = [];

        if (isSeries) {
            // Calculate shift delta
            const oldDate = new Date(`${rescheduleTarget.date}T${rescheduleTarget.time}`);
            const newDate = new Date(`${rescheduleConfig.newDate}T${rescheduleConfig.newTime}`);
            const timeDiff = newDate - oldDate; // milliseconds diff

            bookingsToUpdate.forEach(b => {
                const bDate = new Date(`${b.date}T${b.time}`);
                const shiftedDate = new Date(bDate.getTime() + timeDiff);

                proposedBookings.push({
                    ...b,
                    status: 'pending_student_approval',
                    teacherProposed: {
                        originalDate: b.date,
                        originalTime: b.time,
                        newDate: shiftedDate.toISOString().split('T')[0],
                        newTime: `${String(shiftedDate.getHours()).padStart(2, '0')}:${String(shiftedDate.getMinutes()).padStart(2, '0')}`
                    }
                });
            });
        } else {
            proposedBookings.push({
                ...rescheduleTarget,
                status: 'pending_student_approval',
                teacherProposed: {
                    originalDate: rescheduleTarget.date,
                    originalTime: rescheduleTarget.time,
                    newDate: rescheduleConfig.newDate,
                    newTime: rescheduleConfig.newTime
                }
            });
        }

        // Apply Updates (Optimistically update state to show 'Pending')
        const updatedBookings = bookings.map(b => {
            const proposed = proposedBookings.find(p => p.id === b.id);
            return proposed || b;
        });

        setBookings(updatedBookings);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));

        // Send Email Notification to Student
        proposedBookings.forEach(pb => {
            emailService.sendRescheduleRequest(pb, 'teacher');
        });

        setRescheduleTarget(null);
        window.dispatchEvent(new Event('storage'));
        // alert("Reschedule proposal sent to student!");
    };

    // Reschedule Logic (Old Student Request - Approve)
    const approveReschedule = (booking) => {
        setRescheduleConfirm({ booking, action: 'approve' });
    };

    const confirmApprove = () => {
        const booking = rescheduleConfirm.booking;

        // 1. Free the OLD slot
        const updatedSlots = lessonSlots.map(s => {
            if (s.id === booking.id) { // Assuming lesson ID matches slot ID
                return { ...s, bookedBy: null };
            }
            return s;
        });
        setLessonSlots(updatedSlots);
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));

        // 2. Update Booking
        const updatedBookings = bookings.map(b => {
            if (b.id === booking.id) {
                return {
                    ...b,
                    id: booking.requestedSlotId, // Move to new ID
                    date: booking.requestedDate,
                    time: booking.requestedTime,
                    status: 'confirmed',
                    // Clean up request fields
                    requestedDate: undefined,
                    requestedTime: undefined,
                    requestedSlotId: undefined,
                    studentProposed: undefined // Clear student reschedule proposal
                };
            }
            return b;
        });
        setBookings(updatedBookings);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings)); // Fixed key
        window.dispatchEvent(new Event('storage'));

        // Notify Student
        emailService.sendRescheduleResponse(booking, 'Approved');

        setRescheduleConfirm(null);
    };

    const denyReschedule = (booking) => {
        setRescheduleConfirm({ booking, action: 'deny' });
    };

    const confirmDeny = () => {
        const booking = rescheduleConfirm.booking;

        // 1. Free the NEW slot (it was held)
        const updatedSlots = lessonSlots.map(s => {
            if (s.id === booking.requestedSlotId) {
                return { ...s, bookedBy: null };
            }
            return s;
        });
        setLessonSlots(updatedSlots);
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));

        // 2. Revert Booking Status
        const updatedBookings = bookings.map(b => {
            if (b.id === booking.id) {
                return {
                    ...b,
                    status: 'confirmed',
                    requestedDate: undefined,
                    requestedTime: undefined,
                    requestedSlotId: undefined
                };
            }
            return b;
        });
        setBookings(updatedBookings);
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        window.dispatchEvent(new Event('storage'));

        // Notify Student
        emailService.sendRescheduleResponse(booking, 'Denied');

        setRescheduleConfirm(null);
    };

    const handleRefund = (session) => {
        if (!window.confirm(`Are you sure you want to mark session for ${session.studentName} as Refunded? This will notify the student.`)) return;

        const history = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        const updatedHistory = history.map(s => s.id === session.id ? { ...s, paymentStatus: 'Refunded' } : s);

        localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));
        window.dispatchEvent(new Event('storage'));

        // Notify Student
        emailService.sendRefundNotice({
            student: session.studentName,
            email: session.studentEmail || 'student@example.com',
            date: session.date,
            time: session.time,
            cost: session.cost,
            subject: session.topic
        });

        alert('Session marked as Refunded. Reminder: Please process the actual refund in your Stripe Dashboard.');
    };

    // Calendar Helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        // Pad empty days at start
        const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon start
        for (let i = 0; i < startPadding; i++) {
            days.push(null);
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const changeMonth = (delta) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };



    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-brand-light flex items-center justify-center p-4 font-sans">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border border-purple-100">
                    <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield size={32} className="text-purple-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Teacher Access</h1>
                    <p className="text-gray-500 mb-6">Please enter your 4-digit code.</p>

                    <form onSubmit={handlePinSubmit}>
                        <input
                            type="password"
                            maxLength="4"
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value)}
                            className="w-full text-center text-3xl font-bold tracking-[0.5em] py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none mb-4"
                            placeholder="••••"
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}
                        <button
                            type="submit"
                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
                        >
                            Unlock Dashboard
                        </button>
                    </form>
                    <button onClick={() => window.location.href = '/'} className="mt-6 text-purple-600 hover:text-purple-800 text-sm font-bold hover:underline">Back to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light flex justify-center p-8 font-sans">
            <div className="max-w-5xl w-full space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-3 text-purple-600">
                        <GraduationCap size={40} />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Teacher Dashboard</h1>
                            <p className="text-gray-500">Manage your students and availability</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setIsAuthenticated(false);
                            localStorage.removeItem('teacher_dashboard_unlocked');
                            window.location.href = '/';
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg font-bold transition-colors"
                    >
                        <ArrowRight size={18} className="rotate-180" /> Log Out
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 overflow-x-auto scrollbar-none">
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`pb-4 px-4 font-bold text-lg transition-colors border-b-2 whitespace-nowrap ${activeTab === 'students' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Students
                    </button>
                    <button
                        onClick={() => setActiveTab('slots')}
                        className={`pb-4 px-4 font-bold text-lg transition-colors border-b-2 whitespace-nowrap ${activeTab === 'slots' ? 'text-teal-600 border-teal-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Availability
                    </button>
                    <button
                        onClick={() => setActiveTab('earnings')}
                        className={`pb-4 px-4 font-bold text-lg transition-colors border-b-2 whitespace-nowrap ${activeTab === 'earnings' ? 'text-green-600 border-green-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Earnings
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`pb-4 px-4 font-bold text-lg transition-colors border-b-2 relative whitespace-nowrap overflow-visible ${activeTab === 'messages' ? 'text-blue-600 border-blue-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Messages
                        {(() => {
                            const totalUnread = Object.values(chatMessages).reduce((total, msgs) => {
                                return total + (msgs || []).filter(m => m.sender !== 'Davina' && !m.read).length;
                            }, 0);
                            return totalUnread > 0 ? (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full shrink-0 overflow-visible">
                                    {totalUnread > 9 ? '9+' : totalUnread}
                                </span>
                            ) : null;
                        })()}
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`pb-4 px-4 font-bold text-lg transition-colors border-b-2 ${activeTab === 'settings' ? 'text-gray-900 border-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Settings
                    </button>
                </div>

                {/* Lessons needing summary (complete end-of-lesson notes later) */}
                {pendingFeedback.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="text-amber-600 shrink-0" size={22} />
                            <span className="font-bold text-amber-800">Lessons needing summary</span>
                            <span className="text-amber-700 text-sm">Complete the 4 end-of-lesson questions for these sessions.</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {pendingFeedback.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-amber-200">
                                    <span className="text-sm text-gray-700">{item.studentName || item.roomId} — {item.date ? new Date(item.date).toLocaleDateString('en-GB') : ''}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCompleteNotesFor(item);
                                            setCompleteNotesTopic('');
                                            setCompleteNotesWell('');
                                            setCompleteNotesImprove('');
                                            setCompleteNotesFocus('');
                                            setCompleteNotesNextSteps('');
                                        }}
                                        className="py-1.5 px-3 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700"
                                    >
                                        Complete notes
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content */}
                {activeTab === 'students' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Left: Add Student */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 h-fit">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Plus size={20} className="text-purple-600" /> Add Student
                                </h2>
                                <form onSubmit={addStudent} autoComplete="off">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1" htmlFor="add-student-name">Student Name</label>
                                    <input
                                        id="add-student-name"
                                        name="studentName"
                                        type="text"
                                        autoComplete="off"
                                        value={newStudentName}
                                        onChange={(e) => setNewStudentName(e.target.value)}
                                        placeholder="e.g. Alice"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none mb-4"
                                    />
                                    {notification?.type === 'error' && notification?.message?.toLowerCase().includes('student') && (
                                        <p className="text-red-600 text-sm font-semibold mb-3">{notification.message}</p>
                                    )}
                                    <button type="submit" disabled={!newStudentName.trim()} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        <Plus size={18} /> Add to Roster
                                    </button>
                                </form>
                            </div>

                            {/* Right: Student List */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <User size={20} className="text-teal-500" /> My Students
                                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">{students.length}</span>
                                    </h2>
                                </div>

                                {students.length === 0 ? (
                                    <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center text-gray-400">
                                        No students added yet. Add your first student to get started!
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {students.map(student => {
                                            const parent = (JSON.parse(localStorage.getItem('tutor_parents')) || []).find(p => p.linkedStudents.includes(student.id));
                                            const studentBookings = bookings.filter(b => (b.studentId === student.id || b.student === student.name || b.studentName === student.name) && b.status !== 'cancelled');
                                            const hasPack = studentBookings.some(b => [230, 280, 370].includes(Number(b.cost)));
                                            const byRecurring = {};
                                            studentBookings.forEach(b => {
                                                if (b.recurringId) {
                                                    if (!byRecurring[b.recurringId]) byRecurring[b.recurringId] = [];
                                                    byRecurring[b.recurringId].push(b);
                                                }
                                            });
                                            const packCount = Object.values(byRecurring).filter(arr => arr.length === 10).length;
                                            const completedForStudent = sessionHistory.filter(s => (s.studentName === student.name || s.student === student.name) && (s.paymentStatus === 'Paid' || s.paymentStatus === 'paid'));
                                            const packUsed = Math.min(10, completedForStudent.length);
                                            const packRemaining = hasPack ? Math.max(0, 10 - packUsed) : null;
                                            const displaySubject = (() => {
                                                const s = student.subject || studentBookings[0]?.subject || studentBookings[0]?.topic;
                                                return s && s !== 'Maths A-Level' ? s : null;
                                            })();
                                            return (
                                                <div key={student.id} className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 transition-all flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 rounded-2xl flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform shadow-sm">
                                                            {student.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 flex-wrap">
                                                                {student.name}
                                                                {displaySubject && (
                                                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{displaySubject}</span>
                                                                )}
                                                                {!sessionHistory.some(s => (s.studentName === student.name || s.student === student.name) && s.paymentStatus === 'Paid') && (
                                                                    <span className="text-[10px] bg-green-100 text-green-700 font-black px-1.5 py-0.5 rounded animate-pulse">NEW</span>
                                                                )}
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">ID: {student.id}</span>
                                                            </h3>
                                                            {parent ? (
                                                                <div className="flex flex-col mt-1">
                                                                    <p className="text-xs text-purple-600 font-bold flex items-center gap-1">
                                                                        <User size={12} /> Parent: {parent.name}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic mt-1">No parent linked</p>
                                                            )}
                                                            {packRemaining !== null && (
                                                                <p className="text-xs text-teal-600 font-bold mt-1">{packRemaining} of 10 remaining{packCount > 1 ? ` ×${packCount}` : ''}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setSessionNotesStudent(student)} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Session notes">
                                                            <FileText size={20} />
                                                        </button>
                                                        <button onClick={() => {
                                                            setActiveTab('messages');
                                                            setMessageType('student');
                                                            setActiveChatStudent({ ...student, threadKey: student.name });
                                                        }} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Message Student">
                                                            <MessageSquare size={20} />
                                                        </button>
                                                        {parent && (
                                                            <button onClick={() => {
                                                                setActiveTab('messages');
                                                                setMessageType('parent');
                                                                setActiveChatStudent({ name: parent.name, email: parent.email, id: parent.email, threadKey: `parent_${parent.email}` });
                                                            }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Message Parent">
                                                                <Mail size={20} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => removeStudent(student.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove Student">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Sessions Section */}
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Clock size={20} className="text-purple-600" /> Upcoming Sessions
                                </h2>
                                {(() => {
                                    const now = new Date();
                                    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                    const upcomingList = bookings.filter(b => new Date(b.date + 'T' + b.time) > new Date() && b.status !== 'cancelled');
                                    const dataMonths = [...new Set(upcomingList.map(b => { const d = new Date(b.date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }))];
                                    const sixMonthKeys = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
                                    const months = [...new Set([...sixMonthKeys, ...dataMonths])].sort();
                                    return (
                                        <select value={upcomingMonthFilter} onChange={(e) => setUpcomingMonthFilter(e.target.value)} className="rounded-xl border-2 border-purple-100 px-4 py-2 font-bold text-sm text-gray-800 bg-white focus:border-purple-500">
                                            {months.map(monthKey => {
                                                const [yr, mo] = monthKey.split('-').map(Number);
                                                return <option key={monthKey} value={monthKey}>{new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>;
                                            })}
                                        </select>
                                    );
                                })()}
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
                                {(() => {
                                    const [y, m] = (upcomingMonthFilter || '').split('-').map(Number);
                                    const filteredUpcoming = bookings.filter(b => {
                                        if (new Date(b.date + 'T' + b.time) <= new Date() || b.status === 'cancelled') return false;
                                        const d = new Date(b.date);
                                        return d.getFullYear() === y && d.getMonth() + 1 === m;
                                    });
                                    return filteredUpcoming.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 italic">No upcoming sessions for this month.</div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {filteredUpcoming.map((booking, i) => (
                                            <div key={i} className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${booking.status === 'pending_reschedule' ? 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400' : 'hover:bg-purple-50'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-white shadow-sm ${booking.status === 'pending_reschedule' ? 'bg-orange-400' : (booking.type === 'consultation' ? 'bg-orange-400' : 'bg-purple-600')}`}>
                                                        {booking.status === 'pending_reschedule' ? (
                                                            <AlertCircle size={24} />
                                                        ) : (
                                                            <>
                                                                <span className="text-xs uppercase opacity-80">{new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                                                                <span className="text-lg">{new Date(booking.date).getDate()}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                            {booking.student}
                                                            {booking.status === 'pending_reschedule' && <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">Reschedule Request</span>}
                                                        </h3>

                                                        {booking.status === 'pending_reschedule' ? (
                                                            <div className="text-sm">
                                                                <div className="text-gray-500 line-through text-xs">Current: {new Date(booking.date).toLocaleDateString('en-GB')} at {formatTime(booking.time)}</div>
                                                                <div className="text-orange-700 font-bold">Requested: {new Date(booking.requestedDate).toLocaleDateString('en-GB')} at {formatTime(booking.requestedTime)}</div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="mt-1 text-xs">
                                                                    <span className="font-black text-gray-400 uppercase tracking-widest">Lesson type</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${booking.type === 'consultation' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                                                            {booking.type === 'consultation' ? 'FREE MEETING' : (booking.subject || booking.topic || 'Lesson').toUpperCase()}
                                                                        </span>
                                                                        {new Date(booking.date).toLocaleDateString('en-GB')} at {formatTime(booking.time)}
                                                                    </p>
                                                                    {booking.type !== 'consultation' && (
                                                                        <div className="flex items-center" title={booking.paymentStatus?.toLowerCase() === 'paid' ? 'Paid' : 'Payment Due'}>
                                                                            {booking.paymentStatus?.toLowerCase() === 'paid' ? (
                                                                                <CheckCircle size={16} className="text-green-500" />
                                                                            ) : (
                                                                                <AlertCircle size={16} className="text-orange-500" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 text-xs">
                                                                        <span className="font-black text-gray-400 uppercase tracking-widest">Notes for teacher</span>
                                                                        <div className="text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5 mt-0.5 border border-gray-100 min-h-[3rem] flex flex-col justify-center">
                                                                            {(() => {
                                                                                const parents = JSON.parse(localStorage.getItem('tutor_parents') || '[]');
                                                                                const st = students.find(s => s.name === booking.student || s.name === booking.studentName);
                                                                                const parent = st ? parents.find(p => p.linkedStudents && p.linkedStudents.includes(st.id)) : null;
                                                                                const parentNote = parent && (() => { try { const o = JSON.parse(localStorage.getItem('tutor_parent_notes') || '{}'); return o[parent.email]?.note?.trim(); } catch (_) { return ''; } })();
                                                                                const lessonNotes = (booking.lessonNotes || '').trim();
                                                                                if (parentNote && lessonNotes) return <><p className="text-xs text-purple-600 font-bold">Student note: {lessonNotes}</p><p className="text-xs text-purple-600 font-bold mt-1">Parent note: {parentNote}</p></>;
                                                                                if (parentNote) return <p className="text-xs text-purple-600 font-bold">Parent note: {parentNote}</p>;
                                                                                if (lessonNotes) return <p className="text-xs text-purple-600 font-bold">Student note: {lessonNotes}</p>;
                                                                                return <p>—</p>;
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-1 text-xs">
                                                                        <span className="font-black text-gray-400 uppercase tracking-widest">My comments (private)</span>
                                                                        <TeacherPrivateNotesInput bookingId={booking.id} initialValue={(() => { try { const raw = localStorage.getItem('tutor_teacher_notes'); const o = raw ? JSON.parse(raw) : {}; return o[booking.id] || ''; } catch (_) { return ''; } })()} />
                                                                    </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {booking.status === 'pending_reschedule' ? (
                                                        <>
                                                            <button
                                                                onClick={() => approveReschedule(booking)}
                                                                className="bg-green-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-green-600 shadow-md transition-all flex items-center gap-1 text-sm"
                                                                title="Approve"
                                                            >
                                                                <Check size={16} /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => denyReschedule(booking)}
                                                                className="bg-red-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-red-600 shadow-md transition-all flex items-center gap-1 text-sm"
                                                                title="Deny"
                                                            >
                                                                <X size={16} /> Deny
                                                            </button>
                                                        </>
                                                    ) : booking.status === 'pending_student_approval' ? (
                                                        <span className="text-xs font-bold text-orange-500 bg-orange-100 px-3 py-2 rounded-lg">Pending Student Approval</span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => initiateTeacherReschedule(booking)}
                                                                className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg font-bold hover:bg-gray-200 transition-all flex items-center gap-2 text-sm"
                                                                title="Reschedule"
                                                            >
                                                                <Clock size={16} />
                                                            </button>
                                                            {(() => {
                                                                const packBookings = booking.recurringId ? bookings.filter(b => b.recurringId === booking.recurringId && b.status !== 'cancelled').sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)) : [];
                                                                const firstInPackPaid = packBookings.length === 10 && packBookings[0] && (packBookings[0].paymentStatus || '').toLowerCase() === 'paid';
                                                                const isIn10Pack = packBookings.length === 10;
                                                                const canStart = booking.type === 'consultation' || booking.paymentStatus === 'Due (Exception)' || (isIn10Pack ? firstInPackPaid : (booking.paymentStatus?.toLowerCase() === 'paid' || booking.paymentStatus === 'Due'));
                                                                return (
                                                            <button
                                                                onClick={() => canStart && (() => { const link = `${window.location.origin}/session/${booking.id}?host=true&name=${encodeURIComponent(booking.student)}&type=${booking.type || 'lesson'}`; window.open(link, '_blank'); })()}
                                                                disabled={!canStart}
                                                                title={!canStart ? 'Initial payment for this pack required before starting' : undefined}
                                                                className={`px-3 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-1 text-sm ${canStart ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                                            >
                                                                <Video size={16} /> {booking.type === 'consultation' ? 'Start Meeting' : 'Start Lesson'}
                                                            </button>
                                                                );
                                                            })()}
                                                            {booking.paymentStatus?.toLowerCase() !== 'paid' && booking.paymentStatus?.toLowerCase() !== 'due (exception)' && booking.type !== 'consultation' && (
                                                                <button
                                                                    onClick={() => allowPayLater(booking)}
                                                                    className="bg-orange-100 text-orange-600 px-3 py-2 rounded-lg font-bold hover:bg-orange-200 transition-all flex items-center gap-1 text-sm"
                                                                    title="Allow student to join before paying"
                                                                >
                                                                    <Shield size={16} /> Allow Pay Later
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleCancelClick(booking)}
                                                                className="bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-200 transition-all flex items-center gap-1 text-sm"
                                                            >
                                                                <X size={16} /> Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                                })()}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'slots' ? (
                    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Availability Calendar</h2>
                                <p className="text-gray-500">Manage your lesson slots and bookings.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setShowIndividualBookingModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg font-bold transition-colors whitespace-nowrap"
                                >
                                    <Plus size={18} /> Book Individual Lesson
                                </button>
                                <button
                                    onClick={() => setShowRecurringModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-bold transition-colors whitespace-nowrap"
                                >
                                    <Calendar size={18} /> Book Recurring Lessons
                                </button>
                                <button
                                    onClick={() => setShowScheduleModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors whitespace-nowrap"
                                >
                                    <Settings size={18} /> Availability
                                </button>
                            </div>
                        </div>

                        {/* Calendar Component */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24} className="text-gray-600" /></button>
                                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={24} className="text-gray-600" /></button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 border-b border-gray-100">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <div key={day} className="p-4 text-center text-xs font-bold text-gray-400 uppercase bg-gray-50 border-r border-gray-100 last:border-r-0">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {getDaysInMonth(currentDate).map((day, idx) => {
                                    if (!day) return <div key={idx} className="bg-gray-50/30 border-r border-gray-100 border-b min-h-[120px]"></div>;

                                    const dateStr = day.toISOString().split('T')[0];

                                    // Get slots and bookings for this day
                                    // 1. Confirmed Bookings
                                    const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');

                                    // 2. Manual Slots
                                    const daySlots = lessonSlots.filter(s => s.date === dateStr);
                                    const openSlots = daySlots.filter(s => !s.bookedBy && !dayBookings.some(b => b.time === s.time));
                                    const fallbackBookings = daySlots.filter(s => s.bookedBy && !dayBookings.some(b => b.time === s.time)).map(s => ({
                                        id: s.id,
                                        date: s.date,
                                        time: s.time,
                                        student: s.bookedBy,
                                        status: 'confirmed_fallback',
                                        isFallback: true
                                    }));

                                    const allDisplayItems = [...dayBookings, ...fallbackBookings];

                                    const isToday = new Date().toDateString() === day.toDateString();
                                    const isPast = day < new Date().setHours(0, 0, 0, 0);

                                    // Helper for Student Colors
                                    const getStudentColor = (name) => {
                                        const colors = [
                                            'bg-blue-100 text-blue-800 border-blue-200',
                                            'bg-green-100 text-green-800 border-green-200',
                                            'bg-purple-100 text-purple-800 border-purple-200',
                                            'bg-pink-100 text-pink-800 border-pink-200',
                                            'bg-orange-100 text-orange-800 border-orange-200',
                                            'bg-teal-100 text-teal-800 border-teal-200',
                                            'bg-indigo-100 text-indigo-800 border-indigo-200'
                                        ];
                                        let hash = 0;
                                        for (let i = 0; i < name.length; i++) {
                                            hash = name.charCodeAt(i) + ((hash << 5) - hash);
                                        }
                                        return colors[Math.abs(hash) % colors.length];
                                    };

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={`relative min-h-[120px] p-2 border-r border-b border-gray-100 transition-colors cursor-pointer group hover:bg-purple-50 ${isToday ? 'bg-purple-50/30' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-bold ${isToday ? 'bg-purple-600 text-white w-7 h-7 flex items-center justify-center rounded-full' : 'text-gray-700'}`}>
                                                    {day.getDate()}
                                                </span>
                                                {isPast && <span className="text-[10px] text-gray-300 font-bold uppercase">Past</span>}
                                            </div>

                                            <div className="space-y-1 overflow-hidden">
                                                {/* Show Bookings */}
                                                {allDisplayItems.slice(0, 3).map(booking => (
                                                    <div
                                                        key={booking.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            booking.isFallback ? null : initiateTeacherReschedule(booking);
                                                        }}
                                                        className={`text-[10px] px-2 py-1 rounded truncate font-bold border transition-all cursor-pointer hover:scale-105 ${getStudentColor(booking.student)}`}
                                                        title={booking.isFallback ? "Fallback Data" : "Click to Reschedule"}
                                                    >
                                                        {formatTime(booking.time)} {booking.type === 'consultation' ? 'FREE: ' : 'LESSON: '}{booking.student}
                                                    </div>
                                                ))}

                                                {/* Show Open Slots */}
                                                {openSlots.slice(0, Math.max(0, 3 - allDisplayItems.length)).map(slot => (
                                                    <div key={slot.id} className="text-[10px] px-2 py-1 rounded truncate font-bold bg-white text-purple-400 border border-purple-200 border-dashed hover:bg-purple-50 hover:border-purple-300 transition-colors">
                                                        {formatTime(slot.time)} Open
                                                    </div>
                                                ))}

                                                {(allDisplayItems.length + openSlots.length) > 3 && (
                                                    <div className="text-[10px] text-gray-400 font-bold pl-1">
                                                        +{(allDisplayItems.length + openSlots.length) - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-xl flex items-start gap-3">
                            <div className="text-2xl">ℹ️</div>
                            <div className="text-sm">
                                <p className="font-bold">How Availability Works:</p>
                                <p>1. <strong>Weekly Schedule:</strong> Click "Schedule & Availability" to set your recurring weekly hours. This applies to <strong>BOTH</strong> Consultations and Lessons.</p>
                                <p>2. <strong>Smart Blocking:</strong> Booking a 1-hour lesson automatically blocks the corresponding 15-min consultation slots, and vice-versa.</p>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'earnings' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Top Stats Boxes */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Earned This Month - Green */}
                            <div className="bg-[#10b981] p-8 rounded-2xl shadow-lg text-white">
                                <div className="text-sm font-bold uppercase tracking-wider mb-4">Earned This Month</div>
                                <div className="text-5xl font-black mb-2">£{earnedThisMonth}</div>
                                <div className="text-sm opacity-90 font-medium">Received payments</div>
                            </div>

                            {/* Projected This Month - Purple */}
                            <div className="bg-[#a855f7] p-8 rounded-2xl shadow-lg text-white">
                                <div className="text-sm font-bold uppercase tracking-wider mb-4">Projected This Month</div>
                                <div className="text-5xl font-black mb-2">£{projectedThisMonth}</div>
                                <div className="text-sm opacity-90 font-medium">{lessonsThisMonth} lessons booked</div>
                            </div>

                            {/* Outstanding Balance - Orange */}
                            <div className="bg-[#f97316] p-8 rounded-2xl shadow-lg text-white">
                                <div className="text-sm font-bold uppercase tracking-wider mb-4">Outstanding Balance</div>
                                <div className="text-5xl font-black mb-2">£{outstandingEarnings}</div>
                                <div className="text-sm opacity-90 font-medium">Money owed (Completed work)</div>
                            </div>
                        </div>

                        {/* Financial Summary Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                                <div className="bg-fuchsia-50 p-2 rounded-lg">
                                    <TrendingUp className="text-fuchsia-600" size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Financial Summary</h2>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between group">
                                    <span className="text-gray-500 font-medium">Total Paid (All Time)</span>
                                    <span className="text-2xl font-black text-[#10b981]">£{paidEarnings}</span>
                                </div>
                                <div className="h-px bg-gray-50" />
                                <div className="flex items-center justify-between group">
                                    <span className="text-gray-500 font-medium">Upcoming / Booked Lessons</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-[#6366f1]">£{futureEarnings}</span>
                                        <span className="text-sm text-gray-400 ml-2 font-bold">({futureBookings.length} lessons)</span>
                                    </div>
                                </div>
                                <div className="h-px bg-gray-50" />
                                <div className="flex items-center justify-between group">
                                    <span className="text-gray-500 font-medium">Total Predicted Revenue (Paid + Upcoming)</span>
                                    <span className="text-2xl font-black text-purple-600">£{paidEarnings + futureEarnings}</span>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Sessions in Earnings */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <Video className="text-indigo-500" /> Upcoming Scheduled Lessons
                                </h2>
                                <div className="flex items-center gap-3">
                                    <select value={upcomingMonthFilter} onChange={(e) => setUpcomingMonthFilter(e.target.value)} className="rounded-xl border-2 border-gray-100 px-4 py-2 font-bold text-sm text-gray-800 bg-white focus:border-indigo-500">
                                        {(() => {
                                            const now = new Date();
                                            const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                            const monthSet = new Set(futureBookings.map(b => { const d = new Date(b.date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }));
                                            const sixMonthKeys = Array.from({ length: 6 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
                                            const months = [...new Set([...sixMonthKeys, ...monthSet])].sort();
                                            return months.map(monthKey => {
                                                const [yr, mo] = monthKey.split('-').map(Number);
                                                return <option key={monthKey} value={monthKey}>{new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>;
                                            });
                                        })()}
                                    </select>
                                    <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full">
                                        {(() => { const [y, m] = (upcomingMonthFilter || '').split('-').map(Number); return futureBookings.filter(b => { const d = new Date(b.date); return d.getFullYear() === y && d.getMonth() + 1 === m; }).length; })()} Lessons
                                    </span>
                                </div>
                            </div>
                            <div className="p-0">
                                {(() => {
                                    const [y, m] = (upcomingMonthFilter || '').split('-').map(Number);
                                    const earningsMonthBookings = futureBookings.filter(b => { const d = new Date(b.date); return d.getFullYear() === y && d.getMonth() + 1 === m; });
                                    return earningsMonthBookings.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 italic">No upcoming sessions for this month.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50/50 text-left border-b border-gray-50">
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">My notes (private)</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fee</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {earningsMonthBookings.map((booking) => (
                                                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900">{new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                                            <div className="text-xs text-indigo-500 font-medium uppercase tracking-tighter">{booking.time}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-gray-700">{booking.student}</span>
                                                                    {booking.type !== 'consultation' && (() => {
                                                                        const packBookings = booking.recurringId ? bookings.filter(b => b.recurringId === booking.recurringId && b.status !== 'cancelled').sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)) : [];
                                                                        const firstInPackPaid = packBookings.length === 10 && packBookings[0] && (packBookings[0].paymentStatus || '').toLowerCase() === 'paid';
                                                                        const bundleLabel = firstInPackPaid ? 'Paid in bulk' : 'Awaiting initial payment';
                                                                        return (
                                                                        <span title={booking.paymentStatus?.toLowerCase() === 'paid' ? 'Paid' : (booking.paymentStatus === 'In bundle' ? bundleLabel : 'Payment Due')}>
                                                                            {booking.paymentStatus?.toLowerCase() === 'paid' ? (
                                                                                <CheckCircle size={14} className="text-green-500" />
                                                                            ) : booking.paymentStatus === 'In bundle' ? (
                                                                                <span className="text-[10px] text-teal-600 font-bold">{bundleLabel}</span>
                                                                            ) : (
                                                                                <AlertCircle size={14} className="text-orange-500" />
                                                                            )}
                                                                        </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                {(() => {
                                                                    if (!booking.recurringId) return null;
                                                                    const packBookings = bookings.filter(b => b.recurringId === booking.recurringId && b.status !== 'cancelled').sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
                                                                    if (packBookings.length !== 10) return null;
                                                                    const index = packBookings.findIndex(b => b.id === booking.id);
                                                                    const lessonNum = index >= 0 ? index + 1 : null;
                                                                    return lessonNum ? <span className="text-xs text-teal-600 font-bold">Lesson {lessonNum}/10</span> : null;
                                                                })()}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-purple-600">{booking.subject || booking.topic || 'Lesson'}</td>
                                                        <td className="px-6 py-2 align-top max-w-[200px]">
                                                            <TeacherPrivateNotesInput bookingId={booking.id} initialValue={(() => { try { const raw = localStorage.getItem('tutor_teacher_notes'); const o = raw ? JSON.parse(raw) : {}; return o[booking.id] || ''; } catch (_) { return ''; } })()} />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-black text-gray-900">£{booking.paymentStatus === 'In bundle' || booking.cost === 0 ? 0 : (booking.cost ?? getRateFromSubject(booking.subject || booking.topic))}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleCancelClick(booking)}
                                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Cancel Booking"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                                })()}
                            </div>
                        </div>

                        {/* 3-Month Projection */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                <Calendar className="text-purple-600" /> 3-Month Revenue Projection
                            </h2>
                            <div className="grid md:grid-cols-3 gap-6">
                                {monthlyProjections.map((month, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-purple-200 transition-all group relative overflow-hidden">
                                        {idx === 0 && (
                                            <div className="absolute top-4 right-4 bg-purple-50 text-purple-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-purple-100">
                                                Current
                                            </div>
                                        )}
                                        <h3 className="font-bold text-gray-900 text-lg mb-6">{month.monthName}</h3>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-400">Booked Lessons</span>
                                                <span className="font-black text-gray-700">{month.bookedLessons}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-teal-600">
                                                <span className="text-sm font-medium text-teal-600/60">Consultations</span>
                                                <span className="font-black">{month.consultations}</span>
                                            </div>

                                            <div className="pt-4 mt-2 border-t border-gray-50 flex justify-between items-end">
                                                <span className="text-sm font-bold text-gray-900">Projected</span>
                                                <span className="text-3xl font-black text-purple-600">£{month.projectedEarnings}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 font-display">
                                    <Clock className="text-blue-500" /> Recent Sessions
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Student</th>
                                            <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                            <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sessionHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">
                                                    No completed sessions yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            sessionHistory.slice(-10).reverse().map((session, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{new Date(session.date).toLocaleDateString('en-GB')}</td>
                                                    <td className="px-6 py-4 text-sm font-black text-gray-900">{session.studentName || session.student}</td>
                                                    <td className="px-6 py-4 text-sm font-black text-gray-900">£{session.cost || 30}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${session.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {session.paymentStatus || 'Due'}
                                                            </span>
                                                            {session.paymentStatus !== 'Paid' && session.paymentStatus !== 'Due (Exception)' && (
                                                                <button
                                                                    onClick={() => allowPayLater(session)}
                                                                    className="p-1 text-orange-400 hover:text-orange-600 transition-colors"
                                                                    title="Allow Pay Later"
                                                                >
                                                                    <Shield size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-xs font-bold text-purple-600 hover:text-purple-700 underline flex items-center gap-1 ml-auto">
                                                            View Details <ArrowRight size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'messages' ? (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                <MessageSquare className="text-blue-500" /> Messages
                            </h2>
                            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                                <button
                                    onClick={() => {
                                        setMessageType('student');
                                        setActiveChatStudent(null);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${messageType === 'student' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Students
                                </button>
                                <button
                                    onClick={() => {
                                        setMessageType('parent');
                                        setActiveChatStudent(null);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${messageType === 'parent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Parents
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex" style={{ height: '600px' }}>
                            {/* List Sidebar */}
                            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                                <div className="p-4 bg-gray-50 border-b border-gray-200">
                                    <h3 className="font-bold text-gray-700 text-sm uppercase">{messageType === 'student' ? 'Students' : 'Parents'}</h3>
                                </div>
                                {messageType === 'student' ? (
                                    students.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 italic text-sm">No students yet</div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {students.map(student => {
                                                const threadKey = student.name;
                                                const unreadCount = (chatMessages[threadKey] || []).filter(m => m.sender !== 'Davina' && !m.read).length;
                                                return (
                                                    <button
                                                        key={student.id}
                                                        onClick={() => setActiveChatStudent({ ...student, threadKey })}
                                                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${activeChatStudent?.id === student.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">
                                                                {student.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-gray-800 truncate">{student.name}</span>
                                                                    <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase">Student</span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate">
                                                                    {(chatMessages[threadKey] || []).length > 0
                                                                        ? chatMessages[threadKey][chatMessages[threadKey].length - 1].message
                                                                        : 'No messages yet'}
                                                                </div>
                                                            </div>
                                                            {unreadCount > 0 && (
                                                                <span className="bg-red-500 text-white text-[10px] min-w-[1.25rem] h-5 px-1.5 py-0.5 rounded-full font-bold flex items-center justify-center" title={`${unreadCount} unread from student`}>
                                                                    {unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )
                                ) : (
                                    (() => {
                                        const parents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
                                        return parents.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 italic text-sm">No parents yet</div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {parents.map(parent => {
                                                    const threadKey = `parent_${parent.email}`;
                                                    const unreadCount = (chatMessages[threadKey] || []).filter(m => m.sender !== 'Davina' && !m.read).length;
                                                    return (
                                                        <button
                                                            key={parent.email}
                                                            onClick={() => setActiveChatStudent({ name: parent.name, firstName: parent.firstName, email: parent.email, id: parent.email, threadKey })}
                                                            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${activeChatStudent?.id === parent.email ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                                                                    {parent.name?.charAt(0).toUpperCase() || '?'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-gray-800 truncate">{parent.firstName || parent.name}</span>
                                                                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">Parent</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">
                                                                        Child: {students.filter(s => parent.linkedStudents.includes(s.id)).map(s => s.name).join(', ') || 'Unknown'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 truncate">
                                                                        {(chatMessages[threadKey] || []).length > 0
                                                                            ? chatMessages[threadKey][chatMessages[threadKey].length - 1].message
                                                                            : 'No messages yet'}
                                                                    </div>
                                                                </div>
                                                                {unreadCount > 0 && (
                                                                    <span className="bg-red-500 text-white text-[10px] min-w-[1.25rem] h-5 px-1.5 py-0.5 rounded-full font-bold flex items-center justify-center" title={`${unreadCount} unread from parent`}>
                                                                        {unreadCount}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 flex flex-col">
                                {!activeChatStudent ? (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">
                                        Select a student to start messaging
                                    </div>
                                ) : (
                                    <>
                                        {/* Chat Header */}
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${messageType === 'parent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {activeChatStudent.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">
                                                    {(activeChatStudent.firstName || activeChatStudent.name || (messageType === 'parent' ? 'No name set' : 'Student'))} {messageType === 'parent' && '(Parent)'}
                                                </div>
                                                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
                                                    {messageType === 'parent' ? (
                                                        `Child: ${students.filter(s => parents.find(p => p.email === activeChatStudent.id)?.linkedStudents.includes(s.id)).map(s => s.name).join(', ') || '?'}`
                                                    ) : (
                                                        `Student ID: ${activeChatStudent.id}`
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Parent's note for teacher (when chatting with a parent) */}
                                            {activeChatStudent?.threadKey?.startsWith('parent_') && (() => {
                                                try {
                                                    const email = activeChatStudent.threadKey.replace('parent_', '');
                                                    const raw = localStorage.getItem('tutor_parent_notes') || '{}';
                                                    const o = JSON.parse(raw);
                                                    const note = o[email]?.note?.trim();
                                                    if (!note) return null;
                                                    return (
                                                        <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Parent&apos;s note for you</p>
                                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{note}</p>
                                                        </div>
                                                    );
                                                } catch (_) { return null; }
                                            })()}
                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                                            {(chatMessages[activeChatStudent.threadKey] || []).length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-gray-400 italic">
                                                    No messages yet. Start the conversation!
                                                </div>
                                            ) : (
                                                chatMessages[activeChatStudent.threadKey]?.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.sender === 'Davina' ? 'justify-end' : 'justify-start'} mb-4`}>
                                                        <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${msg.sender === 'Davina' ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-md' : 'bg-white border-2 border-gray-100 text-gray-800 rounded-bl-md'}`}>
                                                            <div className={`text-xs font-bold mb-2 ${msg.sender === 'Davina' ? 'text-purple-100' : 'text-gray-500'}`}>{msg.sender === 'Davina' ? 'You' : msg.senderName || msg.sender}</div>
                                                            <div className="text-base leading-relaxed">{msg.message}</div>
                                                            <div className={`text-xs mt-2 ${msg.sender === 'Davina' ? 'text-purple-100' : 'text-gray-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Message Input */}
                                        <div className="p-4 bg-white border-t border-gray-200">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter' && newMessage.trim() && activeChatStudent) {
                                                            const msg = {
                                                                sender: 'Davina',
                                                                message: newMessage,
                                                                timestamp: new Date().toISOString()
                                                            };
                                                            const updatedMessages = {
                                                                ...chatMessages,
                                                                [activeChatStudent.threadKey]: [...(chatMessages[activeChatStudent.threadKey] || []), msg]
                                                            };
                                                            setChatMessages(updatedMessages);
                                                            localStorage.setItem('chat_messages_v2', JSON.stringify(updatedMessages));
                                                            const sentContent = newMessage;
                                                            setNewMessage('');
                                                            window.dispatchEvent(new Event('storage'));

                                                            if (activeChatStudent.email) {
                                                                emailService.sendMessageNotification('Davina', activeChatStudent.email, sentContent);
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Type your message..."
                                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newMessage.trim() && activeChatStudent) {
                                                            const msg = {
                                                                sender: 'Davina',
                                                                message: newMessage,
                                                                timestamp: new Date().toISOString()
                                                            };
                                                            const updatedMessages = {
                                                                ...chatMessages,
                                                                [activeChatStudent.threadKey]: [...(chatMessages[activeChatStudent.threadKey] || []), msg]
                                                            };
                                                            setChatMessages(updatedMessages);
                                                            localStorage.setItem('chat_messages_v2', JSON.stringify(updatedMessages));
                                                            const sentContent = newMessage;
                                                            setNewMessage('');
                                                            window.dispatchEvent(new Event('storage'));

                                                            if (activeChatStudent.email) {
                                                                emailService.sendMessageNotification('Davina', activeChatStudent.email, sentContent);
                                                            }
                                                        }
                                                    }}
                                                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-all"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'settings' ? (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                    <Settings className="text-gray-600" /> Settings & Data
                                </h2>
                                <p className="text-gray-500">Manage your data and cloud synchronization.</p>
                            </div>
                        </div>
                        <div className="max-w-2xl space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><User size={20} className="text-purple-600" /> Student lesson type</h3>
                                <p className="text-sm text-gray-500 mb-4">Set the lesson type (and pricing) for each student. This updates what they see on their dashboard. If they chose wrong at signup, change it here.</p>
                                <div className="space-y-3">
                                    {students.map(s => (
                                        <div key={s.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="font-bold text-gray-800 min-w-[120px]">{s.name}</span>
                                            <select
                                                value={LESSON_TYPE_OPTIONS.includes(s.subject) ? s.subject : LESSON_TYPE_OPTIONS[0]}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const raw = JSON.parse(localStorage.getItem('tutor_students') || '[]');
                                                    const updated = raw.map(st => st.id === s.id ? { ...st, subject: val } : st);
                                                    localStorage.setItem('tutor_students', JSON.stringify(updated));
                                                    setStudents(updated);
                                                    const bookingsRaw = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
                                                    const updatedBookings = bookingsRaw.map(b => (b.student === s.name || b.studentName === s.name) && b.status !== 'cancelled' ? { ...b, subject: val } : b);
                                                    localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
                                                    setBookings(updatedBookings);
                                                    window.dispatchEvent(new Event('storage'));
                                                }}
                                                className="flex-1 max-w-[220px] rounded-xl border-2 border-purple-100 px-3 py-2 font-bold text-gray-800 focus:border-purple-500 outline-none"
                                            >
                                                {LESSON_TYPE_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt} — £{getRateFromSubject(opt)}/hr</option>
                                                ))}
                                            </select>
                                            <span className="text-xs text-gray-500">£{getRateFromSubject(LESSON_TYPE_OPTIONS.includes(s.subject) ? s.subject : LESSON_TYPE_OPTIONS[0])}/hr</span>
                                        </div>
                                    ))}
                                    {students.length === 0 && <p className="text-gray-400 italic text-sm">No students yet. Add students in the Students tab.</p>}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                                <MigrateData />
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Clear all test data</h3>
                                <p className="text-sm text-gray-500 mb-4">Remove all students, parents, bookings, lesson slots, chats and session history from this browser and (if using Supabase) from the database. Dashboards will stay the same but will be empty.</p>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!window.confirm('Permanently delete ALL students, parents, bookings, slots, chats and session history? This cannot be undone.')) return;
                                        const keys = ['tutor_students', 'tutor_parents', 'tutor_bookings', 'tutor_lesson_slots', 'tutor_slots', 'tutor_all_lesson_slots', 'chat_messages_v2', 'tutor_student_pins', 'tutor_student_extras', 'tutor_session_history'];
                                        keys.forEach(k => localStorage.removeItem(k));
                                        setStudents([]);
                                        setParents([]);
                                        setBookings([]);
                                        setLessonSlots([]);
                                        setSlots([]);
                                        setChatMessages({});
                                        setSessionHistory([]);
                                        setActiveChatStudent(null);
                                        setActiveChatParent(null);
                                        try {
                                            if (dataService.isUsingBackend) {
                                                const allStudents = await dataService.getStudents();
                                                for (const s of allStudents) await dataService.deleteStudent(s.id).catch(() => {});
                                            }
                                        } catch (_) {}
                                        window.dispatchEvent(new Event('storage'));
                                        setNotification({ type: 'success', message: 'All test data cleared.' });
                                    }}
                                    className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors"
                                >
                                    Clear all data
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Date Details Modal */}
                {
                    selectedDate && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setSelectedDate(null)}>
                            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h3>
                                    <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">✕</button>
                                </div>

                                <div className="space-y-6">
                                    {/* Bookings List: real bookings + fallback (lessonSlots with bookedBy) */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Booked Lessons</h4>
                                        <div className="space-y-2">
                                            {(() => {
                                                const dateStr = selectedDate.toISOString().split('T')[0];
                                                const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');
                                                const fallbackForDate = lessonSlots
                                                    .filter(s => s.date === dateStr && s.bookedBy && !dayBookings.some(b => b.time === s.time))
                                                    .map(s => ({ id: s.id, date: s.date, time: s.time, student: s.bookedBy, status: 'confirmed_fallback', isFallback: true }));
                                                const allForDate = [...dayBookings, ...fallbackForDate];
                                                if (allForDate.length === 0) {
                                                    return <p className="text-sm text-gray-400 italic text-center py-2">No bookings for this date.</p>;
                                                }
                                                return allForDate.map(booking => (
                                                    <div key={booking.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                                                        <div>
                                                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                                                {booking.student}
                                                                {booking.isFallback && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">Slot</span>}
                                                                {!booking.isFallback && booking.bookingFor && (
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${booking.bookingFor === 'pupil' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                                        {booking.bookingFor === 'pupil' ? '👨‍🎓 Pupil' : '👨‍👩‍👧 Parent'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                <Clock size={12} /> {formatTime(booking.time)}
                                                                {!booking.isFallback && booking.status === 'pending_reschedule' && <span className="text-orange-500 font-bold ml-1">(Rescheduling)</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {booking.isFallback ? (
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm(`Remove this lesson slot with ${booking.student}?`)) {
                                                                            const updatedSlots = lessonSlots.map(s => s.id === booking.id ? { ...s, bookedBy: null } : s);
                                                                            setLessonSlots(updatedSlots);
                                                                            localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));
                                                                            window.dispatchEvent(new Event('storage'));
                                                                            setSelectedDate(null);
                                                                        }
                                                                    }}
                                                                    className="bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    Remove
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedDate(null);
                                                                            initiateTeacherReschedule(booking);
                                                                        }}
                                                                        className="bg-white text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                                                                    >
                                                                        Reschedule
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (window.confirm(`Cancel lesson with ${booking.student}?`)) {
                                                                                const updated = bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b);
                                                                                setBookings(updated);
                                                                                localStorage.setItem('tutor_bookings', JSON.stringify(updated));
                                                                                window.dispatchEvent(new Event('storage'));
                                                                                emailService.sendCancellationNotice(booking, 'teacher');
                                                                                setSelectedDate(null);
                                                                            }
                                                                        }}
                                                                        className="bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    {booking.recurringId && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (window.confirm(`Delete ALL future lessons in this series for ${booking.student}?`)) {
                                                                                    const now = new Date();
                                                                                    const seriesToDelete = bookings.filter(b =>
                                                                                        b.recurringId === booking.recurringId &&
                                                                                        new Date(b.date + 'T' + b.time) >= now
                                                                                    );
                                                                                    const updated = bookings.filter(b => !seriesToDelete.find(s => s.id === b.id));
                                                                                    setBookings(updated);
                                                                                    localStorage.setItem('tutor_bookings', JSON.stringify(updated));
                                                                                    window.dispatchEvent(new Event('storage'));
                                                                                    emailService.sendCancellationNotice({ ...booking, subject: `${booking.subject} (Entire Series Cancelled)` }, 'teacher');
                                                                                    setSelectedDate(null);
                                                                                }
                                                                            }}
                                                                            className="bg-red-600 text-white border border-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-sm"
                                                                        >
                                                                            Cancel Series
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        <div className="h-px bg-gray-100 my-4"></div>
                                    </div>

                                    {/* Book New Lesson Form */}
                                    <div className="pt-6 border-t border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4">Book New Lesson</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Select Student</label>
                                                <select
                                                    id="studentSelect"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white outline-none focus:border-purple-600"
                                                >
                                                    <option value="">Select...</option>
                                                    {students.map(s => (
                                                        <option key={s.id} value={s.name}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Time</label>
                                                <select
                                                    id="bookingTime"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white outline-none focus:border-purple-600"
                                                    defaultValue="14:00"
                                                >
                                                    {timeOptions.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Subject / Topic</label>
                                                <input
                                                    id="bookingSubject"
                                                    type="text"
                                                    placeholder="e.g. Algebra Revision"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold bg-white outline-none focus:border-purple-600"
                                                />
                                            </div>
                                            <div className="col-span-2 flex items-center gap-3 bg-fuchsia-50/50 p-4 rounded-xl border border-fuchsia-100">
                                                <input
                                                    id="bookingRecurring"
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-gray-300 text-fuchsia-600 focus:ring-fuchsia-500"
                                                />
                                                <label htmlFor="bookingRecurring" className="text-sm font-bold text-fuchsia-900">
                                                    Recurring Weekly (10 Weeks)
                                                </label>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const name = document.getElementById('studentSelect').value;
                                                    const time = document.getElementById('bookingTime').value;
                                                    const subject = document.getElementById('bookingSubject').value;
                                                    const isRecurring = document.getElementById('bookingRecurring').checked;

                                                    if (!name || !time) {
                                                        alert('Please select a student and time');
                                                        return;
                                                    }

                                                    const newBookings = [];
                                                    const startDate = new Date(selectedDate);
                                                    const numWeeks = isRecurring ? 10 : 1;
                                                    const recurringId = isRecurring ? Date.now().toString() : null;

                                                    for (let i = 0; i < numWeeks; i++) {
                                                        const bookingDate = new Date(startDate);
                                                        bookingDate.setDate(startDate.getDate() + (i * 7));

                                                        newBookings.push({
                                                            id: (Date.now() + i).toString(),
                                                            student: name,
                                                            date: bookingDate.toISOString().split('T')[0],
                                                            time: time,
                                                            subject: subject || 'Individual Lesson',
                                                            type: 'lesson',
                                                            status: 'pending_approval',
                                                            notes: '',
                                                            recurringId: recurringId,
                                                            proposedBy: 'teacher'
                                                        });
                                                    }

                                                    const updated = [...bookings, ...newBookings];
                                                    setBookings(updated);
                                                    localStorage.setItem('tutor_bookings', JSON.stringify(updated));
                                                    window.dispatchEvent(new Event('storage'));
                                                    alert(isRecurring ? `10 recurring lessons proposed for ${name}!` : `Lesson proposed for ${name}!`);
                                                }}
                                                className="col-span-2 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold shadow-md hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={18} /> Propose Lesson
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 mb-6"></div>

                                    {/* Add Slot Form */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 text-center">Add 1-Hour Open Slot</h4>
                                        <div className="flex gap-2">
                                            <select
                                                value={newLessonTime}
                                                onChange={e => setNewLessonTime(e.target.value)}
                                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-purple-600 outline-none font-bold text-center appearance-none"
                                            >
                                                <option value="">Select Time</option>
                                                {timeOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => addLessonSlot(selectedDate.toISOString().split('T')[0], newLessonTime)}
                                                className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                                            >
                                                Add Slot
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Weekly Schedule Settings Modal */}
                {
                    showScheduleModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 text-left overflow-y-auto pt-8 pb-8" onClick={(e) => e.target === e.currentTarget && setShowScheduleModal(false)}>
                            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col animate-in zoom-in-95 max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Consultation Hours (Weekly)</h2>
                                        <p className="text-sm text-gray-500">Auto-generates 15-min consultation slots. Scroll for Saturday & Sunday.</p>
                                    </div>
                                    <button type="button" onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400">✕</button>
                                </div>

                                <div className="overflow-y-auto p-6 custom-scrollbar min-h-0 flex-1">
                                    {weeklySchedule.map((day, dIndex) => (
                                        <div key={day.day} className={`p-4 border-b border-gray-50 last:border-0 transition-colors ${day.active ? 'bg-white' : 'bg-gray-50/50 rounded-xl'}`}>
                                            <div className="flex items-start gap-4">
                                                <div className="w-32 flex items-center gap-3 pt-2">
                                                    <button
                                                        onClick={() => toggleDay(dIndex)}
                                                        className={`w-10 h-6 rounded-full transition-colors relative ${day.active ? 'bg-purple-600' : 'bg-gray-300'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${day.active ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                    <span className={`font-bold ${day.active ? 'text-gray-900' : 'text-gray-400'}`}>{day.day}</span>
                                                </div>

                                                {day.active ? (
                                                    <div className="flex-1 space-y-2">
                                                        {day.intervals.map((interval, iIndex) => (
                                                            <div key={iIndex} className="flex items-center gap-2">
                                                                <Clock size={16} className="text-gray-400" />
                                                                <select
                                                                    value={interval.start}
                                                                    onChange={(e) => updateInterval(dIndex, iIndex, 'start', e.target.value)}
                                                                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                                                >
                                                                    {timeOptions.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                                <span className="text-gray-400">-</span>
                                                                <select
                                                                    value={interval.end}
                                                                    onChange={(e) => updateInterval(dIndex, iIndex, 'end', e.target.value)}
                                                                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                                                >
                                                                    {timeOptions.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                                <button
                                                                    onClick={() => removeInterval(dIndex, iIndex)}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => addInterval(dIndex)}
                                                            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-1"
                                                        >
                                                            <Plus size={14} /> Add Shift
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic pt-2">Unavailable</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                    <button type="button" onClick={() => setShowScheduleModal(false)} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">Done</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Recurring Booking Modal */}
                {
                    showRecurringModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowRecurringModal(false)}>
                            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Book Recurring Lessons</h3>
                                <form onSubmit={handleRecurringBooking} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Student</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-purple-600"
                                            value={recurringConfig.studentId}
                                            required
                                            onChange={e => setRecurringConfig({ ...recurringConfig, studentId: e.target.value })}
                                        >
                                            <option value="">Select Student</option>
                                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-purple-600"
                                                value={recurringConfig.startDate}
                                                onChange={e => setRecurringConfig({ ...recurringConfig, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Time</label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-purple-600 appearance-none"
                                                value={recurringConfig.time}
                                                onChange={e => setRecurringConfig({ ...recurringConfig, time: e.target.value })}
                                            >
                                                <option value="">Time</option>
                                                {timeOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Subject</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-purple-600"
                                            value={recurringConfig.subject}
                                            onChange={e => setRecurringConfig({ ...recurringConfig, subject: e.target.value })}
                                        >
                                            <option value="Maths KS3">Maths KS3</option>
                                            <option value="Maths GCSE">Maths GCSE</option>
                                            <option value="Sociology GCSE">Sociology GCSE</option>
                                            <option value="Sociology A-Level">Sociology A-Level</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Duration</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-purple-600"
                                            value={recurringConfig.weeks}
                                            onChange={e => setRecurringConfig({ ...recurringConfig, weeks: Number(e.target.value) })}
                                        >
                                            <option value={4}>4 Weeks</option>
                                            <option value={8}>8 Weeks</option>
                                            <option value={10}>10 Weeks</option>
                                            <option value={12}>12 Weeks</option>
                                        </select>
                                        {recurringConfig.weeks === 10 && <p className="mt-1.5 text-xs text-gray-500 font-medium">£280 for 10 lessons</p>}
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all mt-2">
                                        Confirm Booking
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Individual Booking Modal */}
                {
                    showIndividualBookingModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowIndividualBookingModal(false)}>
                            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Book Individual Lesson</h3>
                                <form onSubmit={handleIndividualBooking} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Student</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-teal-600"
                                            value={individualBookingConfig.studentId}
                                            required
                                            onChange={e => setIndividualBookingConfig({ ...individualBookingConfig, studentId: e.target.value })}
                                        >
                                            <option value="">Select Student</option>
                                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Subject</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-teal-600"
                                            value={individualBookingConfig.subject}
                                            onChange={e => setIndividualBookingConfig({ ...individualBookingConfig, subject: e.target.value })}
                                        >
                                            <option value="Maths KS3">Maths KS3</option>
                                            <option value="Maths GCSE">Maths GCSE</option>
                                            <option value="Sociology GCSE">Sociology GCSE</option>
                                            <option value="Sociology A-Level">Sociology A-Level</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Date</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-teal-600"
                                                value={individualBookingConfig.date}
                                                onChange={e => setIndividualBookingConfig({ ...individualBookingConfig, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Time</label>
                                            <select
                                                required
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-teal-600 appearance-none"
                                                value={individualBookingConfig.time}
                                                onChange={e => setIndividualBookingConfig({ ...individualBookingConfig, time: e.target.value })}
                                            >
                                                <option value="">Time</option>
                                                {timeOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all mt-2">
                                        Confirm Booking
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Teacher Reschedule Modal */}
                {
                    rescheduleTarget && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setRescheduleTarget(null)}>
                            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">Reschedule Lesson</h3>
                                <p className="text-sm text-gray-500 mb-4">Propose a new time for {rescheduleTarget.student}.</p>

                                <div className="space-y-4">
                                    <div className="bg-purple-50 p-3 rounded-lg text-sm">
                                        <span className="block text-xs uppercase font-bold text-purple-400">Current</span>
                                        <span className="font-bold text-purple-900">{new Date(rescheduleTarget.date).toLocaleDateString('en-GB')} at {formatTime(rescheduleTarget.time)}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">New Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-purple-600"
                                                value={rescheduleConfig.newDate}
                                                onChange={e => setRescheduleConfig({ ...rescheduleConfig, newDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">New Time</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-purple-600 appearance-none"
                                                value={rescheduleConfig.newTime}
                                                onChange={e => setRescheduleConfig({ ...rescheduleConfig, newTime: e.target.value })}
                                            >
                                                {timeOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {rescheduleTarget.recurringId && (
                                        <div className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                                            <input
                                                type="checkbox"
                                                id="series"
                                                checked={rescheduleConfig.applyToSeries}
                                                onChange={e => setRescheduleConfig({ ...rescheduleConfig, applyToSeries: e.target.checked })}
                                                className="w-5 h-5 accent-purple-600"
                                            />
                                            <label htmlFor="series" className="text-sm text-gray-600">
                                                <span className="font-bold block text-gray-800">Apply to Series</span>
                                                Shift all future lessons in this block
                                            </label>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <button onClick={() => setRescheduleTarget(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">Back</button>
                                            <button onClick={confirmTeacherReschedule} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all">
                                                Send Proposal
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleCancelClick(rescheduleTarget);
                                            }}
                                            className="w-full py-2.5 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all border border-red-100 mt-2"
                                        >
                                            Cancel Lesson Entirely
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Reschedule Confirmation Modal */}
                {
                    rescheduleConfirm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setRescheduleConfirm(null)}>
                            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${rescheduleConfirm.action === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {rescheduleConfirm.action === 'approve' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {rescheduleConfirm.action === 'approve' ? 'Approve Reschedule?' : 'Deny Reschedule?'}
                                </h3>
                                <p className="text-gray-500 mb-6 text-sm">
                                    {rescheduleConfirm.action === 'approve'
                                        ? `Confirm change to ${new Date(rescheduleConfirm.booking.requestedDate).toLocaleDateString('en-GB')} at ${formatTime(rescheduleConfirm.booking.requestedTime)}?`
                                        : 'Are you sure you want to deny this request? The new slot will be freed.'}
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setRescheduleConfirm(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                                    <button
                                        onClick={rescheduleConfirm.action === 'approve' ? confirmApprove : confirmDeny}
                                        className={`flex-1 py-3 text-white rounded-xl font-bold transition-all shadow-md ${rescheduleConfirm.action === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                                    >
                                        {rescheduleConfirm.action === 'approve' ? 'Confirm Approval' : 'Confirm Denial'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Cancellation Confirmation Modal */}
                {
                    cancelConfirm && (() => {
                        const pack = bookings.filter(b => b.recurringId === cancelConfirm.booking.recurringId && b.status !== 'cancelled');
                        const isPaidPack = pack.length === 10 && pack[0] && (pack[0].paymentStatus || '').toLowerCase() === 'paid';
                        return (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={() => setCancelConfirm(null)}>
                                <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
                                    {isPaidPack ? (
                                        <>
                                            <AlertCircle className="mx-auto text-amber-500 mb-4" size={40} />
                                            <h3 className="text-xl font-black mb-2">Bulk paid slot</h3>
                                            <p className="text-gray-600 mb-6 font-bold text-sm">
                                                You cannot cancel a bulk paid slot. Please reschedule to a new time instead. Refunds are not available for individual sessions in a paid pack.
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={() => { initiateTeacherReschedule(cancelConfirm.booking); setCancelConfirm(null); }}
                                                    className="w-full py-3 bg-teal-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all"
                                                >
                                                    Reschedule instead
                                                </button>
                                                <button onClick={() => setCancelConfirm(null)} className="w-full py-3 text-gray-400 font-black uppercase tracking-widest text-xs">Keep Session</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="mx-auto text-red-500 mb-4" size={40} />
                                            <h3 className="text-xl font-black mb-2">Cancel Lesson?</h3>
                                            <p className="text-gray-500 mb-6 font-bold text-sm">
                                                {cancelConfirm.booking.recurringId
                                                    ? "This session is part of a recurring series. Would you like to cancel just this one, or the entire series?"
                                                    : `Are you sure you want to cancel the session for ${cancelConfirm.booking.student} on ${new Date(cancelConfirm.booking.date).toLocaleDateString('en-GB')} at ${cancelConfirm.booking.time}?`}
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                {cancelConfirm.booking.recurringId ? (
                                                    <>
                                                        <button onClick={() => confirmCancellation('single')} className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-200 transition-all">Cancel Just This One</button>
                                                        <button onClick={() => confirmCancellation('series')} className="w-full py-3 bg-red-600 text-white rounded-xl font-black shadow-lg uppercase tracking-widest text-xs hover:bg-red-700 transition-all">Cancel Entire Series</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => confirmCancellation('single')} className="w-full py-3 bg-red-600 text-white rounded-xl font-black shadow-lg uppercase tracking-widest text-xs">Confirm Cancellation</button>
                                                )}
                                                <button onClick={() => setCancelConfirm(null)} className="w-full py-3 text-gray-400 font-black uppercase tracking-widest text-xs">Keep Session</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                }

                {/* Complete lesson notes modal (for sessions skipped at end) */}
                {completeNotesFor && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto m-4">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Complete lesson summary</h3>
                                <p className="text-sm text-gray-500 mt-1">{completeNotesFor.studentName} — {completeNotesFor.date ? new Date(completeNotesFor.date).toLocaleDateString('en-GB') : ''}</p>
                            </div>
                            <form onSubmit={submitCompleteNotes} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Topics Covered</label>
                                    <input required type="text" value={completeNotesTopic} onChange={e => setCompleteNotesTopic(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-purple-500 outline-none" placeholder="e.g. Algebra Basics" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">What went well?</label>
                                        <textarea required value={completeNotesWell} onChange={e => setCompleteNotesWell(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-green-500 outline-none h-24 text-sm" placeholder="Great focus today..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Improvements?</label>
                                        <textarea required value={completeNotesImprove} onChange={e => setCompleteNotesImprove(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-amber-500 outline-none h-24 text-sm" placeholder="Practice more..." />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Focus</label>
                                        <textarea value={completeNotesFocus} onChange={e => setCompleteNotesFocus(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-500 outline-none h-24 text-sm" placeholder="Key topics focused on..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Homework/Next Steps</label>
                                        <textarea value={completeNotesNextSteps} onChange={e => setCompleteNotesNextSteps(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:border-purple-500 outline-none h-24 text-sm" placeholder="E.g. Focus on quadratic equations" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700">Save lesson summary</button>
                                    <button type="button" onClick={() => { setCompleteNotesFor(null); setCompleteNotesTopic(''); setCompleteNotesWell(''); setCompleteNotesImprove(''); setCompleteNotesFocus(''); setCompleteNotesNextSteps(''); }} className="py-3 px-4 text-gray-500 hover:text-gray-700 font-bold rounded-xl border border-gray-200">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Session notes modal */}
                {sessionNotesStudent && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSessionNotesStudent(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FileText size={20} className="text-teal-600" /> Session notes – {sessionNotesStudent.name}
                                </h3>
                                <button onClick={() => setSessionNotesStudent(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">×</button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-4">
                                {(() => {
                                    const history = JSON.parse(localStorage.getItem('tutor_session_history') || '[]');
                                    const forStudent = history.filter(s => (s.studentName || s.student || '').toLowerCase() === (sessionNotesStudent.name || '').toLowerCase()).sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));
                                    if (forStudent.length === 0) return <p className="text-gray-500 text-sm">No session notes yet.</p>;
                                    return forStudent.map((s, i) => (
                                        <div key={s.id || i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-left">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.date ? new Date(s.date).toLocaleDateString('en-GB') : 'Session'}</p>
                                            <p className="font-bold text-gray-900 mt-1">{s.topic || s.subject || 'Lesson'}</p>
                                            {s.next_steps && <p className="text-sm text-gray-700 mt-2"><span className="font-semibold text-gray-500">Next steps:</span> {s.next_steps}</p>}
                                            {s.feedback_well && <p className="text-sm text-gray-700 mt-1"><span className="font-semibold text-gray-500">Went well:</span> {s.feedback_well}</p>}
                                            {s.feedback_improve && <p className="text-sm text-gray-700 mt-1"><span className="font-semibold text-gray-500">To improve:</span> {s.feedback_improve}</p>}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Notification UI */}
                {notification && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10">
                        <div className={`px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border-2 ${notification.type === 'error' ? 'bg-red-500 border-red-400 text-white' : 'bg-purple-600 border-purple-500 text-white'}`}>
                            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            <span className="font-bold text-sm tracking-tight">{notification.message}</span>
                            <button onClick={() => setNotification(null)} className="ml-2 opacity-50 text-xl font-bold">×</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDashboard;
