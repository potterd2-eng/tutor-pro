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
    isUsingBackend: isSupabaseConfigured(),

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
            return await availabilityService.getAll();
        }
        const slots = localStorage.getItem('tutor_slots');
        const lessonSlots = localStorage.getItem('tutor_lesson_slots');
        return {
            slots: slots ? JSON.parse(slots) : [],
            lessonSlots: lessonSlots ? JSON.parse(lessonSlots) : []
        };
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
