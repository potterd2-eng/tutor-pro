// Demo Data Setup Script
// Copy and paste this into your browser console (F12) to restore Sarah's demo data

// 1. Add Sarah as a student
const students = [
    {
        id: 'STU001',
        name: 'Sarah',
        email: 'sarah@example.com',
        phone: '07123456789',
        notes: 'Excellent student, working on A-Level Maths',
        joinDate: '2024-01-15'
    }
];
localStorage.setItem('tutor_students', JSON.stringify(students));

// 2. Add sample bookings for Sarah
const now = new Date();
const bookings = [
    // Upcoming lesson
    {
        id: 'BOOK001',
        student: 'Sarah',
        date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        time: '14:00',
        subject: 'A-Level Maths',
        type: 'lesson',
        status: 'confirmed',
        notes: 'Trigonometry revision'
    },
    // Another upcoming lesson
    {
        id: 'BOOK002',
        student: 'Sarah',
        date: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 9 days from now
        time: '15:00',
        subject: 'A-Level Maths',
        type: 'lesson',
        status: 'confirmed',
        notes: 'Calculus practice'
    }
];
localStorage.setItem('tutor_bookings', JSON.stringify(bookings));

// 3. Add sample session history (completed lessons)
const sessionHistory = [
    {
        id: 'SESS001',
        date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        studentName: 'Sarah',
        topic: 'Quadratic Equations',
        feedback_well: 'Great understanding of factorization',
        feedback_improve: 'Practice more word problems',
        next_steps: 'Complete worksheet on quadratics',
        cost: 30,
        paymentStatus: 'Paid',
        type: 'lesson'
    },
    {
        id: 'SESS002',
        date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
        studentName: 'Sarah',
        topic: 'Algebra Basics',
        feedback_well: 'Excellent progress with linear equations',
        feedback_improve: 'Work on simultaneous equations',
        next_steps: 'Practice problems from textbook',
        cost: 30,
        paymentStatus: 'Paid',
        type: 'lesson'
    }
];
localStorage.setItem('tutor_session_history', JSON.stringify(sessionHistory));

// 4. Add sample chat messages
const chatMessages = {
    'Sarah': [
        {
            sender: 'Sarah',
            message: 'Hi! Looking forward to our next lesson on trigonometry.',
            timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            sender: 'Davina',
            message: 'Great! Make sure to review the unit circle before our session.',
            timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 3600000).toISOString()
        },
        {
            sender: 'Sarah',
            message: 'Will do! Thanks!',
            timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 7200000).toISOString()
        }
    ]
};
localStorage.setItem('chat_messages_v2', JSON.stringify(chatMessages));

console.log('✅ Demo data restored!');
console.log('Students:', students);
console.log('Bookings:', bookings);
console.log('Session History:', sessionHistory);
console.log('Chat Messages:', chatMessages);
console.log('\nRefresh the page to see the data!');
