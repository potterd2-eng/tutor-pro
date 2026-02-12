import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Removed react-calendly to avoid install issues
import {
    Calendar, CheckCircle, ChevronDown, ChevronRight, Clock, Copy, CreditCard,
    Facebook, GraduationCap, Instagram, Linkedin, LogIn, Mail, Menu, MessageSquare,
    Phone, Star, Twitter, User, Users, Video, X, BookOpen, Shield, ArrowRight, Calculator, Brain
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import profilePic from '../assets/profile.jpg'; // Import profile picture
import { emailService } from '../utils/email';
import { dataService } from '../services/dataService';
import { generateGoogleCalendarUrl } from '../utils/calendar';

const formatName = (name) => {
    if (!name) return '';
    return name.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const BookingGrid = ({ onBook }) => {
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingName, setBookingName] = useState('');
    const [studentName, setStudentName] = useState('');
    const [bookingEmail, setBookingEmail] = useState('');
    const [bookingSubject, setBookingSubject] = useState('');
    const [gdprConsent, setGdprConsent] = useState(false);
    const [bookingFor, setBookingFor] = useState('pupil');
    const [studentAge, setStudentAge] = useState(null);
    const [isParent, setIsParent] = useState(null);
    const [parentEmail, setParentEmail] = useState('');
    const [confirmationData, setConfirmationData] = useState(null);

    useEffect(() => {
        const loadSlots = async () => {
            const { consultationSlots } = await dataService.getAvailability();
            console.log("Loading Consultation Slots:", consultationSlots ? consultationSlots.length : 0);

            if (consultationSlots) {
                setAvailableSlots(consultationSlots);
            }
        };
        loadSlots();
        window.addEventListener('storage', loadSlots);
        return () => window.removeEventListener('storage', loadSlots);
    }, []);

    const slotsByDate = availableSlots.reduce((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
    }, {});

    const sortedDates = Object.keys(slotsByDate).sort();

    const confirmBooking = (e) => {
        e.preventDefault();
        if (!selectedSlot || !bookingName || !bookingEmail || !bookingSubject || !gdprConsent) return;

        const bookingDetails = {
            date: selectedSlot.date,
            time: selectedSlot.time,
            name: bookingName,
            email: bookingEmail,
            subject: bookingSubject,
            gdprConsent
        };

        if (onBook) {
            console.log('BookingGrid: Calling onBook with details:', bookingDetails);
            onBook(bookingDetails);
            setShowBookingModal(false);
            setBookingName(''); setStudentName(''); setBookingEmail(''); setBookingSubject(''); setGdprConsent(false);
        } else {
            console.error('BookingGrid: onBook prop is missing!');
        }
    };

    if (availableSlots.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>No available slots found for the next 30 days.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[500px]">

            <div className="md:w-1/3 md:max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-bold text-gray-400 uppercase text-xs mb-3">Select Date</h3>
                <div className="space-y-2">
                    {sortedDates.map(date => (
                        <button key={date} onClick={() => setSelectedDay(date)} className={`w-full p-4 rounded-xl text-left border-2 transition-all ${selectedDay === date ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-100' : 'border-white bg-white hover:border-purple-100'}`}>
                            <div className="font-bold text-sm uppercase text-gray-400">{new Date(date).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                            <div className="font-extrabold text-xl text-gray-800">{new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="md:w-2/3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {selectedDay ? (
                    <div className="grid grid-cols-3 gap-3">
                        {slotsByDate[selectedDay].map(slot => (
                            <button key={slot.id} onClick={() => {
                                setSelectedSlot(slot);
                                if (onBook) onBook({ date: slot.date, time: slot.time });
                            }} className="py-2 px-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-all text-sm font-bold shadow-sm">
                                {slot.time}
                            </button>
                        ))}
                    </div>
                ) : <div className="h-full flex items-center justify-center text-gray-300">Select a date</div>}
            </div>

            {confirmationData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-md w-full">
                        <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
                        <h3 className="text-2xl font-bold mb-2">Confirmed!</h3>
                        <p className="mb-6">Session on {confirmationData.date} at {confirmationData.time}</p>
                        <button onClick={() => setConfirmationData(null)} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const LandingPage = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false);
    const [showStudentBookingModal, setShowStudentBookingModal] = useState(false);
    const [studentModalTab, setStudentModalTab] = useState('existing'); // 'new' or 'existing'
    const [showForgotPinModal, setShowForgotPinModal] = useState(false);
    const [showParentLoginModal, setShowParentLoginModal] = useState(false);
    const [parentLoginStep, setParentLoginStep] = useState('email'); // 'email', 'createPin', 'enterPin'
    const [parentEmail, setParentEmail] = useState('');
    const [parentAccount, setParentAccount] = useState(null);
    const [notification, setNotification] = useState(null);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showConsultationChoiceModal, setShowConsultationChoiceModal] = useState(false);
    const [consultationStep, setConsultationStep] = useState('initial'); // 'initial' or 'who-are-you'
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Data Repair: Ensure existing consultations are marked as free/paid
    useEffect(() => {
        const repairData = () => {
            const bookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
            let changed = false;
            const updated = bookings.map(b => {
                if (b.type === 'consultation') {
                    if (b.paymentStatus !== 'Paid' || b.cost !== 0) {
                        changed = true;
                        return { ...b, paymentStatus: 'Paid', cost: 0 };
                    }
                }
                return b;
            });

            if (changed) {
                localStorage.setItem('tutor_bookings', JSON.stringify(updated));
                window.dispatchEvent(new Event('storage'));
            }

            // Also repair session history
            const history = JSON.parse(localStorage.getItem('tutor_session_history') || '[]');
            let historyChanged = false;
            const updatedHistory = history.map(h => {
                if (h.type === 'consultation' || h.subject === 'Free Consultation') {
                    if (h.paymentStatus !== 'Paid' || h.cost !== 0) {
                        historyChanged = true;
                        return { ...h, paymentStatus: 'Paid', cost: 0 };
                    }
                }
                return h;
            });

            if (historyChanged) {
                localStorage.setItem('tutor_session_history', JSON.stringify(updatedHistory));
                window.dispatchEvent(new Event('storage'));
            }
        };

        repairData();
    }, []);
    const [isUnder16, setIsUnder16] = useState(null); // null, true, or false
    const [loginType, setLoginType] = useState('existing'); // 'new' or 'existing' for parent sign-in
    const [pendingBooking, setPendingBooking] = useState(null);

    const handleBookingRequest = (details) => {
        console.log('LandingPage: handleBookingRequest called', details);
        setPendingBooking(details);
        setShowConsultationChoiceModal(true);
        setConsultationStep('who-are-you');
    };

    const finalizeBooking = (userType, userDetails) => {
        if (!pendingBooking) return;

        const bookingId = 'consult-' + Date.now().toString(36);
        // Robust name extraction
        const rawName = userDetails.name || userDetails.firstName || userDetails.studentName || pendingBooking.name || 'Student';
        const formattedStudentName = formatName(rawName);

        const meetingLink = `${window.location.origin}/session/${bookingId}?host=false&student=${encodeURIComponent(formattedStudentName)}`;

        // Use subject from userDetails (signup form) if available, otherwise fallback (e.g. from payment flow)
        const bookingSubject = userDetails.subject || pendingBooking.subject || 'Consultation';

        const newBooking = {
            id: bookingId,
            date: pendingBooking.date,
            time: pendingBooking.time,
            student: formattedStudentName,
            email: userDetails.email || pendingBooking.email, // Prefer user email
            subject: bookingSubject,
            bookingFor: userType, // 'student' or 'parent'
            studentName: formattedStudentName,
            type: 'consultation',
            meetingLink: meetingLink,
            bookedAt: new Date().toISOString(),
            paymentStatus: 'Paid', // consultations are free, so considered Paid/Settled
            cost: 0, // Free consultation
            status: 'confirmed',
            studentId: userDetails.id, // Link to user
            parentId: userDetails.parentId
        };

        const bookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
        bookings.push(newBooking);
        localStorage.setItem('tutor_bookings', JSON.stringify(bookings));
        window.dispatchEvent(new Event('storage'));

        // Send Emails
        emailService.sendConfirmation({ ...newBooking, link: meetingLink }).catch(err => console.error(err));
        emailService.sendTeacherNotification(newBooking).catch(err => console.error(err));

        setPendingBooking(null);
        setNotification({ type: 'success', message: 'Booking Confirmed! You can now view it in your dashboard.' });
    };

    // Load Calendly Script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showBookingDropdown && !e.target.closest('.booking-dropdown')) {
                setShowBookingDropdown(false);
            }
        };
        if (showBookingDropdown) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showBookingDropdown]);

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    const faqs = [
        {
            q: "How do online sessions work?",
            a: "We use a dedicated interactive whiteboard and high-quality video chat built right into this platform. No need to download Zoom or other apps—just click the link I send you!"
        },
        {
            q: "What is your cancellation policy?",
            a: "Life happens! You can cancel or reschedule up to 24 hours before your session free of charge. Cancellations within 24 hours may incur a 50% fee."
        },
        {
            q: "Do you assign homework?",
            a: "Homework is purely optional and suggested to help reinforce learning. I can assign 30-60 minutes of practice between sessions if desired, but we can adjust this based on your schedule."
        },
        {
            q: "How are safeguarding and recordings handled?",
            a: "Student safety is paramount. All sessions are conducted via secure, private links. Sessions can be recorded for revision purposes upon request, with strict data privacy controls."
        },
        {
            q: "What tools do I need?",
            a: "Just a laptop or tablet with a webcam and microphone. A stable internet connection is key. Using a mouse or drawing tablet can help with interactive whiteboard tasks, but isn't strictly necessary."
        },
        {
            q: "Can I book a free consultation?",
            a: "Absolutely! I offer a complimentary 15-minute chat to discuss your goals and see if we're a good fit. Use the 'Book Now' button to schedule it."
        }
    ];

    return (
        <div className="min-h-screen bg-brand-light font-sans text-brand-navy scroll-smooth">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 px-6 py-4">



                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xl cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <GraduationCap size={32} />
                        <span>Davina's Tutoring Platform</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 font-medium text-gray-600">
                        <button onClick={() => scrollToSection('about')} className="hover:text-purple-600 transition-colors">About</button>
                        <button onClick={() => scrollToSection('reviews')} className="hover:text-purple-600 transition-colors">Reviews</button>
                        <button onClick={() => scrollToSection('booking')} className="hover:text-purple-600 transition-colors">Book</button>
                        <button onClick={() => scrollToSection('faq')} className="hover:text-purple-600 transition-colors">FAQ</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { setSelectedSubject(null); setShowLoginModal(true); }}
                            className="text-purple-600 font-bold hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors"
                        >
                            Log In
                        </button>

                        {/* Booking Dropdown */}
                        <div className="relative booking-dropdown">
                            <button
                                onClick={() => setShowBookingDropdown(!showBookingDropdown)}
                                className="bg-purple-600 text-white px-5 py-2.5 rounded-full font-bold shadow-md hover:bg-purple-700 transition-all hover:scale-105 flex items-center gap-2"
                            >
                                Book Lessons
                                <ChevronDown size={16} className={`transition-transform ${showBookingDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {showBookingDropdown && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                                    <button
                                        onClick={() => {
                                            scrollToSection('booking');
                                            setShowBookingDropdown(false);
                                        }}
                                        className="w-full px-5 py-4 text-left hover:bg-purple-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <Clock size={20} className="text-purple-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">Free Consultation</div>
                                                <div className="text-xs text-gray-500">15-minute intro session</div>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowStudentBookingModal(true);
                                            setShowBookingDropdown(false);
                                        }}
                                        className="w-full px-5 py-4 text-left hover:bg-teal-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                                <BookOpen size={20} className="text-teal-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">Book First Lesson</div>
                                                <div className="text-xs text-gray-500">1-hour paid session</div>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowStudentBookingModal(true);
                                            setStudentModalTab('new');
                                            setShowBookingDropdown(false);
                                        }}
                                        className="w-full px-5 py-4 text-left hover:bg-teal-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                                <Video size={20} className="text-yellow-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">Book 10 Hour Lesson Block</div>
                                                <div className="text-xs text-secondary-500">Discount for the 10 lesson bundle</div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-bold mb-6 animate-in slide-in-from-bottom-5 fade-in duration-700">
                        <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
                        Accepting New Students for 2026
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-brand-navy">
                        Master Your Subjects with <br /> Expert Personal Tutoring
                    </h1>
                    <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
                        Personalized learning plans, interactive online sessions, and proven results.
                        Unlock your full potential today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => { setSelectedSubject(null); scrollToSection('booking'); }}
                            className="w-full sm:w-auto px-8 py-4 bg-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Calendar size={20} />
                            Book Free Consultation
                        </button>
                    </div>
                </div>



                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-20 left-10 w-96 h-96 bg-teal-100 rounded-full blur-[100px] opacity-40"></div>
                    <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-200 rounded-full blur-[80px] opacity-40"></div>
                </div>
            </header>

            {/* Stats / Features Strip */}
            <div className="bg-white py-12 border-y border-gray-100">
                <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-12 text-center">
                    {[
                        { icon: Star, label: "5-Star Reviews", val: "60+" },
                        { icon: Clock, label: "Tutoring Hours", val: "550+" },
                        { icon: Shield, label: "DBS Checked", val: "Verified" },
                    ].map((s, i) => (
                        <div key={i} className="space-y-2">
                            <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-purple-600">
                                <s.icon size={24} />
                            </div>
                            <h3 className="text-2xl font-bold text-brand-navy">{s.val}</h3>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Specialized Subjects Section */}
            <section className="py-20 bg-gray-50 border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold text-teal-500 uppercase tracking-widest mb-2">My Expertise</h2>
                        <h3 className="text-3xl font-bold text-brand-navy">Specialized Tutoring Subjects</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Sociology Card */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-bold text-gray-900">Sociology</h3>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">GCSE</span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">A-Level</span>
                                </div>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Exploring society, culture, and identity. I specialize in making complex theories accessible and helping students master essay-writing techniques for top marks.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-purple-500" /> Families and Households</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-purple-500" /> Education</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-purple-500" /> Crime and Deviance</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-purple-500" /> Research Methods</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-purple-500" /> General Inequalities</li>
                            </ul>
                        </div>

                        {/* Maths Card */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                <Calculator size={32} />
                            </div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-bold text-gray-900">Mathematics</h3>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">KS3</span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">GCSE</span>
                                </div>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Building confidence in numbers. From algebra to geometry, I help students understand the 'why' behind the methods, turning anxiety into achievement.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-blue-500" /> Exam Board Specific Prep (AQA, Edexcel)</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-blue-500" /> Problem Solving & Logic</li>
                                <li className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckCircle size={18} className="text-blue-500" /> Grade 9-1 Targeting Strategies</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Details Section */}
            <section id="pricing" className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-sm font-bold text-purple-500 uppercase tracking-widest mb-2">Pricing Plans</h2>
                        <h3 className="text-3xl font-bold text-brand-navy">Invest in Your Academic Success</h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* KS3 */}
                        <div className="bg-purple-600 rounded-3xl p-8 text-white shadow-xl flex flex-col transform hover:scale-105 transition-all">
                            <h4 className="text-xl font-bold mb-2">KS3 Sessions</h4>
                            <p className="text-purple-100 text-sm mb-6">Building strong foundations for younger learners.</p>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-purple-100">Single Lesson</span>
                                    <span className="font-bold">£25.00</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-purple-100">10 Lesson Bundle</span>
                                        <span className="text-[10px] text-teal-300 font-bold">Save £20</span>
                                    </div>
                                    <span className="font-bold text-teal-300">£230.00</span>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedSubject('KS3 Maths'); setShowConsultationChoiceModal(true); }} className="mt-auto w-full py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">Get Started</button>
                        </div>

                        {/* GCSE */}
                        <div className="bg-purple-600 rounded-3xl p-8 text-white shadow-xl flex flex-col transform md:scale-110 z-10 hover:scale-115 transition-all">
                            <h4 className="text-xl font-bold mb-2">GCSE Sessions</h4>
                            <p className="text-purple-100 text-sm mb-6">Targeted exam preparation and grade boosting.</p>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-purple-100">Single Lesson</span>
                                    <span className="font-bold">£30.00</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-purple-100">10 Lesson Bundle</span>
                                        <span className="text-[10px] text-teal-300 font-bold">Save £20</span>
                                    </div>
                                    <span className="font-bold text-teal-300">£280.00</span>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedSubject('GCSE Maths'); setShowConsultationChoiceModal(true); }} className="mt-auto w-full py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">Get Started</button>
                        </div>

                        {/* A-Level */}
                        <div className="bg-purple-600 rounded-3xl p-8 text-white shadow-xl flex flex-col transform hover:scale-105 transition-all">
                            <h4 className="text-xl font-bold mb-2">A-Level Sessions</h4>
                            <p className="text-purple-100 text-sm mb-6">In-depth analysis and expert subject mastery.</p>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-purple-100">Single Lesson</span>
                                    <span className="font-bold">£40.00</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-purple-100">10 Lesson Bundle</span>
                                        <span className="text-[10px] text-teal-300 font-bold">Save £30</span>
                                    </div>
                                    <span className="font-bold text-teal-300">£370.00</span>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedSubject('A-Level Sociology'); setShowConsultationChoiceModal(true); }} className="mt-auto w-full py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">Get Started</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 px-6">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    <div className="relative">
                        <div className="aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden shadow-xl relative z-10 group">
                            {/* Profile Image with Fallback */}
                            <img
                                src={profilePic}
                                alt="Davina Potter"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                    e.target.style.display = 'none'; // Hide broken image
                                    e.target.nextSibling.style.display = 'flex'; // Show fallback
                                }}
                            />
                            {/* Fallback Placeholder (Hidden by default if image loads) */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-white flex items-center justify-center text-gray-300 hidden">
                                <div className="text-center">
                                    <span className="text-6xl">👩‍🏫</span>
                                    <p className="mt-4 font-bold">Davina Potter</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-full h-full border-4 border-teal-400 rounded-2xl -z-0"></div>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-teal-500 uppercase tracking-widest mb-2">About Your Tutor</h2>
                        <h3 className="text-3xl font-bold text-brand-navy mb-6">Expert Guidance, <br />Personalized for You.</h3>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Hi, I'm Davina! With over 3 years of experience and 550+ tutoring hours, I help students excel in **Maths KS3, GCSE and Sociology GCSE, A level**. I have a First-Class degree in Sociology and am currently pursuing a Master's in Banking and Finance at Surrey University.
                        </p>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Sociology has a special place in my heart, and I strive to convey this enthusiasm to my students. I also love tutoring Maths—it was a subject I improved on significantly through hard work, going from a Grade 5/C to a Grade 7/A.
                        </p>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            I believe in creating a safe space where students can express their ideas and grow. There is nothing more rewarding than seeing students achieve what they once thought was impossible.
                        </p>
                        <div className="space-y-4">
                            {[
                                "First-Class Degree in Sociology",
                                "MSc Banking & Finance Student (Surrey University)",
                                "Specialist in KS3, GCSE & A-Level (Maths & Sociology)",
                                "Full Enhanced DBS Checked (Issued 2026)"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                                    <span className="font-medium text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Reviews Section */}
            <section id="reviews" className="py-20 px-6 bg-white overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16 relative">
                        <h2 className="text-sm font-bold text-teal-500 uppercase tracking-widest mb-2">Success Stories</h2>
                        <h3 className="text-3xl font-bold text-brand-navy">What My Students Say</h3>

                        {/* Decimal decoration */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-100 rounded-full blur-[60px] opacity-60 -z-10"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Hardcoded Sample Reviews + Dynamic Reviews */}
                        {[
                            {
                                id: 'rev-1',
                                studentName: 'Linsey',
                                rating: 5,
                                comment: "Davina has been nothing short of outstanding. She has supported my daughter in getting from a grade C to B in A level sociology in a short space of time. Davina is incredibly knowledgeable about the specification and I would highly recommend her tutoring.",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-2',
                                studentName: 'Olivia',
                                rating: 5,
                                comment: "I was able to go up a full grade with Davina. She is a really knowledgeable person and very easy to learn from! Thank you so much!!",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-3',
                                studentName: 'Abosede',
                                rating: 5,
                                comment: "Davina has been a fantastic tutor to my daughter. She is knowledgeable, patient, and disciplined in her teaching approach. Her guidance has significantly helped my daughter, deepening her understanding and strengthening her knowledge.",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-4',
                                studentName: 'Laura',
                                rating: 5,
                                comment: "Davina has been a fantastic tutor for my daughter. She was achieving B and C grades during her assessments and mock exams. However after her sessions with Davina my daughter achieved an A* in her final A level exam. Davina really helped boost her confidence.",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-5',
                                studentName: 'Gemma',
                                rating: 5,
                                comment: "Davina has been a fantastic tutor to my son. She is patient and disciplined in her lessons and really helped him expand his knowledge. Elliot feels so much more confident doing his exams.",
                                subject: "GCSE Maths"
                            },
                            {
                                id: 'rev-6',
                                studentName: 'Ella',
                                rating: 5,
                                comment: "Davina has been an excellent tutor, I felt so much more confident going into my exams. She is very patient, and supportive with both knowledge and exam structure. I definitely recommend Davina.",
                                subject: "GCSE Maths"
                            },
                            {
                                id: 'rev-7',
                                studentName: 'Kim',
                                rating: 5,
                                comment: "Been absolutely brilliant for my daughter and didnt think online tutoring would work but its been simple and a great help ! Would recommend Davina to any A Level student requiring help throughout their studies.",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-8',
                                studentName: 'Sophie',
                                rating: 5,
                                comment: "amazing! we did a-level sociology revision and focused mainly on education as a topic. i love the layout of the lessons and how content based they are and Davina has some really great revision resources to share.",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-9',
                                studentName: 'Parmajit',
                                rating: 5,
                                comment: "Best tutor ever!",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-10',
                                studentName: 'Emma',
                                rating: 5,
                                comment: "Davina helped my child to improve her knowledge and focus her Sociology revision ahead of her GCSE. She has now passed and enrolled to study Sociology at A level.",
                                subject: "GCSE Sociology"
                            },
                            {
                                id: 'rev-11',
                                studentName: 'Gioia',
                                rating: 5,
                                comment: "Fantastic lesson!",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'rev-12',
                                studentName: 'Nyah',
                                rating: 5,
                                comment: "so encouraging",
                                subject: "Maths"
                            },
                            ...(JSON.parse(localStorage.getItem('tutor_public_reviews') || '[]').reverse().slice(0, 3))
                        ].slice(0, showAllReviews ? undefined : 3).map((review, i) => (
                            <div key={review.id || i} className="bg-gray-50 p-8 rounded-2xl relative group hover:-translate-y-2 transition-transform duration-300">
                                <div className="absolute top-8 right-8 text-teal-100 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <MessageSquare size={48} />
                                </div>
                                <div className="flex gap-1 mb-4 text-yellow-400">
                                    {[...Array(review.rating || 5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                                </div>
                                <p className="text-gray-600 mb-6 leading-relaxed relative z-10">"{review.comment}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                                        {review.studentName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{review.studentName}</div>
                                        <div className="text-xs text-gray-500 uppercase font-bold">{review.subject}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* See More Button */}
                    <div className="text-center mt-8">
                        <button
                            onClick={() => setShowAllReviews(!showAllReviews)}
                            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md"
                        >
                            {showAllReviews ? 'See Less' : 'See More Reviews'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Booking / Calendly Section */}
            <section id="booking" className="py-20 px-6 bg-brand-light text-brand-navy relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-3xl font-bold mb-6 text-brand-navy">Ready to Get Started?</h2>
                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                        Book a free 15-minute consultation to discuss your goals. Alternatively, existing students can book their next session directly below.
                    </p>

                    {/* Custom Booking Grid */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mx-auto max-w-4xl min-h-[400px] p-8">
                        <BookingGrid onBook={handleBookingRequest} />
                    </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[80px] opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500 rounded-full blur-[80px] opacity-20"></div>
            </section>

            {/* FAQ Section - Moved after Booking */}
            <section id="faq" className="py-20 px-6 bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-sm font-bold text-purple-600 uppercase tracking-widest mb-2">Common Questions</h2>
                        <h3 className="text-3xl font-bold text-brand-navy">Everything You Need to Know</h3>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((f, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden hover:border-purple-200 transition-colors">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors text-left"
                                >
                                    <span className="font-bold text-lg text-gray-800">{f.q}</span>
                                    {openFaq === i ? <ChevronUp className="text-purple-600" /> : <ChevronDown className="text-gray-400" />}
                                </button>
                                {openFaq === i && (
                                    <div className="p-6 pt-0 bg-gray-50 text-gray-600 leading-relaxed border-t border-gray-100">
                                        {f.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
                            <GraduationCap />
                            <span>Davina's Tutoring Platform</span>
                        </div>
                        <p className="text-sm leading-relaxed max-w-xs">
                            Empowering students to achieve their best through personalized, interactive online tutoring.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><button onClick={() => scrollToSection('about')} className="hover:text-purple-400">About Me</button></li>
                            <li><button onClick={() => scrollToSection('reviews')} className="hover:text-purple-400">Reviews</button></li>
                            <li><button onClick={() => scrollToSection('booking')} className="hover:text-purple-400">Book Session</button></li>
                            <li><button onClick={() => scrollToSection('faq')} className="hover:text-purple-400">FAQ</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Contact</h4>
                        <ul className="space-y-2 text-sm">
                            <li>davina.potter@outlook.com</li>
                            <li>Mon-Fri: 9am - 7pm</li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-8 text-center text-xs flex flex-col md:flex-row justify-between items-center gap-4">
                    <span>© 2026 Davina's Tutoring Platform. All rights reserved.</span>
                    <div className="flex gap-4">
                        <a href="/privacy" className="hover:text-purple-400 underline">Privacy Policy</a>
                        <a href="/terms" className="hover:text-purple-400 underline">Terms of Service</a>
                        <a href="/cookie-policy" className="hover:text-purple-400 underline">Cookie Policy</a>
                    </div>
                </div>
            </footer>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowLoginModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <span className="text-xl">×</span>
                        </button>
                        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Choose Portal</h2>

                        <div className="grid gap-4">
                            <button
                                onClick={() => navigate('/teacher')}
                                className="flex items-center gap-4 p-4 border-2 border-transparent hover:border-purple-500 bg-purple-50 rounded-2xl group transition-all"
                            >
                                <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <GraduationCap size={24} className="text-purple-600 group-hover:text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-gray-900">Teacher Login</h3>
                                    <p className="text-xs text-gray-500">Manage lessons & students</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-300 group-hover:text-purple-600" />
                            </button>

                            <button
                                onClick={() => {
                                    setShowLoginModal(false);
                                    setShowStudentBookingModal(true);
                                }}
                                className="flex items-center gap-4 p-4 border-2 border-transparent hover:border-teal-500 bg-teal-50 rounded-2xl group transition-all"
                            >
                                <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                    <Users size={24} className="text-teal-600 group-hover:text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-gray-900">Student Login</h3>
                                    <p className="text-xs text-gray-500">Join your lesson</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-300 group-hover:text-teal-600" />
                            </button>

                            <button
                                onClick={() => {
                                    setShowLoginModal(false);
                                    setShowParentLoginModal(true);
                                }}
                                className="flex items-center gap-4 p-4 border-2 border-transparent hover:border-blue-500 bg-blue-50 rounded-2xl group transition-all"
                            >
                                <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <User size={24} className="text-blue-600 group-hover:text-white" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-gray-900">Parent Login</h3>
                                    <p className="text-xs text-gray-500">View your child's progress</p>
                                </div>
                                <ArrowRight className="ml-auto text-gray-300 group-hover:text-blue-600" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Consultation Choice Modal */}
            {showConsultationChoiceModal && (
                <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => { setShowConsultationChoiceModal(false); setConsultationStep('initial'); }}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 text-center">
                            {consultationStep === 'initial' ? (
                                <>
                                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mx-auto mb-6">
                                        <GraduationCap size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start?</h3>
                                    <p className="text-gray-500 mb-8">Choose how you'd like to begin your learning journey.</p>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                setShowConsultationChoiceModal(false);
                                                scrollToSection('booking');
                                            }}
                                            className="w-full py-4 px-4 bg-white border-2 border-purple-100 hover:border-purple-600 rounded-2xl flex items-center gap-4 transition-all group text-left shadow-sm hover:shadow-md"
                                        >
                                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                                                <Clock size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-900 group-hover:text-purple-700">Free Consultation</div>
                                                <div className="text-xs text-gray-500">15-minute intro session</div>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300 group-hover:text-purple-600" />
                                        </button>

                                        <button
                                            onClick={() => setConsultationStep('who-are-you')}
                                            className="w-full py-4 px-4 bg-white border-2 border-teal-100 hover:border-teal-500 rounded-2xl flex items-center gap-4 transition-all group text-left shadow-sm hover:shadow-md"
                                        >
                                            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center shrink-0">
                                                <BookOpen size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-900 group-hover:text-teal-700">Book First Lesson</div>
                                                <div className="text-xs text-gray-500">1-hour paid session</div>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300 group-hover:text-teal-600" />
                                        </button>

                                        <button
                                            onClick={() => setConsultationStep('who-are-you')}
                                            className="w-full py-4 px-4 bg-white border-2 border-yellow-100 hover:border-yellow-500 rounded-2xl flex items-center gap-4 transition-all group text-left shadow-sm hover:shadow-md"
                                        >
                                            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0">
                                                <Star size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-900 group-hover:text-yellow-700">Book 10 Hour Block</div>
                                                <div className="text-xs text-gray-500">Discount for 10 lesson bundle</div>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300 group-hover:text-yellow-600" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowConsultationChoiceModal(false)}
                                        className="w-full py-2 mt-4 text-gray-400 font-medium hover:text-gray-600 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 mx-auto mb-6">
                                        <Users size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Who are you?</h3>
                                    <p className="text-gray-500 mb-8">Please select your role to continue.</p>

                                    <div className="space-y-4">
                                        <button
                                            onClick={() => {
                                                setShowConsultationChoiceModal(false);
                                                setConsultationStep('initial');
                                                setShowStudentBookingModal(true);
                                                setStudentModalTab('new');
                                            }}
                                            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            I am a Student
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowConsultationChoiceModal(false);
                                                setConsultationStep('initial');
                                                setShowParentLoginModal(true);
                                                setLoginType('new');
                                            }}
                                            className="w-full py-4 bg-teal-500 text-white rounded-2xl font-bold hover:bg-teal-600 transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            I am a New Parent (Register)
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowConsultationChoiceModal(false);
                                                setConsultationStep('initial');
                                                setShowParentLoginModal(true);
                                                setLoginType('existing');
                                                setParentLoginStep('email');
                                            }}
                                            className="w-full py-4 bg-white border-2 border-teal-500 text-teal-600 rounded-2xl font-bold hover:bg-teal-50 transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            I am an Existing Parent (Log In)
                                        </button>
                                        <button
                                            onClick={() => setConsultationStep('initial')}
                                            className="w-full py-2 text-gray-400 font-medium hover:text-gray-600 text-sm"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}



            {/* Student Booking Modal (Used for signup too) */}
            {showStudentBookingModal && (
                <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full my-8 relative animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <button onClick={() => setShowStudentBookingModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 z-10"><X size={24} /></button>

                        <div className="p-8">
                            <div className="flex items-center gap-3 text-purple-600 font-bold text-xl mb-8">
                                <GraduationCap size={32} />
                                <span>Student Registration</span>
                            </div>

                            <div className="flex gap-4 mb-8 bg-gray-50 p-1 rounded-xl">
                                <button
                                    onClick={() => setStudentModalTab('new')}
                                    className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all ${studentModalTab === 'new' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    New Student
                                </button>
                                <button
                                    onClick={() => setStudentModalTab('existing')}
                                    className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all ${studentModalTab === 'existing' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Existing Student
                                </button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const name = formData.get('name'); // Moved name here
                                const pin = formData.get('pin');
                                const email = formData.get('email'); // Only for new
                                const subject = formData.get('subject'); // Add subject

                                const existingStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];

                                if (studentModalTab === 'existing') {
                                    // Login Logic
                                    const student = existingStudents.find(s => s.name.toLowerCase() === name.toLowerCase());
                                    if (student) {
                                        // Check if student name is Sarah and PIN is 1234 (explicit request)
                                        if (student.name.toLowerCase() === 'sarah' && pin === '1234') {
                                            if (pendingBooking) {
                                                finalizeBooking('student', student);
                                            }
                                            setShowStudentBookingModal(false);
                                            navigate(`/student/${encodeURIComponent(student.name)}`);
                                            return;
                                        }

                                        const hashedInput = CryptoJS.SHA256(pin).toString();
                                        if (student.pin === hashedInput || student.pin === pin) {
                                            if (pendingBooking) {
                                                finalizeBooking('student', student);
                                            }
                                            setShowStudentBookingModal(false);
                                            navigate(`/student/${encodeURIComponent(student.name)}`);
                                        } else {
                                            setNotification({ type: 'error', message: 'Incorrect PIN.' });
                                        }
                                    } else {
                                        setNotification({ type: 'error', message: 'Student not found. Please check your name or create a new account.' });
                                    }
                                } else {
                                    // Signup Logic
                                    if (!name || !email || !pin) return;

                                    // Validate age selection
                                    if (isUnder16 === null) {
                                        setNotification({ type: 'error', message: 'Please confirm your age.' });
                                        return;
                                    }

                                    const parentEmail = formData.get('parentEmail');

                                    // Validate parent email for under-16 students
                                    if (isUnder16 && !parentEmail) {
                                        setNotification({ type: 'error', message: 'Parent/Guardian email is required for students under 16.' });
                                        return;
                                    }

                                    if (existingStudents.some(s => s.name.toLowerCase() === name.toLowerCase())) {
                                        setNotification({ type: 'error', message: 'A student with this name already exists. Please log in or use a different name.' });
                                        return;
                                    }

                                    const hashedPin = CryptoJS.SHA256(pin).toString();

                                    // Create parent account if student is under 16
                                    let parentId = null;
                                    if (isUnder16 && parentEmail) {
                                        const existingParents = JSON.parse(localStorage.getItem('tutor_parents')) || [];

                                        // Check if parent already exists
                                        let parent = existingParents.find(p => p.email.toLowerCase() === parentEmail.toLowerCase());

                                        if (!parent) {
                                            // Create new parent account
                                            parentId = Date.now() + Math.random(); // Unique ID
                                            const newParent = {
                                                id: parentId,
                                                email: parentEmail,
                                                pin: null,  // Set on first login
                                                firstLogin: true,
                                                linkedStudents: [],  // Will add student ID after creation
                                                createdAt: new Date().toISOString()
                                            };
                                            existingParents.push(newParent);
                                            localStorage.setItem('tutor_parents', JSON.stringify(existingParents));
                                        } else {
                                            // Parent exists, will link student to them
                                            parentId = parent.id;
                                        }
                                    }

                                    const newStudent = {
                                        id: Date.now(),
                                        name: name,
                                        email: email,
                                        parentEmail: isUnder16 ? parentEmail : null,
                                        parentId: parentId,
                                        isUnder16: isUnder16,
                                        pin: hashedPin,
                                        subject: subject || 'Not specified',
                                        sessionsCompleted: 0,
                                        totalSpent: 0,
                                        nextSession: null,
                                        status: 'Active'
                                    };

                                    // Link student to parent
                                    if (parentId) {
                                        const parents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
                                        const parentIndex = parents.findIndex(p => p.id === parentId);
                                        if (parentIndex !== -1) {
                                            if (!parents[parentIndex].linkedStudents.includes(newStudent.id)) {
                                                parents[parentIndex].linkedStudents.push(newStudent.id);
                                            }
                                            localStorage.setItem('tutor_parents', JSON.stringify(parents));
                                        }
                                    }

                                    const updatedStudents = [...existingStudents, newStudent];
                                    localStorage.setItem('tutor_students', JSON.stringify(updatedStudents));
                                    window.dispatchEvent(new Event('storage'));
                                    setShowStudentBookingModal(false);
                                    setIsUnder16(null); // Reset age state

                                    if (pendingBooking) {
                                        finalizeBooking('student', newStudent);
                                    }

                                    navigate(`/student/${encodeURIComponent(name)}`);
                                }
                            }}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Student Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            placeholder="e.g. Sarah Johnson"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
                                    </div>

                                    {studentModalTab === 'new' && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                            <select
                                                name="subject"
                                                required
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                                            >
                                                <option value="">Select a subject...</option>
                                                <option value="KS3 Maths">KS3 Maths</option>
                                                <option value="GCSE Maths">GCSE Maths</option>
                                                <option value="GCSE Sociology">GCSE Sociology</option>
                                                <option value="A-Level Sociology">A-Level Sociology</option>
                                            </select>
                                        </div>
                                    )}

                                    {studentModalTab === 'new' && (
                                        <>
                                            {/* Age Verification */}
                                            <div className="animate-in slide-in-from-top-2">
                                                <label className="block text-sm font-bold text-gray-700 mb-3">Age Verification</label>
                                                <div className="space-y-2">
                                                    <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${isUnder16 === false ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                                                        <input
                                                            type="radio"
                                                            name="age"
                                                            value="16plus"
                                                            checked={isUnder16 === false}
                                                            onChange={() => setIsUnder16(false)}
                                                            className="w-5 h-5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">I am 16 or older</span>
                                                    </label>
                                                    <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${isUnder16 === true ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                                                        <input
                                                            type="radio"
                                                            name="age"
                                                            value="under16"
                                                            checked={isUnder16 === true}
                                                            onChange={() => setIsUnder16(true)}
                                                            className="w-5 h-5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">I am under 16</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Student Email */}
                                            <div className="animate-in slide-in-from-top-2">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    required
                                                    placeholder="e.g. sarah@example.com"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                                <p className="text-xs text-gray-400 mt-1">For notifications and receipts</p>
                                            </div>

                                            {/* Conditional Parent Email Field */}
                                            {isUnder16 === true && (
                                                <div className="animate-in slide-in-from-top-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-xl">👨‍👩‍👧</span>
                                                        <label className="block text-sm font-bold text-gray-700">Parent/Guardian Email</label>
                                                    </div>
                                                    <input
                                                        type="email"
                                                        name="parentEmail"
                                                        required={isUnder16}
                                                        placeholder="e.g. parent@example.com"
                                                        className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                    />
                                                    <p className="text-xs text-blue-600 mt-2 flex items-start gap-1">
                                                        <span>ℹ️</span>
                                                        <span>Your parent will receive copies of all booking confirmations and payment receipts</span>
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            {studentModalTab === 'new' ? 'Create 4-Digit PIN' : 'Enter PIN'}
                                        </label>
                                        <input
                                            type="password"
                                            name="pin"
                                            required
                                            maxLength="4"
                                            pattern="[0-9]{4}"
                                            placeholder="••••"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-center text-2xl tracking-widest font-mono"
                                        />
                                    </div>

                                    {studentModalTab === 'new' && (
                                        <div className="space-y-3">
                                            {/* Parental Consent Checkbox (for under-16 only) */}
                                            {isUnder16 === true && (
                                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 animate-in slide-in-from-top-2">
                                                    <label className="flex items-start gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            required={isUnder16}
                                                            className="mt-1 w-5 h-5 text-orange-600 focus:ring-2 focus:ring-orange-500 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700 flex-1">
                                                            My parent/guardian consents to me using this platform and has reviewed the <a href="/privacy" className="text-purple-600 underline" target="_blank">Privacy Policy</a> and <a href="/terms" className="text-purple-600 underline" target="_blank">Terms of Service</a>.
                                                        </span>
                                                    </label>
                                                </div>
                                            )}

                                            {/* General Data Processing Consent (all ages) */}
                                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 animate-in slide-in-from-top-2">
                                                <label className="flex items-start gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        required
                                                        className="mt-1 w-5 h-5 text-purple-600 focus:ring-2 focus:ring-purple-500 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700 flex-1">
                                                        I consent to my data being processed in accordance with the Privacy Policy.
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className={`w-full py-3 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${studentModalTab === 'new' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-500 hover:bg-teal-600'
                                            }`}
                                    >
                                        {studentModalTab === 'new' ? 'Create Account & Book' : 'Log In to Dashboard'}
                                    </button>
                                </div>
                            </form>

                            <button
                                onClick={() => {
                                    setShowStudentBookingModal(false);
                                    setShowForgotPinModal(true);
                                }}
                                className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 font-semibold"
                            >
                                Forgot PIN?
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forgot PIN Modal */}
            {showForgotPinModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowForgotPinModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowForgotPinModal(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <span className="text-xl">×</span>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recover Your PIN</h2>
                        <p className="text-gray-500 mb-6">Enter your name and email to view your PIN</p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const name = formData.get('name');
                            const email = formData.get('email');

                            const existingStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
                            const student = existingStudents.find(s =>
                                s.name.toLowerCase() === name.toLowerCase() &&
                                s.email.toLowerCase() === email.toLowerCase()
                            );

                            if (student) {
                                setShowForgotPinModal(false);
                                setNotification({ type: 'success', message: `Your PIN is: ${student.pin}\n\nPlease save it somewhere safe!` });
                                setShowStudentBookingModal(true);
                            } else {
                                setNotification({ type: 'error', message: 'No account found with that name and email combination.' });
                            }
                        }}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. Sarah Johnson"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="e.g. sarah@example.com"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-400 mt-1">The email you used during signup</p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                            >
                                Recover PIN
                            </button>
                        </form>

                        <button
                            onClick={() => {
                                setShowForgotPinModal(false);
                                setShowStudentBookingModal(true);
                            }}
                            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
                        >
                            ← Back to Login
                        </button>
                    </div>
                </div>
            )}

            {/* Parent Login Modal */}
            {showParentLoginModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => { setShowParentLoginModal(false); setParentLoginStep('email'); }}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => { setShowParentLoginModal(false); setParentLoginStep('email'); }}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <span className="text-xl">×</span>
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User size={32} className="text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Parent Portal</h2>
                            <p className="text-gray-500 text-sm">
                                {parentLoginStep === 'email' && 'Enter your email to continue'}
                                {parentLoginStep === 'createPin' && 'Create your secure PIN'}
                                {parentLoginStep === 'enterPin' && 'Enter your PIN to log in'}
                            </p>
                        </div>

                        <div className="flex gap-4 mb-8 bg-gray-50 p-1 rounded-xl">
                            <button
                                onClick={() => setLoginType('existing')}
                                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${loginType === 'existing' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Existing Parent
                            </button>
                            <button
                                onClick={() => setLoginType('new')}
                                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${loginType === 'new' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                New Parent
                            </button>
                        </div>

                        {loginType === 'new' ? (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Create Parent Account</h2>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.target);
                                    const parentName = formData.get('parentName');
                                    const studentName = formData.get('studentName');
                                    const subject = formData.get('subject');
                                    const email = formData.get('email');
                                    const pin = formData.get('pin');

                                    if (!parentName || !studentName || !subject || !email || !pin) return;

                                    const existingParents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
                                    if (existingParents.some(p => p.email.toLowerCase() === email.toLowerCase())) {
                                        setNotification({ type: 'error', message: 'An account with this email already exists. Please log in.' });
                                        return;
                                    }

                                    // Create Parent
                                    const newParent = {
                                        id: Date.now(),
                                        name: parentName,
                                        email: email,
                                        pin: pin,
                                        linkedStudents: [],
                                        createdAt: new Date().toISOString()
                                    };

                                    const existingStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
                                    const existingStudent = existingStudents.find(s => s.name.toLowerCase() === studentName.toLowerCase());

                                    let targetStudent;
                                    let isNewStudent = false;

                                    if (existingStudent) {
                                        // Link to existing student
                                        targetStudent = {
                                            ...existingStudent,
                                            parentId: newParent.id,
                                            parentEmail: email
                                        };
                                        // Update in the list
                                        const studentIndex = existingStudents.findIndex(s => s.id === existingStudent.id);
                                        existingStudents[studentIndex] = targetStudent;
                                    } else {
                                        // Create Student
                                        isNewStudent = true;
                                        targetStudent = {
                                            id: Date.now() + 1,
                                            name: studentName,
                                            email: email, // Parent email as contact
                                            parentEmail: email,
                                            parentId: newParent.id,
                                            isUnder16: true, // Assumed for parent booking
                                            pin: CryptoJS.SHA256('0000').toString(), // Default PIN for student, parent manages
                                            subject: subject,
                                            sessionsCompleted: 0,
                                            totalSpent: 0,
                                            nextSession: null,
                                            status: 'Active'
                                        };
                                        existingStudents.push(targetStudent);
                                    }

                                    newParent.linkedStudents.push(targetStudent.id);

                                    // Save
                                    existingParents.push(newParent);
                                    localStorage.setItem('tutor_parents', JSON.stringify(existingParents));
                                    localStorage.setItem('tutor_students', JSON.stringify(existingStudents));

                                    window.dispatchEvent(new Event('storage'));

                                    // Auto Login
                                    setParentAccount(newParent);
                                    setShowParentLoginModal(false);

                                    if (pendingBooking) {
                                        finalizeBooking('parent', { ...newParent, name: targetStudent.name, id: targetStudent.id, parentId: newParent.id });
                                    }

                                    navigate(`/parent/${encodeURIComponent(email)}`);
                                    setNotification({ type: 'success', message: 'Account created and booking confirmed!' });
                                }}>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Parent Name</label>
                                        <input required name="parentName" type="text" placeholder="Your Name" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Student Name</label>
                                        <input required name="studentName" type="text" placeholder="Child's Name" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    {selectedSubject ? (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                            <div className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-700 font-bold flex items-center justify-between">
                                                <span>{selectedSubject}</span>
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full uppercase">Selected</span>
                                            </div>
                                            <input type="hidden" name="subject" value={selectedSubject} />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                            <select required name="subject" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                                                <option value="">Select a subject...</option>
                                                <option value="KS3 Maths">KS3 Maths</option>
                                                <option value="GCSE Maths">GCSE Maths</option>
                                                <option value="GCSE Sociology">GCSE Sociology</option>
                                                <option value="A-Level Sociology">A-Level Sociology</option>
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                        <input required name="email" type="email" placeholder="parent@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Create PIN (4 Digits)</label>
                                        <input required name="pin" type="text" maxLength="4" pattern="[0-9]{4}" placeholder="••••" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-center tracking-widest font-mono text-lg" />
                                        <p className="text-xs text-gray-400 mt-1">You'll use this to log in securely.</p>
                                    </div>

                                    <button type="submit" className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg mt-4">
                                        Create Account & Dashboard
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <>
                                {/* Step 1: Email Entry */}
                                {parentLoginStep === 'email' && (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        const email = formData.get('email');

                                        const existingParents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
                                        const parent = existingParents.find(p => p.email.toLowerCase() === email.toLowerCase());

                                        if (!parent) {
                                            setNotification({ type: 'error', message: 'No parent account found with this email. Please check your email or contact support.' });
                                            return;
                                        }

                                        setParentEmail(email);
                                        setParentAccount(parent);

                                        if (parent.firstLogin || !parent.pin) {
                                            setParentLoginStep('createPin');
                                        } else {
                                            setParentLoginStep('enterPin');
                                        }
                                    }}>
                                        <div className="mb-6">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Parent Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                placeholder="e.g. parent@example.com"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">The email you provided during your child's signup</p>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                                        >
                                            Continue
                                        </button>
                                    </form>
                                )}

                                {/* Step 2: Create PIN (First Login) */}
                                {parentLoginStep === 'createPin' && (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        const firstName = formData.get('firstName');
                                        const pin = formData.get('pin');
                                        const confirmPin = formData.get('confirmPin');

                                        if (!firstName) {
                                            setNotification({ type: 'error', message: 'Please enter your first name.' });
                                            return;
                                        }

                                        if (pin !== confirmPin) {
                                            setNotification({ type: 'error', message: 'PINs do not match. Please try again.' });
                                            return;
                                        }

                                        const hashedPin = CryptoJS.SHA256(pin).toString();

                                        const parents = JSON.parse(localStorage.getItem('tutor_parents')) || [];
                                        const parentIndex = parents.findIndex(p => p.email.toLowerCase() === parentEmail.toLowerCase());

                                        if (parentIndex !== -1) {
                                            parents[parentIndex].firstName = formatName(firstName);
                                            parents[parentIndex].pin = hashedPin;
                                            parents[parentIndex].firstLogin = false;
                                            localStorage.setItem('tutor_parents', JSON.stringify(parents));

                                            setShowParentLoginModal(false);
                                            setParentLoginStep('email');
                                            navigate(`/parent/${encodeURIComponent(parentEmail)}`);
                                        }
                                    }}>
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                                            <p className="text-sm text-blue-800">
                                                <strong>Welcome!</strong> This is your first time logging in. Please create a 4-digit PIN to secure your account.
                                            </p>
                                        </div>

                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    required
                                                    placeholder="e.g. Sarah"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Create 4-Digit PIN</label>
                                                <input
                                                    type="password"
                                                    name="pin"
                                                    required
                                                    maxLength="4"
                                                    pattern="[0-9]{4}"
                                                    placeholder="••••"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest font-mono"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Confirm PIN</label>
                                                <input
                                                    type="password"
                                                    name="confirmPin"
                                                    required
                                                    maxLength="4"
                                                    pattern="[0-9]{4}"
                                                    placeholder="••••"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest font-mono"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                                        >
                                            Create PIN & Continue
                                        </button>
                                    </form>
                                )}

                                {/* Step 3: Enter PIN (Returning Users) */}
                                {parentLoginStep === 'enterPin' && (
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        const pin = formData.get('pin');

                                        const hashedInput = CryptoJS.SHA256(pin).toString();

                                        if (parentAccount.pin === hashedInput || parentAccount.pin === pin) {
                                            if (pendingBooking) {
                                                const allStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];
                                                // Try to find the child
                                                const child = allStudents.find(s => parentAccount.linkedStudents?.includes(s.id));

                                                if (child) {
                                                    // Book for the child, pass the name explicitly to be safe
                                                    finalizeBooking('student', { ...child, name: child.name, parentId: parentAccount.id });
                                                } else {
                                                    // Fallback to parent booking
                                                    finalizeBooking('parent', { ...parentAccount, name: parentAccount.name || parentAccount.firstName });
                                                }
                                            }
                                            setShowParentLoginModal(false);
                                            setParentLoginStep('email');
                                            navigate(`/parent/${encodeURIComponent(parentEmail)}`);
                                        } else {
                                            setNotification({ type: 'error', message: 'Incorrect PIN. Please try again.' });
                                        }
                                    }}>
                                        <div className="mb-6">
                                            <p className="text-sm text-gray-600 mb-4">
                                                Welcome back! Please enter your PIN to access your parent portal.
                                            </p>

                                            <label className="block text-sm font-bold text-gray-700 mb-2">Enter Your PIN</label>
                                            <input
                                                type="password"
                                                name="pin"
                                                required
                                                maxLength="4"
                                                pattern="[0-9]{4}"
                                                placeholder="••••"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest font-mono"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                                        >
                                            Log In
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setParentLoginStep('email')}
                                            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            ← Use Different Email
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {notification && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setNotification(null)}>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {notification.type === 'error' ? <X size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <p className="text-gray-800 font-bold mb-6 text-lg whitespace-pre-wrap">{notification.message}</p>
                        <button
                            onClick={() => setNotification(null)}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                        >
                            Okay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
