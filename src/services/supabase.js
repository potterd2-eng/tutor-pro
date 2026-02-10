import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// AUTHENTICATION SERVICES
// ============================================

export const authService = {
    // Sign up new student
    async signUp(email, password, name) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });
        if (error) throw error;
        return data;
    },

    // Sign in
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Get current user
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    // Reset password
    async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    }
};

// ============================================
// STUDENT SERVICES
// ============================================

export const studentService = {
    // Get all students
    async getAll() {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Get student by ID
    async getById(id) {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    // Create student
    async create(student) {
        const { data, error } = await supabase
            .from('students')
            .insert([student])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Update student
    async update(id, updates) {
        const { data, error } = await supabase
            .from('students')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Delete student
    async delete(id) {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// ============================================
// BOOKING SERVICES
// ============================================

export const bookingService = {
    // Get all bookings
    async getAll() {
        const { data, error } = await supabase
            .from('bookings')
            .select('*, students(name, email)')
            .order('date', { ascending: true });
        if (error) throw error;
        return data;
    },

    // Get bookings by student
    async getByStudent(studentId) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('student_id', studentId)
            .order('date', { ascending: true });
        if (error) throw error;
        return data;
    },

    // Get upcoming bookings
    async getUpcoming() {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('bookings')
            .select('*, students(name, email)')
            .gte('date', now)
            .eq('status', 'confirmed')
            .order('date', { ascending: true });
        if (error) throw error;
        return data;
    },

    // Create booking
    async create(booking) {
        const { data, error } = await supabase
            .from('bookings')
            .insert([booking])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Update booking
    async update(id, updates) {
        const { data, error } = await supabase
            .from('bookings')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Cancel booking
    async cancel(id) {
        return await this.update(id, { status: 'cancelled' });
    },

    // Delete booking
    async delete(id) {
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Check slot availability
    async checkAvailability(date, time) {
        const { data, error } = await supabase
            .from('bookings')
            .select('id')
            .eq('date', date)
            .eq('time', time)
            .eq('status', 'confirmed');
        if (error) throw error;
        return data.length === 0;
    }
};

// ============================================
// CHAT SERVICES
// ============================================

export const chatService = {
    // Get messages for a student
    async getByStudent(studentId) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('student_id', studentId)
            .order('timestamp', { ascending: true });
        if (error) throw error;
        return data;
    },

    // Send message
    async send(message) {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([message])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Mark messages as read
    async markAsRead(studentId) {
        const { error } = await supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('student_id', studentId)
            .eq('read', false);
        if (error) throw error;
    },

    // Subscribe to new messages
    subscribeToStudent(studentId, callback) {
        return supabase
            .channel(`chat:${studentId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `student_id=eq.${studentId}`
            }, callback)
            .subscribe();
    }
};

// ============================================
// SESSION HISTORY SERVICES
// ============================================

export const sessionService = {
    // Get all session history
    async getAll() {
        const { data, error } = await supabase
            .from('session_history')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Get sessions by student
    async getByStudent(studentId) {
        const { data, error } = await supabase
            .from('session_history')
            .select('*')
            .eq('student_id', studentId)
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Create session record
    async create(session) {
        const { data, error } = await supabase
            .from('session_history')
            .insert([session])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// ============================================
// AVAILABILITY SERVICES
// ============================================

export const availabilityService = {
    // Get all availability slots
    async getAll() {
        const { data, error } = await supabase
            .from('availability_slots')
            .select('*')
            .order('day_of_week', { ascending: true });
        if (error) throw error;
        return data;
    },

    // Create availability slot
    async create(slot) {
        const { data, error } = await supabase
            .from('availability_slots')
            .insert([slot])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Update availability slot
    async update(id, updates) {
        const { data, error } = await supabase
            .from('availability_slots')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Delete availability slot
    async delete(id) {
        const { error } = await supabase
            .from('availability_slots')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

export default supabase;
