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
    isUsingBackend: isSupabaseConfigured(), // ENABLED FOR GO-LIVE works

    // ============================================
    // STUDENTS
    // ============================================
    async getStudents() {
        const fromLocal = () => {
            try {
                const raw = localStorage.getItem('tutor_students');
                const list = raw ? JSON.parse(raw) : [];
                return Array.isArray(list) ? list : [];
            } catch (_) {
                return [];
            }
        };
        const fromSession = () => {
            try {
                const raw = sessionStorage.getItem('tutor_students_fallback');
                const list = raw ? JSON.parse(raw) : [];
                return Array.isArray(list) ? list : [];
            } catch (_) {
                return [];
            }
        };
        if (this.isUsingBackend) {
            try {
                const data = await studentService.getAll();
                const local = fromLocal();
                const session = fromSession();
                const merged = [...(data || [])];
                for (const s of [...local, ...session]) {
                    if (!s || !s.id) continue;
                    const i = merged.findIndex(m => m.id === s.id);
                    if (i >= 0) merged[i] = { ...merged[i], ...s };
                    else merged.push(s);
                }
                return merged;
            } catch (e) {
                const local = fromLocal();
                const session = fromSession();
                const seen = new Set();
                return [...local, ...session].filter(s => s?.id && !seen.has(s.id) && seen.add(s.id));
            }
        }
        const local = fromLocal();
        const session = fromSession();
        const seen = new Set();
        return [...local, ...session].filter(s => s?.id && !seen.has(s.id) && seen.add(s.id));
    },

    async createStudent(student) {
        const ensureEmail = (s) => {
            if (!s || typeof s !== 'object') return s;
            const out = { ...s };
            if (!out.email) out.email = `${String(out.name || 'student').replace(/\s+/g, '').toLowerCase()}_${Date.now()}@example.com`;
            return out;
        };
        const saveToLocal = (s) => {
            const safe = ensureEmail({ name: s?.name || '', email: s?.email || '' });
            const withId = { ...safe, id: safe.id && typeof safe.id === 'string' ? safe.id : Date.now().toString() };
            try {
                const raw = localStorage.getItem('tutor_students');
                const localStudents = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(localStudents)) throw new Error('Invalid local data');
                const updated = [...localStudents, withId];
                localStorage.setItem('tutor_students', JSON.stringify(updated));
                return withId;
            } catch (e) {
                try {
                    sessionStorage.setItem('tutor_students_fallback', JSON.stringify([withId]));
                    console.warn('dataService: localStorage failed, saved to sessionStorage', e?.message);
                    return withId;
                } catch (e2) {
                    console.error('dataService: Could not persist student', e2);
                    throw new Error('Browser storage is full or disabled. Try another browser or clear site data.');
                }
            }
        };
        try {
            if (this.isUsingBackend) {
                try {
                    const toSend = ensureEmail({ ...student });
                    const res = await studentService.create(toSend);
                    if (res && res.id) {
                        try {
                            const raw = localStorage.getItem('tutor_students');
                            const local = raw ? JSON.parse(raw) : [];
                            if (Array.isArray(local)) {
                                localStorage.setItem('tutor_students', JSON.stringify([...local, res]));
                            }
                        } catch (_) {}
                        return res;
                    }
                } catch (err) {
                    console.warn("dataService: Backend create failed, saving locally:", err?.message || err);
                }
                return saveToLocal(student);
            }
            return saveToLocal(student);
        } catch (err) {
            console.error("dataService createStudent error:", err);
            throw new Error(err?.message || "Failed to create account. Please try again.");
        }
    },

    async updateStudent(id, updates) {
        if (this.isUsingBackend) {
            try {
                return await studentService.update(id, updates);
            } catch (err) {
                console.warn("dataService: Backend update failed, updating locally:", err?.message || err);
            }
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
        const local = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
        if (this.isUsingBackend) {
            try {
                const data = await bookingService.getAll();
                const apiList = Array.isArray(data) ? data : [];
                const merged = apiList.map(b => ({ ...b, student: b.student || (b.students && b.students.name) || b.student_id, paymentStatus: b.paymentStatus ?? b.payment_status }));
                local.forEach(b => {
                    if (!merged.some(m => m.id === b.id)) merged.push({ ...b, student: b.student });
                });
                return merged;
            } catch (e) {
                return local;
            }
        }
        return local;
    },

    async getBookingsByStudent(studentId) {
        if (this.isUsingBackend) {
            return await bookingService.getByStudent(studentId);
        }
        const bookings = await this.getBookings();
        return bookings.filter(b => b.studentId === studentId);
    },

    async createBooking(booking) {
        const newBooking = { ...booking, id: booking.id || Date.now().toString(), student: booking.student };
        if (this.isUsingBackend) {
            try {
                const row = {
                    student_id: booking.studentId,
                    date: (booking.date || '').includes('T') ? booking.date : `${booking.date}T12:00:00.000Z`,
                    time: (booking.time || '').length === 5 ? booking.time + ':00' : booking.time,
                    subject: booking.subject,
                    status: booking.status || 'confirmed',
                    type: booking.type || 'lesson',
                    cost: booking.cost != null ? booking.cost : 30,
                    payment_status: (booking.paymentStatus || booking.payment_status || 'due').toLowerCase().replace(/ /g, '_')
                };
                const res = await bookingService.create(row);
                const out = {
                    ...res,
                    student: booking.student,
                    studentName: booking.studentName || booking.student,
                    type: res.type || booking.type || 'lesson',
                    cost: res.cost != null ? res.cost : (booking.cost != null ? booking.cost : 30),
                    paymentStatus: res.payment_status || res.paymentStatus || booking.paymentStatus
                };
                const local = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
                localStorage.setItem('tutor_bookings', JSON.stringify([...local, out]));
                window.dispatchEvent(new Event('storage'));
                return out;
            } catch (err) {
                console.warn('createBooking backend failed, saving locally', err?.message);
            }
        }
        const bookings = await this.getBookings();
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
        if (this.isUsingBackend) {
            // 1. Fetch Slots from DB
            const dbSlots = await availabilityService.getAll();

            // 2. Convert to Weekly Schedule Format
            const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const defaultSchedule = daysMap.map(day => ({ day, intervals: [], active: false }));

            dbSlots.forEach(slot => {
                if (slot.is_active) {
                    const dayName = daysMap[slot.day_of_week];
                    const dayObj = defaultSchedule.find(d => d.day === dayName);
                    if (dayObj) {
                        dayObj.active = true;
                        // Format time HH:MM
                        const start = slot.start_time.slice(0, 5);
                        const end = slot.end_time.slice(0, 5);
                        dayObj.intervals.push({ start, end });
                    }
                }
            });

            // 3. Save this derived schedule to localStorage so UI can use it cleanly (and cache it)
            localStorage.setItem('tutor_weekly_schedule', JSON.stringify(defaultSchedule));

            // 4. Generate Consultation Slots using the same logic as local (reusing code below if refactored, or just duplicate logic for now)
            // Ideally we refactor 'Generate Slots' into a pure helper. For speed, we will trigger the generator below.
        }

        // ... (Existing local logic continues below, effectively using the fresh localStorage we just set if backend was used)

        // 1. Get or Initialize Schedule (Auto-Repair)
        let weeklySchedule = localStorage.getItem('tutor_weekly_schedule');
        const defaultSchedule = [
            { day: 'Monday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Tuesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Wednesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Thursday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Friday', intervals: [{ start: '09:00', end: '15:00' }], active: true },
            { day: 'Saturday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
            { day: 'Sunday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
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
        const bookings = await this.getBookings(); // verified to check backend if needed
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
        // NOTE: This func is called with 'slots' which are the generated Consultation slots.
        // But what we usually want to save is the SCHEDULE configuration.
        // TeacherDashboard saves 'tutor_weekly_schedule' directly to localStorage.
        // We should trap that or rely on `tutor_weekly_schedule` updates triggering a DB sync separate from this?

        // Actually, TeacherDashboard calls `setWeeklySchedule` -> `useEffect` -> `localStorage`.
        // It does NOT call `dataService.saveAvailability` for the schedule itself.
        // `saveAvailability` here seems unused or related to specific generated slots persistence?

        if (this.isUsingBackend) {
            // If we want to persist specific generated slots as entities, we'd do it here.
            // But for now, we rely on dynamic generation from the Schedule Config + Bookings.
            return;
        }
        localStorage.setItem('tutor_slots', JSON.stringify(slots));
        localStorage.setItem('tutor_lesson_slots', JSON.stringify(lessonSlots));
    },

    async saveWeeklySchedule(schedule) {
        localStorage.setItem('tutor_weekly_schedule', JSON.stringify(schedule));
        window.dispatchEvent(new Event('storage'));

        if (this.isUsingBackend) {
            try {
                // Clear existing
                // NOTE: In a real multi-user app, we need user_id filtering here.
                // For this single-tutor app, we clear all to replace with new schedule.
                // We access the raw supabase client via the service modules or need to import it?
                // dataService imports *services*, not the raw client usually, but checks availabilityService.
                // availabilityService.delete takes an ID. 
                // We might need a 'clearAll' or 'replace' in availabilityService.
                // Or just iterate delete? That's slow.
                // Let's assume we can add a specialized method or just use the raw client if we can't.
                // dataService imports: auth, student, etc... from './supabase'.
                // let's look at imports in dataService again.
                // It does NOT import 'supabase' client directly.
                // I should add clearAll to availabilityService or just brute force it here if I can't change that file easily.
                // Actually `availabilityService` is imported. I can check if it has bulk delete. It doesn't.

                // I will blindly assume we can use the service to get all and delete?
                // Or I can update `availabilityService` in `src/services/supabase.js` to support bulk replace.
                // That is cleaner.

                // For now, let's just log a warning that live-save to DB for schedule is pending 
                // OR just use the MigrateData tool for the big syncs and let this be local-first?
                // User wants "Sync to Cloud" button. Maybe that's enough?
                // "Sync to Cloud" implies manual trigger.
                // Automation on every save might be better but riskier if not robust.
                // Let's stick to the "Sync to Cloud" button for now as the PRIMARY way to push changes,
                // and `saveWeeklySchedule` just doing local for speed, 
                // UNLESS I can easily do it.

                // I'll leave this empty for backend for now and rely on MigrateData to push.
                // Wait, if I change schedule on Laptop, I want it on iPad.
                // So I SHOULD implement it.

                // Impl:
                // 1. Get all slots: existing = await availabilityService.getAll()
                // 2. Delete all: Promise.all(existing.map(e => availabilityService.delete(e.id)))
                // 3. Create new.

                const existing = await availabilityService.getAll();
                await Promise.all(existing.map(e => availabilityService.delete(e.id)));

                const daysMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };

                for (const day of schedule) {
                    if (!day.active) continue;
                    const dayIdx = daysMap[day.day];
                    for (const interval of day.intervals) {
                        await availabilityService.create({
                            day_of_week: dayIdx,
                            start_time: interval.start,
                            end_time: interval.end,
                            slot_type: 'both',
                            is_active: true
                        });
                    }
                }

            } catch (err) {
                console.error("Failed to save schedule to DB:", err);
            }
        }
    },

    async getWeeklySchedule() {
        const defaultSchedule = [
            { day: 'Monday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Tuesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Wednesday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Thursday', intervals: [{ start: '09:00', end: '17:00' }], active: true },
            { day: 'Friday', intervals: [{ start: '09:00', end: '15:00' }], active: true },
            { day: 'Saturday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
            { day: 'Sunday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
        ];

        if (this.isUsingBackend) {
            try {
                const dbSlots = await availabilityService.getAll();
                if (!dbSlots || dbSlots.length === 0) return defaultSchedule;

                const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const daysIndexToName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                const schedule = daysOrder.map(day => ({
                    day,
                    intervals: [],
                    active: false
                }));

                dbSlots.forEach(slot => {
                    if (slot.is_active) {
                        const dayName = daysIndexToName[slot.day_of_week];
                        const dayObj = schedule.find(d => d.day === dayName);
                        if (dayObj) {
                            dayObj.active = true;
                            dayObj.intervals.push({
                                start: slot.start_time.slice(0, 5),
                                end: slot.end_time.slice(0, 5)
                            });
                        }
                    }
                });

                // Sort intervals for each day
                schedule.forEach(day => {
                    day.intervals.sort((a, b) => a.start.localeCompare(b.start));
                });

                return schedule;
            } catch (err) {
                console.error("Error getting schedule from DB:", err);
                return defaultSchedule;
            }
        }

        const local = localStorage.getItem('tutor_weekly_schedule');
        const parsed = local ? JSON.parse(local) : defaultSchedule;

        // Ensure local also follows Monday start if it doesn't already
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return daysOrder.map(dayName => {
            const found = parsed.find(d => d.day === dayName);
            return found || { day: dayName, intervals: [], active: false };
        });
    }
};

export default dataService;
