import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Removed react-calendly to avoid install issues
import {
    Calendar, CheckCircle, ChevronDown, ChevronRight, Clock, Copy, CreditCard,
    Facebook, GraduationCap, Instagram, Linkedin, LogIn, Mail, Menu, MessageSquare,
    Phone, Star, Twitter, User, Users, Video, X, BookOpen, Shield, ArrowRight
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import profilePic from '../assets/profile.jpg'; // Import profile picture
import { emailService } from '../utils/email';

const LandingPage = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false);
    const [showStudentBookingModal, setShowStudentBookingModal] = useState(false);
    const [studentModalTab, setStudentModalTab] = useState('existing'); // 'new' or 'existing'
    const [showForgotPinModal, setShowForgotPinModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showAllReviews, setShowAllReviews] = useState(false);

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
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xl cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
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
                            onClick={() => setShowLoginModal(true)}
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
                                                <Video size={20} className="text-teal-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">Book First Lesson</div>
                                                <div className="text-xs text-gray-500">1-hour paid session - £30</div>
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
                                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                <Star size={20} className="text-orange-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">Book 10 Hour Lesson Block</div>
                                                <div className="text-xs text-gray-500">Save £20 - Total £280</div>
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
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-brand-navy">
                        Master Your Subjects with <br /> Expert Personal Tutoring
                    </h1>
                    <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
                        Personalized learning plans, interactive online sessions, and proven results.
                        Unlock your full potential today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => scrollToSection('booking')}
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
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { icon: Star, label: "5-Star Reviews", val: "50+" },
                        { icon: BookOpen, label: "Subjects", val: "Maths & Sociology (KS3 - A-Level)" },
                        { icon: Clock, label: "Tutoring Hours", val: "550+" },
                        { icon: Shield, label: "DBS Checked", val: "Verified" },
                    ].map((s, i) => (
                        <div key={i} className="space-y-2">
                            <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-purple-600">
                                <s.icon size={24} />
                            </div>
                            <h3 className="text-3xl font-bold text-brand-navy">{s.val}</h3>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

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
                        <h3 className="text-4xl font-bold text-brand-navy mb-6">Expert Guidance, <br />Personalized for You.</h3>
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
                        <h3 className="text-4xl font-bold text-brand-navy">What My Students Say</h3>

                        {/* Decimal decoration */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-100 rounded-full blur-[60px] opacity-60 -z-10"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Hardcoded Sample Reviews + Dynamic Reviews */}
                        {[
                            {
                                id: 'sample-1',
                                studentName: 'James L.',
                                rating: 5,
                                comment: "Davina helped me move from a Grade 4 to a Grade 7 in Maths! Her explanations make everything so much clearer efficiently.",
                                subject: "GCSE Maths"
                            },
                            {
                                id: 'sample-2',
                                studentName: 'Sarah K.',
                                rating: 5,
                                comment: "Sociology was a mystery to me until I started lessons here. Now I'm confident for my A-Levels. Highly recommended!",
                                subject: "A-Level Sociology"
                            },
                            {
                                id: 'sample-3',
                                studentName: 'Michael R.',
                                rating: 5,
                                comment: "The interactive whiteboard makes online lessons feel just like being in the same room. Really professional setup.",
                                subject: "KS3 Maths"
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
                    <h2 className="text-4xl font-bold mb-6 text-brand-navy">Ready to Get Started?</h2>
                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                        Book a free 15-minute consultation to discuss your goals. Alternatively, existing students can book their next session directly below.
                    </p>

                    {/* Custom Booking Grid */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mx-auto max-w-4xl min-h-[400px] p-8">
                        <BookingGrid />
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
                        <h3 className="text-4xl font-bold text-brand-navy">Everything You Need to Know</h3>
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
                    <span className="opacity-50">
                        GDPR Compliance: Data collected is used solely for booking purposes.
                        Contact us to request data deletion.
                    </span>
                </div>
            </footer>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowLoginModal(false)}>
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
                        </div>
                    </div>
                </div>
            )}

            {/* Student Booking Modal (Auth Split) */}
            {showStudentBookingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowStudentBookingModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowStudentBookingModal(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <span className="text-xl">×</span>
                        </button>

                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Student Portal</h2>
                            <p className="text-gray-500 text-sm">Access your interactive dashboard</p>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                            <button
                                onClick={() => setStudentModalTab('new')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${studentModalTab === 'new' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                New Student
                            </button>
                            <button
                                onClick={() => setStudentModalTab('existing')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${studentModalTab === 'existing' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Existing Student
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const name = formData.get('name');
                            const pin = formData.get('pin');
                            const email = formData.get('email'); // Only for new

                            const existingStudents = JSON.parse(localStorage.getItem('tutor_students')) || [];

                            if (studentModalTab === 'existing') {
                                // Login Logic
                                const student = existingStudents.find(s => s.name.toLowerCase() === name.toLowerCase());
                                if (student) {
                                    // Check if student name is Sarah and PIN is 1234 (explicit request)
                                    if (student.name.toLowerCase() === 'sarah' && pin === '1234') {
                                        setShowStudentBookingModal(false);
                                        navigate(`/student/${encodeURIComponent(student.name)}`);
                                        return;
                                    }

                                    const hashedInput = CryptoJS.SHA256(pin).toString();
                                    if (student.pin === hashedInput || student.pin === pin) {
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

                                if (existingStudents.some(s => s.name.toLowerCase() === name.toLowerCase())) {
                                    setNotification({ type: 'error', message: 'A student with this name already exists. Please log in or use a different name.' });
                                    return;
                                }

                                const hashedPin = CryptoJS.SHA256(pin).toString();
                                const newStudent = {
                                    id: Date.now(),
                                    name: name,
                                    email: email,
                                    pin: hashedPin,
                                    subject: 'Not specified',
                                    sessionsCompleted: 0,
                                    totalSpent: 0,
                                    nextSession: null,
                                    status: 'Active'
                                };
                                const updatedStudents = [...existingStudents, newStudent];
                                localStorage.setItem('tutor_students', JSON.stringify(updatedStudents));
                                window.dispatchEvent(new Event('storage'));
                                setShowStudentBookingModal(false);
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

// Booking Grid Component
const BookingGrid = () => {
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingName, setBookingName] = useState('');
    const [bookingEmail, setBookingEmail] = useState('');
    const [bookingSubject, setBookingSubject] = useState('');
    const [bookingFor, setBookingFor] = useState('pupil'); // 'pupil' or 'parent'
    const [gdprConsent, setGdprConsent] = useState(false);

    const [confirmationData, setConfirmationData] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // Default Schedule (matches Teacher Dashboard defaults)
    const defaultSchedule = [
        { day: 'Monday', intervals: [{ start: '09:00', end: '15:00' }, { start: '18:45', end: '20:00' }], active: true },
        { day: 'Tuesday', intervals: [{ start: '18:00', end: '20:00' }], active: true },
        { day: 'Wednesday', intervals: [{ start: '13:00', end: '16:00' }], active: true },
        { day: 'Thursday', intervals: [{ start: '09:00', end: '16:00' }, { start: '19:00', end: '20:00' }], active: true },
        { day: 'Friday', intervals: [{ start: '09:00', end: '12:00' }, { start: '18:00', end: '20:00' }], active: true },
        { day: 'Saturday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
        { day: 'Sunday', intervals: [{ start: '09:00', end: '18:00' }], active: true },
    ];

    // Load slots
    useEffect(() => {
        const loadSlots = () => {
            const schedule = JSON.parse(localStorage.getItem('tutor_weekly_schedule')) || defaultSchedule;
            const manualSlots = JSON.parse(localStorage.getItem('tutor_slots')) || [];
            const manualLessonSlots = JSON.parse(localStorage.getItem('tutor_lesson_slots')) || [];
            const bookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');

            const generated = [];
            const today = new Date();

            // 1. Generate from Weekly Schedule (Next 30 days)
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

                const dayRule = schedule.find(s => s.day === dayName);
                if (dayRule && dayRule.active) {
                    if (dayRule.intervals) {
                        dayRule.intervals.forEach(interval => {
                            let current = new Date(date.toDateString() + ' ' + interval.start);
                            const end = new Date(date.toDateString() + ' ' + interval.end);
                            while (current < end) {
                                const timeStr = current.toTimeString().slice(0, 5);
                                const dateStr = date.toISOString().split('T')[0];
                                const slotId = `${dateStr}-${timeStr}`;
                                if (current > new Date()) {
                                    generated.push({ id: slotId, date: dateStr, time: timeStr, type: 'weekly' });
                                }
                                current.setMinutes(current.getMinutes() + 15);
                            }
                        });
                    } else if (dayRule.start && dayRule.end) {
                        let current = new Date(date.toDateString() + ' ' + dayRule.start);
                        const end = new Date(date.toDateString() + ' ' + dayRule.end);
                        while (current < end) {
                            const timeStr = current.toTimeString().slice(0, 5);
                            const dateStr = date.toISOString().split('T')[0];
                            const slotId = `${dateStr}-${timeStr}`;
                            if (current > new Date()) {
                                generated.push({ id: slotId, date: dateStr, time: timeStr, type: 'weekly' });
                            }
                            current.setMinutes(current.getMinutes() + 15);
                        }
                    }
                }
            }

            // 2. Add Manual 15m Slots
            manualSlots.forEach(slot => {
                const slotId = `${slot.date}-${slot.time}`;
                if (!generated.some(g => g.id === slotId) && !slot.bookedBy && new Date(slot.date + 'T' + slot.time) > new Date()) {
                    generated.push({ id: slotId, date: slot.date, time: slot.time, type: 'manual' });
                }
            });

            // 2b. Add Manual 1-Hour Lesson Slots (Treat as 4 x 15min slots for landing grid)
            manualLessonSlots.forEach(slot => {
                const dateStr = slot.date;
                const timeStr = slot.time;
                let current = new Date(dateStr + 'T' + timeStr);

                // If the slot is already booked in lessonSlots metadata, we skip adding it here (handled by bookings filter later anyway, but cleaner)
                if (slot.bookedBy) return;

                for (let i = 0; i < 4; i++) {
                    const t = current.toTimeString().slice(0, 5);
                    const slotId = `${dateStr}-${t}`;
                    if (!generated.some(g => g.id === slotId) && current > new Date()) {
                        generated.push({ id: slotId, date: dateStr, time: t, type: 'manual-lesson' });
                    }
                    current.setMinutes(current.getMinutes() + 15);
                }
            });

            // 3. Filter Booked Slots & Check for Overlaps
            const activeBookings = bookings.filter(b => b.status !== 'cancelled');

            const finalSlots = generated.filter(slot => {
                const slotTime = new Date(`${slot.date}T${slot.time}`);

                // Check for ANY booking that overlaps with this 15-min slot
                const overlap = activeBookings.find(b => {
                    if (b.date !== slot.date) return false;

                    const bookingStart = new Date(`${b.date}T${b.time}`);
                    // Lessons are 60 mins, Consultations (assumed if not lesson) are 15 mins
                    const duration = b.type === 'lesson' || b.student ? 60 : 15;
                    const bookingEnd = new Date(bookingStart.getTime() + duration * 60000);

                    return slotTime >= bookingStart && slotTime < bookingEnd;
                });

                return !overlap;
            });

            setAvailableSlots(finalSlots);
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

    const openBookingModal = (slot) => {
        setSelectedSlot(slot);
        setShowBookingModal(true);
    };

    const confirmBooking = (e) => {
        e.preventDefault();
        if (!selectedSlot || !bookingName || !bookingEmail || !bookingSubject || !gdprConsent) return;

        // Generate Meeting Link (Simulated)
        const bookingId = selectedSlot.id || 'consult-' + Date.now().toString(36);
        const meetingLink = `${window.location.origin}/session/${bookingId}?host=false&name=${encodeURIComponent(bookingName)}`;

        const newBooking = {
            id: bookingId,
            date: selectedSlot.date,
            time: selectedSlot.time,
            student: bookingName,
            email: bookingEmail,
            subject: bookingSubject,
            bookingFor: bookingFor, // 'pupil' or 'parent'
            type: 'lesson', // Changed from consultation to lesson for paid booking
            meetingLink: meetingLink,
            bookedAt: new Date().toISOString(),
            paymentStatus: 'Due',
            cost: 30, // Default lesson cost
            status: 'confirmed'
        };

        const bookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
        bookings.push(newBooking);
        localStorage.setItem('tutor_bookings', JSON.stringify(bookings));
        window.dispatchEvent(new Event('storage'));

        // Close Booking Modal
        setShowBookingModal(false);

        // Send Confirmation Email (Async)
        emailService.sendConfirmation(newBooking).catch(err => {
            console.error('Email confirmation error:', err);
        });

        // Show Confirmation Modal (Instead of Redirect)
        setConfirmationData({
            ...newBooking,
            link: meetingLink
        });

        // Reset Form
        setBookingName('');
        setBookingEmail('');
        setBookingSubject('');
        setGdprConsent(false);
    };

    if (availableSlots.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>No available slots found for the next 30 days.</p>
                <p className="text-sm">Please check back later or contact me directly.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[500px] md:h-[500px]">
            {/* Calendar / Date List */}
            <div className="md:w-1/3 overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-bold text-gray-400 uppercase text-xs mb-3 sticky top-0 bg-brand-light py-2">Select Date</h3>
                <div className="space-y-2">
                    {sortedDates.map(date => {
                        const d = new Date(date);
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                        const isSelected = selectedDay === date;

                        return (
                            <button
                                key={date}
                                onClick={() => setSelectedDay(date)}
                                className={`w-full p-4 rounded-xl text-left transition-all border-2 ${isSelected ? 'border-purple-600 bg-purple-50 text-purple-900' : 'border-white bg-white hover:border-purple-100'}`}
                            >
                                <div className="font-bold text-sm uppercase text-gray-400">{dayName}</div>
                                <div className="font-extrabold text-xl text-gray-800">
                                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-xs text-purple-600 font-bold mt-1">
                                    {slotsByDate[date].length >= 50 ? '50+' : slotsByDate[date].length} Slots
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slots */}
            <div className="md:w-2/3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                {selectedDay ? (
                    <>
                        <h3 className="font-bold text-gray-800 text-xl mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-purple-600" />
                            {new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                            {slotsByDate[selectedDay].sort((a, b) => a.time.localeCompare(b.time)).map(slot => (
                                <button
                                    key={slot.id}
                                    onClick={() => openBookingModal(slot)}
                                    className="py-2 px-1 rounded-lg border border-gray-200 hover:border-purple-600 hover:bg-purple-600 hover:text-white transition-all text-sm font-bold text-gray-700"
                                >
                                    {new Date('2000-01-01T' + slot.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <Calendar size={64} className="mb-4 opacity-20" />
                        <p>Select a date to view times</p>
                    </div>
                )}
            </div>

            {/* Booking Modal */}
            {showBookingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setShowBookingModal(false)}>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirm Consultation</h2>
                        <p className="text-gray-500 mb-6">Free 15-minute chat on {selectedSlot && new Date(selectedSlot.date).toLocaleDateString()} at {selectedSlot && selectedSlot.time}</p>

                        <form onSubmit={confirmBooking} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Your Name</label>
                                <input required type="text" value={bookingName} onChange={e => setBookingName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-purple-500 outline-none" placeholder="Jane Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
                                <input required type="email" value={bookingEmail} onChange={e => setBookingEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-purple-500 outline-none" placeholder="jane@example.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Topic / Subject</label>
                                <input required type="text" value={bookingSubject} onChange={e => setBookingSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-purple-500 outline-none" placeholder="KS3 Maths Help" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Booking For</label>
                                <div className="flex gap-3">
                                    <label className="flex-1 flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all hover:border-purple-300 ${bookingFor === 'pupil' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-gray-50'}">
                                        <input
                                            type="radio"
                                            name="bookingFor"
                                            value="pupil"
                                            checked={bookingFor === 'pupil'}
                                            onChange={e => setBookingFor(e.target.value)}
                                            className="w-4 h-4 text-purple-600"
                                        />
                                        <span className="text-sm font-bold text-gray-700">Pupil</span>
                                    </label>
                                    <label className="flex-1 flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all hover:border-purple-300 ${bookingFor === 'parent' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-gray-50'}">
                                        <input
                                            type="radio"
                                            name="bookingFor"
                                            value="parent"
                                            checked={bookingFor === 'parent'}
                                            onChange={e => setBookingFor(e.target.value)}
                                            className="w-4 h-4 text-purple-600"
                                        />
                                        <span className="text-sm font-bold text-gray-700">Parent</span>
                                    </label>
                                </div>
                            </div>

                            <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                <input type="checkbox" required checked={gdprConsent} onChange={e => setGdprConsent(e.target.checked)} className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                                <span className="text-xs text-gray-600 leading-tight">
                                    I agree to my data being processed for this booking. Data is stored locally for this demo and shared with the tutor via email.
                                </span>
                            </label>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowBookingModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-all text-sm">
                                    Confirm Free Booking
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success / Confirmation Modal */}
            {confirmationData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-8" onClick={() => setConfirmationData(null)}>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
                        <p className="text-gray-500 mb-6">
                            Thanks {confirmationData.student}! Your consultation is set for <strong>{new Date(confirmationData.date).toLocaleDateString()} at {confirmationData.time}</strong>.
                        </p>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left">
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Meeting Link</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-white border border-gray-200 p-2 rounded text-sm text-purple-600 truncate">
                                    {confirmationData.link}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(confirmationData.link);
                                        setCopySuccess(true);
                                        setTimeout(() => setCopySuccess(false), 2000);
                                    }}
                                    className="p-2 hover:bg-gray-200 rounded text-gray-500 flex items-center gap-1"
                                    title="Copy Link"
                                >
                                    {copySuccess ? <span className="text-green-600 text-xs font-bold animate-in fade-in">Copied!</span> : <Copy size={18} />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <Mail size={12} /> Email sent to {confirmationData.email}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <a
                                href={confirmationData.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <Video size={18} /> Join Meeting Now (Test)
                            </a>
                            <button
                                onClick={() => setConfirmationData(null)}
                                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
