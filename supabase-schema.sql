-- ============================================
-- SUPABASE DATABASE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_user_id ON students(user_id);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    time TIME NOT NULL,
    subject TEXT,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    type TEXT DEFAULT 'lesson' CHECK (type IN ('lesson', 'consultation')),
    cost DECIMAL(10,2) DEFAULT 30.00,
    payment_status TEXT DEFAULT 'due' CHECK (payment_status IN ('due', 'paid', 'n/a')),
    booking_for TEXT CHECK (booking_for IN ('pupil', 'parent')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_bookings_student_id ON bookings(student_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('Teacher', 'Student')),
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Indexes for faster queries
CREATE INDEX idx_chat_student_id ON chat_messages(student_id);
CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_chat_read ON chat_messages(read);

-- ============================================
-- SESSION HISTORY TABLE
-- ============================================
CREATE TABLE session_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    topic TEXT,
    feedback_well TEXT,
    feedback_improve TEXT,
    next_steps TEXT,
    cost DECIMAL(10,2) DEFAULT 30.00,
    payment_status TEXT DEFAULT 'due',
    type TEXT DEFAULT 'lesson',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_session_student_id ON session_history(student_id);
CREATE INDEX idx_session_date ON session_history(date);

-- ============================================
-- AVAILABILITY SLOTS TABLE
-- ============================================
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type TEXT DEFAULT 'lesson' CHECK (slot_type IN ('lesson', 'consultation', 'both')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_availability_day ON availability_slots(day_of_week);
CREATE INDEX idx_availability_active ON availability_slots(is_active);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Students: Users can only see their own data
CREATE POLICY "Users can view own student record"
    ON students FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own student record"
    ON students FOR UPDATE
    USING (auth.uid() = user_id);

-- Bookings: Students can see their own, teachers can see all
CREATE POLICY "Students can view own bookings"
    ON bookings FOR SELECT
    USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view all bookings"
    ON bookings FOR SELECT
    USING (auth.jwt() ->> 'role' = 'teacher');

CREATE POLICY "Teachers can manage bookings"
    ON bookings FOR ALL
    USING (auth.jwt() ->> 'role' = 'teacher');

-- Chat Messages: Students can see their own, teachers can see all
CREATE POLICY "Students can view own messages"
    ON chat_messages FOR SELECT
    USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view all messages"
    ON chat_messages FOR SELECT
    USING (auth.jwt() ->> 'role' = 'teacher');

CREATE POLICY "Users can send messages"
    ON chat_messages FOR INSERT
    WITH CHECK (true);

-- Session History: Students can see their own, teachers can see all
CREATE POLICY "Students can view own sessions"
    ON session_history FOR SELECT
    USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view all sessions"
    ON session_history FOR SELECT
    USING (auth.jwt() ->> 'role' = 'teacher');

CREATE POLICY "Teachers can create sessions"
    ON session_history FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'teacher');

-- Availability: Everyone can view, only teachers can modify
CREATE POLICY "Anyone can view availability"
    ON availability_slots FOR SELECT
    USING (true);

CREATE POLICY "Teachers can manage availability"
    ON availability_slots FOR ALL
    USING (auth.jwt() ->> 'role' = 'teacher');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample teacher availability
INSERT INTO availability_slots (day_of_week, start_time, end_time, slot_type) VALUES
    (1, '09:00', '17:00', 'both'), -- Monday
    (2, '09:00', '17:00', 'both'), -- Tuesday
    (3, '09:00', '17:00', 'both'), -- Wednesday
    (4, '09:00', '17:00', 'both'), -- Thursday
    (5, '09:00', '17:00', 'both'); -- Friday
