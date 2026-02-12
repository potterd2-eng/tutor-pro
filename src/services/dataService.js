import {
    authService,
    studentService,
    bookingService,
    chatService,
    sessionService,
    availabilityService
} from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
    return SUPABASE_URL && SUPABASE_ANON_KEY &&
        SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
};

// ============================================
// HYBRID DATA SERVICE
// Uses Supabase if configured, localStorage as fallback
// ============================================

export const dataService = {
    // Check if using backend
    isUsingBackend: isSupabaseConfigured(), // ENABLED FOR GO-LIVE

    // ============================================
    // STUDENTS
    // ============================================
    async getStudents() {
        if (this.isUsingBackend) {
            return await studentService.getAll();
        }
        const data = localStorage.getItem('tutor_students');
        return data ? JSON.parse(data) : [];
    },

    async createStudent(student) {
        if (this.isUsingBackend) {
            return await studentService.create(student);
        }
        const students = await this.getStudents();
        const newStudent = { ...student, id: student.id || Date.now().toString() };
        students.push(newStudent);
        localStorage.setItem('tutor_students', JSON.stringify(students));
        return newStudent;
    },

    async updateStudent(id, updates) {
        if (this.isUsingBackend) {
            return await studentService.update(id, updates);
        }
        const students = await this.getStudents();
        const index = students.findIndex(s => s.id === id);
        if (index !== -1) {
            students[index] = { ...students[index], ...updates };
            localStorage.setItem('tutor_students', JSON.stringify(students));
            return students[index];
        }
        return null;
    },

    async deleteStudent(id) {
        if (this.isUsingBackend) {
            return await studentService.delete(id);
        }
        const students = await this.getStudents();
        const filtered = students.filter(s => s.id !== id);
        localStorage.setItem('tutor_students', JSON.stringify(filtered));
    },

    // ============================================
    // BOOKINGS
    // ============================================
    async getBookings() {
        if (this.isUsingBackend) {
            return await bookingService.getAll();
        }
        const data = localStorage.getItem('tutor_bookings');
        return data ? JSON.parse(data) : [];
    },

    async getBookingsByStudent(studentId) {
        if (this.isUsingBackend) {
            return await bookingService.getByStudent(studentId);
        }
        const bookings = await this.getBookings();
        return bookings.filter(b => b.studentId === studentId);
    },

    async createBooking(booking) {
        if (this.isUsingBackend) {
            return await bookingService.create(booking);
        }
        const bookings = await this.getBookings();
        const newBooking = { ...booking, id: booking.id || Date.now().toString() };
        bookings.push(newBooking);
        localStorage.setItem('tutor_bookings', JSON.stringify(bookings));
        window.dispatchEvent(new Event('storage'));
        return newBooking;
    },

    async updateBooking(id, updates) {
        if (this.isUsingBackend) {
            return await bookingService.update(id, updates);
        }
        const bookings = await this.getBookings();
        const index = bookings.findIndex(b => b.id === id);
        if (index !== -1) {
            bookings[index] = { ...bookings[index], ...updates };
            localStorage.setItem('tutor_bookings', JSON.stringify(bookings));
            window.dispatchEvent(new Event('storage'));
            return bookings[index];
        }
        return null;
    },

    async cancelBooking(id) {
        return await this.updateBooking(id, { status: 'cancelled' });
    },

    async deleteBooking(id) {
        if (this.isUsingBackend) {
            return await bookingService.delete(id);
        }
        const bookings = await this.getBookings();
        const filtered = bookings.filter(b => b.id !== id);
        localStorage.setItem('tutor_bookings', JSON.stringify(filtered));
        window.dispatchEvent(new Event('storage'));
    },

    async checkAvailability(date, time) {
        if (this.isUsingBackend) {
            return await bookingService.checkAvailability(date, time);
        }
        const bookings = await this.getBookings();
        return !bookings.some(b =>
            b.date === date &&
            b.time === time &&
            b.status === 'confirmed'
        );
    },

    // ============================================
    // CHAT MESSAGES
    // ============================================
    async getChatMessages(studentId = null) {
        if (this.isUsingBackend && studentId) {
            return await chatService.getByStudent(studentId);
        }
        const data = localStorage.getItem('chat_messages_v2');
        if (!data) return studentId ? [] : {};
        const messages = JSON.parse(data);
        return studentId ? (messages[studentId] || []) : messages;
    },

    async sendChatMessage(studentId, sender, message) {
        if (this.isUsingBackend) {
            return await chatService.send({
                student_id: studentId,
                sender,
                message,
                timestamp: new Date().toISOString()
            });
        }
        const allMessages = await this.getChatMessages();
        const msg = {
            sender,
            message,
            timestamp: new Date().toISOString()
        };
        const updated = {
            ...allMessages,
            [studentId]: [...(allMessages[studentId] || []), msg]
        };
        localStorage.setItem('chat_messages_v2', JSON.stringify(updated));
        return msg;
    },

    subscribeToChatMessages(studentId, callback) {
        if (this.isUsingBackend) {
            return chatService.subscribeToStudent(studentId, callback);
        }
        // For localStorage, use storage event listener
        const handler = () => {
            this.getChatMessages(studentId).then(callback);
        };
        window.addEventListener('storage', handler);
        return { unsubscribe: () => window.removeEventListener('storage', handler) };
    },

    // ============================================
    // SESSION HISTORY
    // ============================================
    async getSessionHistory() {
        if (this.isUsingBackend) {
            return await sessionService.getAll();
        }
        const data = localStorage.getItem('tutor_session_history');
        return data ? JSON.parse(data) : [];
    },

    async createSession(session) {
        if (this.isUsingBackend) {
            return await sessionService.create(session);
        }
        const sessions = await this.getSessionHistory();
        const newSession = { ...session, id: session.id || Date.now().toString() };
        sessions.push(newSession);
        localStorage.setItem('tutor_session_history', JSON.stringify(sessions));
        return newSession;
    },

    // ============================================
    // AVAILABILITY
    // ============================================
    async getAvailability() {
        if (this.isUsingBackend) {
            const slots = await availabilityService.getAll();
            return {
                slots: slots || [],
                lessonSlots: [],
                allLessonSlots: [],
                consultationSlots: await this.getConsultationSlots()
            };
        }
        const slots = localStorage.getItem('tutor_slots');
        const lessonSlots = localStorage.getItem('tutor_lesson_slots');
        let allLessonSlots = localStorage.getItem('tutor_all_lesson_slots');
        let weeklySchedule = localStorage.getItem('tutor_weekly_schedule');
        const defaultSchedule = [
            { day: 'Monday', intervals: [{ start: '09:00', end: '15:00' }, { start: '18:45', end: '20:00' }], active: true },
            { day: 'Tuesday', intervals: [{ start: '18:00', end: '20:00' }], active: true },
            { day: 'Wednesday', intervals: [{ start: '13:00', end: '16:00' }], active: true },
            { day: 'Thursday', intervals: [{ start: '09:00', end: '16:00' }, { start: '19:00', end: '20:00' }], active: true },
            { day: 'Friday', intervals: [{ start: '09:00', end: '12:00' }, { start: '18:00', end: '20:00' }], active: true },
            { day: 'Saturday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
            { day: 'Sunday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
        ];

        // Use Default Schedule if missing OR EMPTY (e.g. "[]")
        if (!weeklySchedule || weeklySchedule === '[]' || weeklySchedule === '{}') {
            weeklySchedule = JSON.stringify(defaultSchedule);
        } else {
            // Check if it's valid but seemingly empty of active days
            try {
                const parsed = JSON.parse(weeklySchedule);
                if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.some(d => d.active)) {
                    weeklySchedule = JSON.stringify(defaultSchedule);
                }
            } catch (e) {
                weeklySchedule = JSON.stringify(defaultSchedule);
            }
        }

        // IF allLessonSlots is missing or empty, try to generate it from the schedule
        if (!allLessonSlots || JSON.parse(allLessonSlots).length === 0) {
            try {
                const schedule = JSON.parse(weeklySchedule);
                const manualSlots = lessonSlots ? JSON.parse(lessonSlots) : [];

                // --- GENERATION LOGIC START ---
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const generatedSlots = [];
                const today = new Date();
                const daysToGenerate = 60; // Increased to 60 days to match dashboard

                for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
                    const targetDate = new Date(today);
                    targetDate.setDate(today.getDate() + dayOffset);
                    const dayName = daysOfWeek[targetDate.getDay()];

                    const daySchedule = schedule.find(d => d.day === dayName);
                    if (!daySchedule || !daySchedule.active) continue;

                    daySchedule.intervals.forEach(interval => {
                        // Handle incomplete intervals gracefully
                        if (!interval.start || !interval.end) return;

                        const [startHour, startMin] = interval.start.split(':').map(Number);
                        const [endHour, endMin] = interval.end.split(':').map(Number);

                        for (let hour = startHour; hour < endHour; hour++) {
                            if (hour === endHour && endMin < 60) break;
                            const slotTime = `${String(hour).padStart(2, '0')}:${String(startMin || 0).padStart(2, '0')}`;
                            const dateStr = targetDate.toISOString().split('T')[0];

                            // Dedupe against manual slots
                            if (!manualSlots.some(s => s.date === dateStr && s.time === slotTime)) {
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
                // --- GENERATION LOGIC END ---

                const mergedSlots = [...manualSlots, ...generatedSlots];
                allLessonSlots = JSON.stringify(mergedSlots);

                // Optionally save back to localStorage to persist cache
                localStorage.setItem('tutor_all_lesson_slots', allLessonSlots);
            } catch (err) {
                console.error("Error generating slots in dataService:", err);
            }
        }

        return {
            slots: slots ? JSON.parse(slots) : [],
            lessonSlots: lessonSlots ? JSON.parse(lessonSlots) : [],
            allLessonSlots: allLessonSlots ? JSON.parse(allLessonSlots) : [],
            consultationSlots: await this.getConsultationSlots()
        };
    },

    async getConsultationSlots() {
        // We still generate consultation slots logic-side for now, 
        // even if using a backend for bookings, to ensure availability stays dynamic.

        // 1. Get or Initialize Schedule (Auto-Repair)
        let weeklySchedule = localStorage.getItem('tutor_weekly_schedule');
        const defaultSchedule = [
            { day: 'Monday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Tuesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Wednesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Thursday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Friday', intervals: [{ start: '09:00', end: '15:00' }], active: true },
            { day: 'Saturday', intervals: [], active: false },
            { day: 'Sunday', intervals: [], active: false },
        ];

        let schedule = [];
        let needsSave = false;

        try {
            if (!weeklySchedule || weeklySchedule === '[]' || weeklySchedule === '{}') {
                throw new Error("Empty schedule");
            }
            schedule = JSON.parse(weeklySchedule);
            if (!Array.isArray(schedule) || schedule.length === 0) {
                throw new Error("Invalid schedule format");
            }
        } catch (e) {
            console.warn("getConsultationSlots: Schedule missing/invalid. Auto-repairing with default.");
            schedule = defaultSchedule;
            needsSave = true;
        }

        // Force save if we repaired it, so Teacher Dashboard sees it too
        if (needsSave) {
            localStorage.setItem('tutor_weekly_schedule', JSON.stringify(schedule));
            // Dispatch event so other tabs/components update
            window.dispatchEvent(new Event('storage'));
        }

        // 2. Generate Slots (Strict 15-min intervals)
        const bookings = await this.getBookings();
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const generatedSlots = [];
        const today = new Date();
        const daysToGenerate = 60; // 2 months

        for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + dayOffset);
            const dayName = daysOfWeek[targetDate.getDay()];
            const dateStr = targetDate.toISOString().split('T')[0];

            const daySchedule = schedule.find(d => d.day === dayName);
            if (!daySchedule || !daySchedule.active) continue;

            daySchedule.intervals.forEach(interval => {
                if (!interval.start || !interval.end) return;

                const [startHour, startMin] = interval.start.split(':').map(Number);
                const [endHour, endMin] = interval.end.split(':').map(Number);

                let currentMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;

                while (currentMinutes < endMinutes) {
                    const h = Math.floor(currentMinutes / 60);
                    const m = currentMinutes % 60;
                    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

                    // 3. Smart Blocking
                    // Overlap check: Is this 15-min slot inside ANY confirmed booking?
                    const isBlocked = bookings.some(b => {
                        if (b.date !== dateStr || b.status === 'cancelled') return false;

                        // Calculate booking range
                        const [bHour, bMin] = b.time.split(':').map(Number);
                        const bStartMins = bHour * 60 + bMin;
                        // Default lesson length 60 mins, unless specified otherwise (TODO: store duration)
                        const duration = 60;
                        const bEndMins = bStartMins + duration;

                        // If current 15-min slot falls within the booking window
                        // e.g. Slot 14:15. Booking 14:00-15:00. 
                        // Slot (14:15) >= BookingStart (14:00) AND Slot (14:15) < BookingEnd (15:00) -> BLOCKED
                        return currentMinutes >= bStartMins && currentMinutes < bEndMins;
                    });

                    if (!isBlocked) {
                        generatedSlots.push({
                            id: `consult-${dateStr}-${timeStr}`,
                            date: dateStr,
                            time: timeStr,
                            type: 'consultation',
                            generated: true
                        });
                    }

                    currentMinutes += 15;
                }
            });
        }

        return generatedSlots;
    },

    async saveAvailability(slots, lessonSlots) {
        if (this.isUsingBackend) {
            // Save each slot individually
            const promises = slots.map(slot => availabilityService.create(slot));
            return await Promise.all(promises);
        }
        localStorage.setItem('tutor_slots', JSON.stringify(slots));
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(lessonSlots));
    }
};

export default dataService;
