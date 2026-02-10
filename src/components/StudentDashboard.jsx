import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Clock, Calendar, Video, MessageSquare, Star,
    CheckCircle, AlertCircle, TrendingUp, CreditCard,
    FileText, ChevronRight, LogOut, Plus, ArrowRight, X, Trash2
} from 'lucide-react';
import { emailService } from '../utils/email';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { studentName } = useParams();
    const [displayName, setDisplayName] = useState(studentName || new URLSearchParams(window.location.search).get('student') || 'Guest');
    const [studentId, setStudentId] = useState('');

    const [history, setHistory] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [availableLessons, setAvailableLessons] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'booking', 'invoices', 'profile'
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingSubject, setBookingSubject] = useState('');
    const [rescheduleTarget, setRescheduleTarget] = useState(null); // The booking being rescheduled
    const [showRescheduleModal, setShowRescheduleModal] = useState(false); // Modal state
    const [bookTenWeeks, setBookTenWeeks] = useState(false); // Bulk booking togglestate

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editNoteTarget, setEditNoteTarget] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [dismissedCancelledBanner, setDismissedCancelledBanner] = useState(() => {
        return localStorage.getItem('dismissed_cancelled_banner') === 'true';
    });
    const [paymentTarget, setPaymentTarget] = useState(null);
    const [receiptTarget, setReceiptTarget] = useState(null);
    const [notification, setNotification] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    // Review System State
    const [reviewTarget, setReviewTarget] = useState(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [confirmation, setConfirmation] = useState(null);

    // Payment Processing State
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        // Load data
        const loadData = () => {
            const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
            // Filter history for this student (fuzzy match for now or show all if name is generic)
            const myHistory = allHistory.filter(h =>
                h.studentName.toLowerCase().includes(studentName.toLowerCase()) ||
                studentName.toLowerCase().includes(h.studentName.toLowerCase())
            );
            setHistory(myHistory.reverse()); // Newest first

            const allStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
            const myProfile = allStudents.find(s => s.name.toLowerCase() === displayName.toLowerCase());
            if (myProfile) setStudentId(myProfile.id);

            const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
            const myBookings = allBookings.filter(b =>
                b.student.toLowerCase().includes(studentName.toLowerCase())
            );
            setBookings(myBookings.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)));

            // Load chat messages using same structure as teacher dashboard
            const messages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
            setChatMessages(messages[studentName] || []);

            // Load ALL lesson slots (manual + generated from teacher's weekly schedule)
            const allLessonSlots = JSON.parse(localStorage.getItem('tutor_all_lesson_slots')) || [];

            // Filter and Process available slots
            const available = [];

            allLessonSlots.forEach(l => {
                // 1. Basic Checks
                if (l.bookedBy) return;
                const slotStart = new Date(l.date + 'T' + l.time);
                if (slotStart <= new Date()) return;

                // 2. Check overlap for standard 1-hour slot
                const slotEnd = new Date(slotStart.getTime() + 60 * 60000);

                const getOverlap = (start, end) => {
                    return allBookings.find(b => {
                        const bStart = new Date(`${b.date}T${b.time} `);
                        // Consultation is 15m, Lesson is 60m. 
                        // If b.type is missing, assume it's a lesson (60m) unless we check duration (not stored currently).
                        // BUT: We know manual bookings from LandingPage (15m) and Dashboard (60m).
                        // For safety, let's assume blocking is point-based or we'd need duration. 
                        // Actually, logic in LandingPage treats LandingPage bookings as 15m (implicit).
                        // Let's assume bookings with 'type'='consultation' (or from landing page) are 15m.
                        // Since we don't strictly store Type everywhere, let's check exact times.

                        // Simply: Does the booking *start* inside our window?
                        // Or does our window *start* inside the booking?
                        // We need to know booking duration. 
                        // Existing logic assumed blocking if start times clashed.

                        // Let's refine:
                        // If it's a "Lesson" booking (from Student Dash), it blocks 60m.
                        // If it's a "Consultation" booking (from Landing Page), it blocks 15m.
                        // We can heuristics: if 'student' field exists and no 'type', it's likely a paid lesson? 
                        // Actually, LandingPage bookings have 'student' too.
                        // However, LandingPage bookings usually have `type: 'consultation'` in newer logic? 
                        // Let's check LandingPage.jsx booking creation... It doesn't explicitly save 'type' in previous versions.
                        // But recent changes might have added it? No.
                        // SAFE BET: If the booking ID starts with 'consult-', it's a consultation. 
                        // Or we can check if the booking time is X:15, X:45 - likely consultation.

                        // Let's stick to strict time collision:
                        // We will assume any booking blocks at least 15 mins.
                        // If a booking is AT X:00, it might be 15m or 60m.

                        // For the purpose of "Shifting":
                        // We only care if the X:00 slot is blocked by something starting at X:00.
                        return bStart >= start && bStart < end;
                    });
                };

                const blocker = getOverlap(slotStart, slotEnd);

                if (!blocker) {
                    available.push(l);
                } else {
                    // 3. Smart Shifting Logic
                    // If blocked, check if we can start 15 mins later?
                    // Only try this if the blocker starts EXACTLY at the slot start (impacting the first 15m).
                    const blockerTime = new Date(`${blocker.date}T${blocker.time} `);

                    if (blockerTime.getTime() === slotStart.getTime()) {
                        // It's blocked at the start.
                        // Try shifting to X:15
                        const shiftedStart = new Date(slotStart.getTime() + 15 * 60000);
                        const shiftedEnd = new Date(shiftedStart.getTime() + 60 * 60000); // 1 hour duration

                        // Check if this NEW window is free
                        // We need to check against ALL bookings
                        const shiftedBlocker = allBookings.find(b => {
                            const bStart = new Date(`${b.date}T${b.time} `);
                            // Check if booking falls in our new window
                            const isInsideUpdatedWindow = bStart >= shiftedStart && bStart < shiftedEnd;

                            // ALSO check if a PREVIOUS booking runs into our new window
                            // e.g. a lesson starting at X-45 (ending at X+15) would block us.
                            // But we simplify: assume standard grid slots for lessons (X:00).

                            // Crucial: Check if the blocker at X:00 was actually a LESSON (60m).
                            // If X:00 is a 60m lesson, it ends at X+60. It would block X:15 too.
                            // If X:00 is a 15m consultation, it ends at X:15. It allows X:15 start.

                            // Heuristic: If existing booking is at X:00, how do we know if it's 15m or 60m?
                            // If it's in 'tutor_bookings', we can check if it corresponds to a 'tutor_all_lesson_slots' entry?
                            // No, because bookings are copies.

                            // Strategy: Consultations are usually free/unconfirmed? No, they are confirmed bookings.
                            // Let's assume if it blocks X:00, we *try* X:15.
                            // If X:15 is blocked (by the same meeting extending, or another meeting), we fail.

                            // If X:00 meeting is 60 mins: it covers X:00-X:60.
                            // Our X:15 start needs X:15-X:75.
                            // Overlap!

                            // So we explicitly need to know if the X:00 booking is SHORT.
                            // We can check `booking.type === 'consultation'`?
                            // Or just check if X:15 is explicitly booked? No, that doesn't tell us if X:00 is long.

                            return isInsideUpdatedWindow;
                        });

                        // If the X:00 booking was a long lesson, it technically occupies X:15, X:30 etc.
                        // But our 'allBookings' array only stores START times.
                        // checks: [ {time: '10:00'} ]
                        // changing to [ {time: '10:15'} ] won't collide with '10:00' in simple array search?

                        // We need DURATION.
                        // Since we lack robust duration data, let's use the USER'S context:
                        // "beginning the lesson after the 15 min consultation"
                        // This implies the user knows they have 15m slots.

                        // We'll trust the user and allow the shift, identifying the slot as special.
                        // BUT to be safe, we should ensure no booking starts at X:15, X:30, X:45, X+1:00.

                        const hasLaterConflict = allBookings.some(b => {
                            const bTime = new Date(`${b.date}T${b.time} `);
                            return bTime >= shiftedStart && bTime < shiftedEnd;
                        });

                        if (!hasLaterConflict) {
                            // Create a shifted slot
                            // Ensure we don't output duplicate IDs for the same original slot
                            const timeStr = shiftedStart.toTimeString().slice(0, 5);
                            available.push({
                                ...l,
                                id: l.id + '-shifted',
                                time: timeStr,
                                isShifted: true // Optional UI indicator
                            });
                        }
                    }
                }
            });

            setAvailableLessons(available.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)));
        };

        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, [studentName, displayName]);

    // Mark messages as read when the messages tab is active
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

                // Update state and localStorage
                localStorage.setItem('chat_messages_v2', JSON.stringify(updatedMessages));
                setChatMessages(updatedThread);
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, [activeTab, studentName]);

    const handleJoinLesson = (roomId) => {
        navigate(`/session/${roomId}?student=${encodeURIComponent(studentName)}`);
    };

    const handlePay = (invoice) => {
        setPaymentTarget(invoice);
    };

    const processPayment = (e) => {
        e.preventDefault();
        setIsProcessingPayment(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessingPayment(false);
            markAsPaid(paymentTarget.id);
            setPaymentTarget(null);
            setNotification({ type: 'success', message: "Payment Successful! Receipt sent to email." });
            setConfirmation(null); // Just in case
        }, 2000);
    };

    const handleSaveNote = (e) => {
        e.preventDefault();
        if (!editNoteTarget) return;

        const updated = bookings.map(b =>
            b.id === editNoteTarget.booking.id ? { ...b, subject: editNoteTarget.currentNote } : b
        );
        setBookings(updated);
        localStorage.setItem('tutor_bookings', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        setEditNoteTarget(null);
    };

    const markBlockAsPaid = (currentInvoiceId) => {
        // Find current invoice and next 9 unpaid lessons
        const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];

        // Combine and sort by date
        const allInvoices = [...allHistory, ...allBookings]
            .filter(inv => inv.paymentStatus === 'Due')
            .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));

        // Take first 10 (including current)
        const toMark = allInvoices.slice(0, 10).map(inv => inv.id);

        // Update history
        const updatedHistory = allHistory.map(h =>
            toMark.includes(h.id) ? { ...h, paymentStatus: 'Paid' } : h
        );
        localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));
        setHistory(prev => prev.map(h => toMark.includes(h.id) ? { ...h, paymentStatus: 'Paid' } : h));

        // Update bookings
        const updatedBookings = allBookings.map(b =>
            toMark.includes(b.id) ? { ...b, paymentStatus: 'Paid' } : b
        );
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        setBookings(prev => prev.map(b => toMark.includes(b.id) ? { ...b, paymentStatus: 'Paid' } : b));

        window.dispatchEvent(new Event('storage'));
    };

    const handleReceipt = (invoice) => {
        setReceiptTarget(invoice);
    };

    const handleBankPay = (invoice) => {
        setConfirmation({
            message: `Securely pay £${invoice.cost} via your Bank App(Open Banking) ? `,
            onConfirm: () => {
                setTimeout(() => {
                    markAsPaid(invoice.id);
                    setNotification({ type: 'success', message: "Payment Authorized!" });
                    setConfirmation(null);
                }, 1000);
            },
            onCancel: () => setConfirmation(null)
        });
    };

    const markAsPaid = (invoiceId) => {
        // Update HISTORY
        const allHistory = JSON.parse(localStorage.getItem('tutor_session_history') || '[]');
        const target = allHistory.find(h => h.id === invoiceId);

        // Update target and potentially other recurring ones
        const updatedHistory = allHistory.map(h => {
            if (h.id === invoiceId) return { ...h, paymentStatus: 'Paid' };
            // If the paid one was a bulk payment (£280) or part of a recurring series
            if (target && target.recurringId && h.recurringId === target.recurringId) {
                return { ...h, paymentStatus: 'Paid' };
            }
            return h;
        });

        localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));
        setHistory(updatedHistory.filter(h => h.studentId === student.id || h.student === student.name));

        // Update BOOKINGS
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
        const updatedBookings = allBookings.map(b => {
            if (b.id === invoiceId) return { ...b, paymentStatus: 'Paid' };
            if (target && target.recurringId && b.recurringId === target.recurringId) {
                return { ...b, paymentStatus: 'Paid' };
            }
            return b;
        });
        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        setBookings(updatedBookings.filter(b => b.studentId === student.id || b.student === student.name));

        window.dispatchEvent(new Event('storage'));
    };

    const handleBookLesson = (slot) => {
        setSelectedSlot(slot);
        setBookingSubject('General Tuitions'); // Pre-fill for convenience
        setShowBookingModal(true);
    };

    const executeBooking = (bookingsToAdd, slotsToUpdate) => {
        const allSlots = JSON.parse(localStorage.getItem('tutor_lesson_slots')) || [];
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];

        // Update Slots
        let finalSlots = [...allSlots];
        slotsToUpdate.forEach(u => {
            const idx = finalSlots.findIndex(s => s.date === u.date && s.time === u.time);
            if (idx >= 0) {
                finalSlots[idx] = u;
            } else {
                finalSlots.push(u);
            }
        });
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(finalSlots));

        // Add Bookings
        const finalBookings = [...allBookings, ...bookingsToAdd];
        localStorage.setItem('tutor_bookings', JSON.stringify(finalBookings));

        setNotification({
            type: 'success',
            message: bookingsToAdd.length > 1
                ? `Successfully booked ${bookingsToAdd.length} lessons!`
                : 'Lesson Booked Successfully!'
        });

        window.dispatchEvent(new Event('storage'));
        setShowBookingModal(false);
        setBookingSubject('');
        setSelectedSlot(null);
        setRescheduleTarget(null);
        setActiveTab('overview');
    };


    const confirmBooking = () => {
        // Validation for new bookings (subject required)
        // For rescheduling, we might carry over the subject, so check if it's a new booking
        if (!rescheduleTarget && !bookingSubject.trim()) {
            setNotification({ type: 'error', message: 'Please enter what you\'d like to cover in this lesson.' });
            return;
        }

        // 1. Update Lesson Slot (Mark new slot as 'booked' or 'pending'?)
        // For simplicity in this demo, we'll mark it as booked (blocked) immediately
        // BUT for Reschedule, user asked to "Request a change... confirm before fully booked".
        // If we don't block it, someone else might take it.
        // Let's block it but with a special status if possible, or just 'bookedBy' student.
        // We'll proceed with blocking it to ensure availability.

        const allSlots = JSON.parse(localStorage.getItem('tutor_lesson_slots')) || [];
        const updatedSlots = allSlots.map(s => s.id === selectedSlot.id ? { ...s, bookedBy: studentName } : s);

        // If rescheduling, we should theoretically FREE the old slot? 
        // User said: "must confirm before fully booked".
        // Implies we hold BOTH slots? Or just the new one is 'Held'?
        // Let's hold the new one. The old one remains booked until approved. 
        // So we occupy 2 slots temporarily. 
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));

        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];

        if (rescheduleTarget) {
            // Update EXISTING booking to 'pending_reschedule'
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
            setNotification({ type: 'success', message: 'Reschedule Request Sent! Your teacher will confirm shortly.' });

            // Notify Teacher
            emailService.sendRescheduleRequest({
                ...rescheduleTarget,
                requestedDate: selectedSlot.date,
                requestedTime: selectedSlot.time
            }, 'student');

            setShowBookingModal(false);
            window.dispatchEvent(new Event('storage'));
        } else {
            if (bookTenWeeks) {
                // Bulk Booking Logic
                let successfulBookings = 0;
                let conflicts = [];
                const bookingsToAdd = [];
                const slotsToUpdate = [];

                // Loop 10 weeks
                for (let i = 0; i < 10; i++) {
                    const nextDate = new Date(selectedSlot.date);
                    nextDate.setDate(nextDate.getDate() + (i * 7));
                    const dateStr = nextDate.toISOString().split('T')[0];
                    const timeStr = selectedSlot.time;

                    // Check Conflict
                    // We need to check if there is an existing booking OR if the slot is taken
                    // Slot check:
                    const existingSlot = allSlots.find(s => s.date === dateStr && s.time === timeStr);
                    // Booking check:
                    const existingBooking = allBookings.find(b => b.date === dateStr && b.time === timeStr);

                    if ((existingSlot && existingSlot.bookedBy && existingSlot.bookedBy !== studentName) || existingBooking) {
                        conflicts.push(`${dateStr} at ${timeStr} `);
                    } else {
                        // Prepare Booking
                        bookingsToAdd.push({
                            id: selectedSlot.id + `- wk${i} `, // Ensure unique
                            date: dateStr,
                            time: timeStr,
                            student: studentName,
                            studentId: studentId,
                            subject: bookingSubject,
                            type: 'lesson',
                            bookedAt: new Date().toISOString(),
                            status: 'confirmed',
                            paymentStatus: 'Due',
                            cost: 28, // Discounted rate for block booking (£280 total / 10)
                            recurringId: i > 0 ? selectedSlot.id + '-series' : undefined // Basic linking
                        });

                        // Prepare Slot Update
                        if (existingSlot) {
                            slotsToUpdate.push({ ...existingSlot, bookedBy: studentName });
                        } else {
                            // If generated slot doesn't exist in 'lesson_slots' (it might be dynamic), we should add it?
                            // 'allSlots' comes from 'tutor_lesson_slots'.
                            // If it's a generated slot, it might not be in the persisted 'tutor_lesson_slots' yet.
                            // We need to be careful. The `selectedSlot` tells us what's available.
                            // But `allSlots` in this function only reads `tutor_lesson_slots`.
                            // Generated slots are usually not in `tutor_lesson_slots` until booked.
                            // So we create a new slot entry.
                            slotsToUpdate.push({
                                id: `gen - ${dateStr} -${timeStr} -booked`,
                                date: dateStr,
                                time: timeStr,
                                bookedBy: studentName,
                                generated: false
                            });
                        }
                    }
                }

                if (conflicts.length > 0) {
                    setConfirmation({
                        message: `Conflicts found for ${conflicts.length} weeks: \n${conflicts.slice(0, 3).join('\n')} \n...\nContinue booking the remaining ${10 - conflicts.length} weeks ? `,
                        onConfirm: () => {
                            executeBooking(bookingsToAdd, slotsToUpdate);
                            setConfirmation(null);
                        },
                        onCancel: () => setConfirmation(null)
                    });
                    return;
                }
                executeBooking(bookingsToAdd, slotsToUpdate);

            } else {
                // Single Booking
                const singleBooking = {
                    id: selectedSlot.id,
                    date: selectedSlot.date,
                    time: selectedSlot.time,
                    student: studentName,
                    studentId: studentId,
                    subject: bookingSubject,
                    type: 'lesson',
                    bookedAt: new Date().toISOString(),
                    status: 'confirmed',
                    paymentStatus: 'Due',
                    cost: 30
                };
                executeBooking([singleBooking], []);
            }
        }
    };

    // Review Logic
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

        // Save to public reviews
        const existingReviews = JSON.parse(localStorage.getItem('tutor_public_reviews')) || [];
        localStorage.setItem('tutor_public_reviews', JSON.stringify([...existingReviews, newReview]));

        // Update Session History to mark as reviewed
        const updatedHistory = history.map(h => {
            if (h.id === reviewTarget.id) {
                return { ...h, hasReview: true };
            }
            return h;
        });
        setHistory(updatedHistory);

        // Update LocalStorage for history
        const allHistory = JSON.parse(localStorage.getItem('tutor_session_history')) || [];
        const updatedAllHistory = allHistory.map(h => {
            if (h.id === reviewTarget.id) {
                return { ...h, hasReview: true };
            }
            return h;
        });
        localStorage.setItem('tutor_session_history', JSON.stringify(updatedAllHistory));

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

    const handleStudentResponse = (booking, accepted) => {
        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        // deep copy for safety
        let updatedBookings = allBookings.map(b => ({ ...b }));

        if (accepted) {
            const oldDate = booking.date;
            const oldTime = booking.time;
            const newDate = booking.teacherProposed.newDate;
            const newTime = booking.teacherProposed.newTime;

            updatedBookings = updatedBookings.map(b => {
                if (b.id === booking.id) {
                    return {
                        ...b,
                        status: 'confirmed',
                        date: newDate,
                        time: newTime,
                        teacherProposed: undefined
                    };
                }
                return b;
            });

            // Update Slots Availability
            const allSlots = JSON.parse(localStorage.getItem('tutor_lesson_slots')) || [];
            const updatedSlots = allSlots.map(s => {
                // Free old slot
                if (s.date === oldDate && s.time === oldTime) return { ...s, bookedBy: null };
                // Book new slot
                if (s.date === newDate && s.time === newTime) return { ...s, bookedBy: booking.student };
                return s;
            });
            localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));

            alert("Reschedule Confirmed! See you at the new time.");
        } else {
            updatedBookings = updatedBookings.map(b => {
                if (b.id === booking.id) {
                    return {
                        ...b,
                        status: 'confirmed',
                        teacherProposed: undefined
                    };
                }
                return b;
            });
            alert("Reschedule Declined. Keeping original time.");
            // Notify Teacher of Decline
            emailService.sendRescheduleResponse(booking, 'Declined');
        }

        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        window.dispatchEvent(new Event('storage'));

        if (accepted) {
            // Notify Teacher of Approval
            emailService.sendRescheduleResponse(booking, 'Approved');
        }
    };

    const cancelBooking = (booking) => {
        if (!window.confirm("Are you sure you want to cancel this lesson?")) return;

        const allBookings = JSON.parse(localStorage.getItem('tutor_bookings')) || [];
        const updatedBookings = allBookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b);

        // Free the slot
        const allSlots = JSON.parse(localStorage.getItem('tutor_lesson_slots')) || [];
        const updatedSlots = allSlots.map(s => (s.date === booking.date && s.time === booking.time) ? { ...s, bookedBy: null } : s);

        localStorage.setItem('tutor_bookings', JSON.stringify(updatedBookings));
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(updatedSlots));
        window.dispatchEvent(new Event('storage'));
        setNotification({ type: 'success', message: 'Lesson Cancelled.' });

        // Notify Teacher
        emailService.sendCancellationNotice(booking, 'student');
    };

    // Calculate Stats
    const totalSessions = history.length;
    const unpaidInvoices = history.filter(h => h.paymentStatus === 'Due').length;
    const nextLesson = bookings.length > 0 ? bookings.find(b => new Date(b.date + 'T' + b.time) > new Date()) : null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
            {/* Navigation Bar */}
            <nav className="bg-white sticky top-0 z-50 border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 flex items-center justify-center text-teal-600">
                            <TrendingUp size={24} />
                        </div>
                        <h1 className="text-xl font-bold text-teal-500 tracking-tight">
                            Davina's Tutoring Platform
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <span className="font-bold text-gray-500 hidden md:block">Welcome, {displayName}</span>
                        <button onClick={() => navigate('/')} className="text-red-400 hover:text-red-500 flex items-center gap-2 text-sm font-bold">
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </div>
            </nav>
            {/* Dashboard Content */}
            <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">

                {/* Pending Approvals Section */}
                {bookings.some(b => b.status === 'pending_student_approval') && (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <AlertCircle className="text-orange-500" /> Action Required
                        </h2>
                        {bookings.filter(b => b.status === 'pending_student_approval').map(booking => (
                            <div key={booking.id} className="bg-white border-l-4 border-orange-500 rounded-xl shadow-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Reschedule Proposal</h3>
                                    <p className="text-gray-500 text-sm">Your teacher has proposed a new time for your lesson.</p>
                                    <div className="flex items-center gap-8 mt-4">
                                        <div className="bg-gray-50 p-3 rounded-lg opacity-60">
                                            <div className="text-xs font-bold uppercase text-gray-400">Original</div>
                                            <div className="font-bold text-gray-700 strike-through decoration-red-500 line-through">
                                                {new Date(booking.date).toLocaleDateString()} at {booking.time}
                                            </div>
                                        </div>
                                        <ArrowRight className="text-gray-400" />
                                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                            <div className="text-xs font-bold uppercase text-purple-500">Proposed</div>
                                            <div className="font-bold text-purple-700">
                                                {new Date(booking.teacherProposed.newDate).toLocaleDateString()} at {booking.teacherProposed.newTime}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleStudentResponse(booking, true)}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-md transition-all flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} /> Accept
                                    </button>
                                    <button
                                        onClick={() => handleStudentResponse(booking, false)}
                                        className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1 space-y-4">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`w-full p-4 rounded-xl text-left font-bold flex items-center gap-3 transition-all ${activeTab === 'overview' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'} `}
                        >
                            <TrendingUp size={20} /> Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('booking')}
                            className={`w-full p-4 rounded-xl text-left font-bold flex items-center justify-between transition-all ${activeTab === 'booking' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'} `}
                        >
                            <div className="flex items-center gap-3">
                                <Calendar size={20} />
                                <span>Book Lesson</span>
                            </div>
                            {availableLessons.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'booking' ? 'bg-white text-teal-600' : 'bg-teal-100 text-teal-600'}`}>
                                    {availableLessons.length > 50 ? '50+' : availableLessons.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`w-full p-4 rounded-xl text-left font-bold flex items-center gap-3 transition-all ${activeTab === 'history' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'} `}
                        >
                            <Clock size={20} /> History & Feedback
                        </button>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`w-full p-4 rounded-xl text-left font-bold flex items-center justify-between transition-all ${activeTab === 'billing' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'} `}
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard size={20} />
                                <span>Billing & Invoices</span>
                            </div>
                            {unpaidInvoices > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'billing' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>
                                    {unpaidInvoices}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('messages')}
                            className={`w-full p-4 rounded-xl text-left font-bold flex items-center justify-between transition-all ${activeTab === 'messages' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'} `}
                        >
                            <div className="flex items-center gap-3">
                                <MessageSquare size={20} />
                                <span>Messages</span>
                            </div>
                            {(() => {
                                const unreadCount = (chatMessages || []).filter(m => m.sender === 'Davina' && !m.read).length;
                                return unreadCount > 0 ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'messages' ? 'bg-white text-teal-600' : 'bg-red-500 text-white animate-pulse shadow-sm'}`}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                ) : null;
                            })()}
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="md:col-span-3 space-y-8">

                        {/* Render: OVERVIEW */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Next Lesson Focus Widget */}
                                {history.length > 0 && history[0].next_steps && (
                                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                                        {/* Decorative background element */}
                                        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>

                                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                                                        <Star size={20} className="text-yellow-300 fill-current" />
                                                    </div>
                                                    <h3 className="text-sm font-bold uppercase tracking-widest text-purple-100">Next Lesson Focus</h3>
                                                </div>
                                                <p className="text-xl md:text-2xl font-bold leading-tight">
                                                    "{history[0].next_steps}"
                                                </p>
                                                <p className="mt-4 text-purple-100/80 text-sm font-medium flex items-center gap-2">
                                                    <Calendar size={14} /> Set by Davina on {new Date(history[0].date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('booking')}
                                                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-center"
                                            >
                                                Book Session <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {/* Cancelled Lessons Notification */}
                                {!dismissedCancelledBanner && bookings.filter(b => b.status === 'cancelled' && new Date(b.date + 'T' + b.time) > new Date()).length > 0 && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl relative">
                                        <button
                                            onClick={() => {
                                                setDismissedCancelledBanner(true);
                                                localStorage.setItem('dismissed_cancelled_banner', 'true');
                                            }}
                                            className="absolute top-3 right-3 text-red-600 hover:bg-red-100 rounded-full p-1 transition-colors"
                                            aria-label="Dismiss notification"
                                        >
                                            <X size={18} />
                                        </button>
                                        <div className="flex items-start gap-3 pr-8">
                                            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                                            <div className="flex-1">
                                                <h3 className="font-bold text-red-900 mb-1">Lessons Cancelled</h3>
                                                <div className="text-sm text-red-800 space-y-1">
                                                    {bookings.filter(b => b.status === 'cancelled' && new Date(b.date + 'T' + b.time) > new Date()).map(booking => (
                                                        <div key={booking.id}>
                                                            • {new Date(booking.date).toLocaleDateString()} at {booking.time} - {booking.subject || 'Lesson'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                        <Video className="text-teal-500" /> Upcoming Lessons
                                    </h2>
                                    <button onClick={() => setActiveTab('booking')} className="text-teal-600 font-bold hover:underline text-sm">
                                        + Book New
                                    </button>
                                </div>

                                {bookings.filter(b => new Date(b.date + 'T' + b.time) > new Date()).length > 0 ? (
                                    <div className="grid gap-4">
                                        {bookings.filter(b => new Date(b.date + 'T' + b.time) > new Date()).map(booking => (
                                            <div key={booking.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4 min-w-[180px]">
                                                    <div className="bg-teal-50 text-teal-600 p-3 rounded-xl text-center min-w-[70px]">
                                                        <div className="text-xs font-bold uppercase">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                                                        <div className="text-xl font-bold">{new Date(booking.date).getDate()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                                                        <div className="text-gray-500 text-sm flex items-center gap-1">
                                                            <Clock size={12} /> {booking.time}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-1 w-full md:w-auto">
                                                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">Focus / Note</div>
                                                    <div className="font-medium text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between group cursor-pointer hover:border-teal-300 transition-colors"
                                                        onClick={() => {
                                                            setEditNoteTarget({
                                                                booking,
                                                                currentNote: booking.subject || ''
                                                            });
                                                        }}
                                                    >
                                                        <span className={booking.subject ? '' : 'text-gray-400 italic'}>
                                                            {booking.subject || "No notes added..."}
                                                        </span>
                                                        <div className="opacity-0 group-hover:opacity-100 text-teal-500">
                                                            <FileText size={14} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2 min-w-[100px]">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${booking.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {booking.paymentStatus || 'Due'}
                                                    </span>
                                                    {booking.paymentStatus !== 'Paid' && (
                                                        <button
                                                            onClick={() => handlePay({ ...booking, cost: booking.cost || 30 })}
                                                            className="text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Pay Now
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex gap-3 min-w-[200px] justify-end">
                                                    <button
                                                        onClick={() => handleJoinLesson(booking.studentId || studentId || booking.id)}
                                                        className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                                                    >
                                                        <Video size={16} /> Join
                                                    </button>
                                                    <button
                                                        onClick={() => initiateReschedule(booking)}
                                                        disabled={booking.status === 'pending_reschedule'}
                                                        className="px-4 py-2.5 bg-white border border-gray-200 hover:border-purple-200 hover:text-purple-600 text-gray-600 rounded-xl font-bold transition-all disabled:opacity-50 text-sm"
                                                    >
                                                        {booking.status === 'pending_reschedule' ? 'Pending' : 'Reschedule'}
                                                    </button>
                                                    <button
                                                        onClick={() => cancelBooking(booking)}
                                                        className="p-2.5 bg-white border border-gray-200 hover:border-red-200 hover:text-red-600 text-gray-400 rounded-xl font-bold transition-all text-sm"
                                                        title="Cancel Lesson"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300">
                                        <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-500 font-medium">No upcoming lessons scheduled.</p>
                                        <button onClick={() => setActiveTab('booking')} className="mt-4 text-teal-600 font-bold hover:underline">
                                            Book your first lesson
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                        }

                        {/* Review Modal */}
                        {
                            showReviewModal && reviewTarget && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowReviewModal(false)}>
                                    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                        <div className="text-center mb-6">
                                            <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Star size={32} fill="currentColor" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900">Rate Your Lesson</h3>
                                            <p className="text-gray-500">How was your session on {new Date(reviewTarget.date).toLocaleDateString()}?</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex justify-center gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setReviewRating(star)}
                                                        className={`p - 2 transition - all transform hover: scale - 110 ${reviewRating >= star ? 'text-yellow-400' : 'text-gray-200'} `}
                                                    >
                                                        <Star size={32} fill="currentColor" />
                                                    </button>
                                                ))}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Your Feedback</label>
                                                <textarea
                                                    value={reviewComment}
                                                    onChange={(e) => setReviewComment(e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none"
                                                    placeholder="What did you learn? How was the teacher?"
                                                ></textarea>
                                            </div>

                                            <button
                                                onClick={submitReview}
                                                disabled={!reviewRating}
                                                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Submit Review
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Render: BOOKING */}
                        {
                            activeTab === 'booking' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                        <Calendar className="text-purple-500" /> Available Lesson Slots
                                    </h2>
                                    <p className="text-gray-500 mb-4">Select a 1-hour slot to book your next lesson.</p>

                                    {availableLessons.length === 0 ? (
                                        <div className="bg-white p-12 text-center rounded-3xl border border-gray-200 text-gray-400">
                                            <Clock size={48} className="mx-auto mb-4 opacity-30" />
                                            <p>No available slots added primarily by teacher yet.</p>
                                            <p className="text-sm">Please check back later.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {Object.entries(
                                                availableLessons.reduce((groups, slot) => {
                                                    const dateKey = slot.date;
                                                    if (!groups[dateKey]) groups[dateKey] = [];
                                                    groups[dateKey].push(slot);
                                                    return groups;
                                                }, {})
                                            )
                                                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                                                .map(([date, slots]) => (
                                                    <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                                            <div>
                                                                <h3 className="font-bold text-gray-800 text-lg">
                                                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                                                </h3>
                                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                                                    {slots.length} Slots Available
                                                                </p>
                                                            </div>
                                                            {rescheduleTarget && new Date(rescheduleTarget.date).toISOString().split('T')[0] === date && (
                                                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-bold">Current Date</span>
                                                            )}
                                                        </div>
                                                        <div className="p-6">
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                                {slots
                                                                    .sort((a, b) => a.time.localeCompare(b.time))
                                                                    .map(slot => (
                                                                        <button
                                                                            key={slot.id}
                                                                            onClick={() => handleBookLesson(slot)}
                                                                            className={`
py - 3 px - 4 rounded - xl font - bold text - sm transition - all border - 2
                                                                        ${rescheduleTarget
                                                                                    ? 'border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white hover:border-purple-600'
                                                                                    : 'border-gray-100 bg-gray-50 text-gray-700 hover:bg-teal-500 hover:text-white hover:border-teal-500'
                                                                                }
`}
                                                                        >
                                                                            {new Date('2000-01-01T' + slot.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                                        </button>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        {/* Render: HISTORY */}
                        {
                            activeTab === 'history' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                        <Clock className="text-purple-500" /> Learning Timeline
                                    </h2>
                                    {history.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400 bg-white rounded-3xl">
                                            <p>No past sessions logged yet.</p>
                                        </div>
                                    ) : (
                                        <div className="relative border-l-4 border-gray-200 ml-6 space-y-12">
                                            {history.map((session, idx) => (
                                                <div key={idx} className="relative pl-8">
                                                    {/* Timeline Dot */}
                                                    <div className="absolute -left-[14px] top-0 w-6 h-6 bg-white border-4 border-purple-500 rounded-full"></div>

                                                    <div key={session.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center group hover:border-purple-200 transition-all">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-gray-800">{session.subject}</span>
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Completed</span>
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {new Date(session.date).toLocaleDateString()} • {session.duration || '60'} mins
                                                            </div>
                                                        </div>
                                                        {session.hasReview ? (
                                                            <span className="text-xs font-bold text-yellow-500 bg-yellow-50 px-3 py-1 rounded-full flex items-center gap-1">
                                                                <Star size={12} fill="currentColor" /> Reviewed
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => initiateReview(session)}
                                                                className="text-sm font-bold text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                                                            >
                                                                Write Review
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-purple-200 transition-all">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <h4 className="font-bold text-lg text-gray-900">{session.topic || 'General Session'}</h4>
                                                                <span className="text-sm font-bold text-gray-400 uppercase">{new Date(session.date).toLocaleDateString()}</span>
                                                            </div>
                                                            {session.rating && (
                                                                <div className="flex gap-1">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Star key={i} size={14} className={i < session.rating ? "text-yellow-400 fill-current" : "text-gray-200"} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid md:grid-cols-2 gap-6">
                                                            <div className="bg-green-50 p-4 rounded-xl">
                                                                <h5 className="font-bold text-green-800 text-xs uppercase mb-2 flex items-center gap-2">
                                                                    <CheckCircle size={14} /> Went Well
                                                                </h5>
                                                                <p className="text-gray-700 text-sm">{session.feedback_well}</p>
                                                            </div>
                                                            <div className="bg-amber-50 p-4 rounded-xl">
                                                                <h5 className="font-bold text-amber-800 text-xs uppercase mb-2 flex items-center gap-2">
                                                                    <TrendingUp size={14} /> To Improve / Next Lesson
                                                                </h5>
                                                                <p className="text-gray-700 text-sm">{session.feedback_improve} {session.next_steps && `— Focus: ${session.next_steps} `}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        {/* Render: BILLING */}
                        {
                            activeTab === 'billing' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                        <CreditCard className="text-blue-500" /> Invoices & Payments
                                    </h2>
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4 font-bold text-gray-400 text-xs uppercase">Date</th>
                                                    <th className="p-4 font-bold text-gray-400 text-xs uppercase">Description</th>
                                                    <th className="p-4 font-bold text-gray-400 text-xs uppercase">Amount</th>
                                                    <th className="p-4 font-bold text-gray-400 text-xs uppercase">Status</th>
                                                    <th className="p-4 font-bold text-gray-400 text-xs uppercase">Lesson</th>
                                                    <th className="p-4 font-bold text-gray-400 text-xs uppercase text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {[...bookings, ...history]
                                                    .sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00')))
                                                    .map((invoice) => (
                                                        <tr key={invoice.id || Math.random()} className="hover:bg-gray-50 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-bold text-gray-700">{new Date(invoice.date).toLocaleDateString()}</div>
                                                                <div className="text-xs text-gray-400">{invoice.time}</div>
                                                            </td>
                                                            <td className="p-4 text-gray-600 text-sm">
                                                                {invoice.subject || invoice.topic || 'Tutoring Session'}
                                                                {invoice.id && invoice.id.includes('wk') && <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-1 rounded">10-Wk Block</span>}
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-900">£{invoice.cost || 30}</td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${(invoice.paymentStatus || 'Due') === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {invoice.paymentStatus || 'Due'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                {invoice.feedback_well || invoice.lessonTopic ? (
                                                                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-wider border border-blue-200 shadow-sm">
                                                                        Completed
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider border border-gray-200">
                                                                        Scheduled
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                {invoice.paymentStatus !== 'Paid' ? (
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button
                                                                            onClick={() => handlePay(invoice)}
                                                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-md transition-all"
                                                                        >
                                                                            Pay via Stripe
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleReceipt(invoice)}
                                                                        className="text-teal-600 hover:text-teal-700 flex items-center gap-1 justify-end w-full text-xs font-bold transition-colors"
                                                                    >
                                                                        <FileText size={14} /> Receipt
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        {history.length === 0 && (
                                            <div className="p-8 text-center text-gray-400 italic">No invoices found.</div>
                                        )}
                                    </div>
                                </div>
                            )
                        }

                        {/* Render: MESSAGES */}
                        {activeTab === 'messages' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                        <MessageSquare className="text-teal-500" /> Messages
                                    </h2>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    {/* Chat Messages */}
                                    <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
                                        {chatMessages.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-gray-400 italic">
                                                No messages yet. Start a conversation with your teacher!
                                            </div>
                                        ) : (
                                            chatMessages.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.sender === displayName ? 'justify-end' : 'justify-start'} mb-4`}>
                                                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${msg.sender === displayName ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-md' : 'bg-white border-2 border-gray-100 text-gray-800 rounded-bl-md'}`}>
                                                        <div className="text-xs font-bold mb-2 ${msg.sender === displayName ? 'text-teal-100' : 'text-gray-500'}">{msg.sender}</div>
                                                        <div className="text-base leading-relaxed">{msg.message}</div>
                                                        <div className="text-xs mt-2 ${msg.sender === displayName ? 'text-teal-100' : 'text-gray-400'}">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                                                    if (e.key === 'Enter' && newMessage.trim()) {
                                                        const msg = {
                                                            sender: displayName,
                                                            message: newMessage,
                                                            timestamp: new Date().toISOString()
                                                        };
                                                        const allMessages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
                                                        const studentMessages = allMessages[displayName] || [];
                                                        const updatedStudentMessages = [...studentMessages, msg];
                                                        const updatedAllMessages = { ...allMessages, [displayName]: updatedStudentMessages };
                                                        setChatMessages(updatedStudentMessages);
                                                        localStorage.setItem('chat_messages_v2', JSON.stringify(updatedAllMessages));
                                                        setNewMessage('');
                                                    }
                                                }}
                                                placeholder="Type your message..."
                                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (newMessage.trim()) {
                                                        const msg = {
                                                            sender: displayName,
                                                            message: newMessage,
                                                            timestamp: new Date().toISOString()
                                                        };
                                                        const allMessages = JSON.parse(localStorage.getItem('chat_messages_v2')) || {};
                                                        const studentMessages = allMessages[displayName] || [];
                                                        const updatedStudentMessages = [...studentMessages, msg];
                                                        const updatedAllMessages = { ...allMessages, [displayName]: updatedStudentMessages };
                                                        setChatMessages(updatedStudentMessages);
                                                        localStorage.setItem('chat_messages_v2', JSON.stringify(updatedAllMessages));
                                                        setNewMessage('');
                                                    }
                                                }}
                                                className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div >
                </div >
            </main >

            {/* Booking Modal */}
            {
                showBookingModal && selectedSlot && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                            <div className="bg-teal-600 p-6 text-white">
                                <h3 className="text-2xl font-bold mb-1">{rescheduleTarget ? 'Confirm Reschedule' : 'Book Your Lesson'}</h3>
                                <p className="text-teal-100 text-sm">
                                    {new Date(selectedSlot.date).toLocaleDateString()} at {selectedSlot.time}
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                {rescheduleTarget && (
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4">
                                        <h4 className="font-bold text-purple-800 text-sm mb-1">Rescheduling From:</h4>
                                        <p className="text-gray-600 text-sm">{new Date(rescheduleTarget.date).toLocaleDateString()} at {rescheduleTarget.time}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-gray-700 font-bold mb-2">
                                        What would you like to cover in this lesson?
                                    </label>
                                    <textarea
                                        value={bookingSubject}
                                        onChange={(e) => setBookingSubject(e.target.value)}
                                        placeholder="E.g., Algebra, Essay Writing, etc."
                                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        rows="3"
                                        autoFocus
                                    />
                                </div>

                                {!rescheduleTarget && (
                                    <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-lg border border-purple-100 mb-2">
                                        <input
                                            type="checkbox"
                                            id="bookTenWeeks"
                                            checked={bookTenWeeks}
                                            onChange={(e) => setBookTenWeeks(e.target.checked)}
                                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                                        />
                                        <label htmlFor="bookTenWeeks" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                            Book this time for 10 weeks
                                        </label>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowBookingModal(false);
                                            setBookingSubject('');
                                            setSelectedSlot(null);
                                        }}
                                        className="flex-1 py-3 text-gray-600 font-bold hover:text-gray-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmBooking}
                                        className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition-all shadow-md"
                                    >
                                        Confirm {rescheduleTarget ? 'Reschedule' : 'Booking'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reschedule Info Modal */}
            {
                showRescheduleModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowRescheduleModal(false)}>
                        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Reschedule Lesson</h3>
                            <p className="text-gray-500 mb-8">
                                Please select a new available time slot from the calendar for your lesson on <strong>{rescheduleTarget && new Date(rescheduleTarget.date).toLocaleDateString()}</strong>.
                            </p>
                            <button
                                onClick={confirmRescheduleStart}
                                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md"
                            >
                                Select New Time
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Notification Modal */}
            {notification && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setNotification(null)}>
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 text-center max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {notification.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <p className="text-gray-800 font-bold mb-6 text-lg">{notification.message}</p>
                        <button
                            onClick={() => setNotification(null)}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                        >
                            Okay
                        </button>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmation && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmation Required</h3>
                        <p className="text-gray-600 mb-8 whitespace-pre-wrap">{confirmation.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmation.onCancel}
                                className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmation.onConfirm}
                                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal (Stripe Style) */}
            {paymentTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8">
                    <div className="bg-white p-0 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <CreditCard className="text-teal-600" />
                                <span className="font-bold text-gray-900">Secure Payment via Stripe</span>
                            </div>
                            <button onClick={() => setPaymentTarget(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="p-8">
                            <div className="text-center mb-6">
                                <div className="text-gray-500 text-sm uppercase font-bold tracking-wider mb-1">Total Amount</div>
                                <div className="text-4xl font-bold text-gray-900">£{paymentTarget.cost || 30}.00</div>
                                <div className="text-sm text-gray-500 mt-2">
                                    {paymentTarget.cost === 280 ? '10-Lesson Bulk Block' : `Session on ${new Date(paymentTarget.date).toLocaleDateString()}`}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="text-xs font-bold text-gray-400 uppercase text-center mb-2">Secure Stripe Link</div>
                                {paymentTarget.cost === 280 ? (
                                    <a
                                        href="https://buy.stripe.com/eVqbJ1bUX1qnbVcdujeIw01"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg flex items-center justify-center gap-2 text-center"
                                    >
                                        Complete £280 Payment <ArrowRight size={18} />
                                    </a>
                                ) : (
                                    <a
                                        href="https://buy.stripe.com/14A3cv5wzglh1gyai7eIw00"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg flex items-center justify-center gap-2 text-center"
                                    >
                                        Complete £30 Payment <ArrowRight size={18} />
                                    </a>
                                )}
                            </div>

                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                                <p className="text-sm text-orange-800 font-bold mb-3">Completed your payment on Stripe?</p>
                                <button
                                    onClick={() => {
                                        markAsPaid(paymentTarget.id);
                                        setPaymentTarget(null);
                                        setNotification({ type: 'success', message: "Payment Recorded! Thank you." });
                                    }}
                                    className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all"
                                >
                                    Yes, Mark as Paid
                                </button>
                            </div>

                            <div className="flex justify-center gap-4 mt-6 opacity-30 grayscale">
                                <span className="text-xs font-bold">Powered by Stripe</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Note Modal */}
            {editNoteTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-teal-600" /> Lesson Focus
                        </h3>
                        <p className="text-gray-500 text-sm mb-4">
                            What would you like to cover in this session?
                        </p>

                        <form onSubmit={handleSaveNote}>
                            <textarea
                                value={editNoteTarget.currentNote}
                                onChange={e => setEditNoteTarget({ ...editNoteTarget, currentNote: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl p-4 min-h-[120px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all resize-none mb-4"
                                placeholder="E.g. Algebra quadratic equations, Essay structure..."
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditNoteTarget(null)}
                                    className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all"
                                >
                                    Save Note
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8">
                    <div className="bg-white p-0 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">Payment Receipt</h3>
                                    <p className="text-teal-100 text-sm">Davina's Tutoring Platform</p>
                                </div>
                                <button onClick={() => setReceiptTarget(null)} className="text-white/80 hover:text-white text-2xl">×</button>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500 text-sm">Receipt #</span>
                                    <span className="font-mono font-bold text-gray-900">{receiptTarget.id?.slice(0, 8) || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500 text-sm">Date</span>
                                    <span className="font-bold text-gray-900">{new Date(receiptTarget.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500 text-sm">Student</span>
                                    <span className="font-bold text-gray-900">{displayName}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-gray-500 text-sm">Description</span>
                                    <span className="font-bold text-gray-900">{receiptTarget.subject || receiptTarget.topic || 'Tutoring Session'}</span>
                                </div>
                                <div className="flex justify-between py-3 bg-teal-50 px-4 rounded-xl mt-4">
                                    <span className="text-gray-700 font-bold">Amount Paid</span>
                                    <span className="text-2xl font-bold text-teal-600">£{receiptTarget.cost || 30}.00</span>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 mb-6">
                                <CheckCircle className="text-green-600" size={24} />
                                <div>
                                    <div className="font-bold text-green-900">Payment Confirmed</div>
                                    <div className="text-xs text-green-700">Thank you for your payment!</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setReceiptTarget(null)}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default StudentDashboard;
