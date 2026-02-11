import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowLeft, Mail, AlertCircle } from 'lucide-react';

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 py-12 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
                {/* Header */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-bold mb-8 transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Home
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <Scale size={48} className="text-purple-600" />
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
                        <p className="text-gray-500">Last updated: February 2026</p>
                    </div>
                </div>

                <div className="prose prose-lg max-w-none space-y-8">
                    {/* Introduction */}
                    <section>
                        <p className="text-gray-700 leading-relaxed">
                            Welcome to <strong>Davina's Tutoring Platform</strong>. By booking a lesson or using this platform, you agree to these Terms of Service. Please read them carefully before booking.
                        </p>
                        <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-xl mt-4">
                            <p className="text-sm text-purple-800">
                                <strong>Important:</strong> If you are booking on behalf of a student under 16 years of age, you confirm that you are their parent or legal guardian and consent to the processing of their personal data as described in our <a href="/privacy" className="underline hover:text-purple-900">Privacy Policy</a>.
                            </p>
                        </div>
                    </section>

                    {/* Service Description */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            1. Service Description
                        </h2>
                        <p className="text-gray-700 mt-4">
                            Davina's Tutoring Platform provides:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                            <li>Online 1-on-1 tutoring sessions via video call</li>
                            <li>Subjects including Maths, English, Science, and other academic areas</li>
                            <li>Personalized lesson planning and progress tracking</li>
                            <li>Digital whiteboard and screen sharing tools</li>
                            <li>Session notes and homework assignments</li>
                        </ul>
                        <p className="text-gray-700 mt-4">
                            <strong>Tutor:</strong> All lessons are delivered by Davina, a qualified tutor with an Enhanced DBS check.
                        </p>
                    </section>

                    {/* Age Requirements */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            2. Age Requirements & Parental Consent
                        </h2>
                        <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded-r-xl mt-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-yellow-700 flex-shrink-0 mt-1" size={24} />
                                <div>
                                    <h3 className="font-bold text-yellow-900 mb-2">Data Protection Requirements (UK GDPR)</h3>
                                    <ul className="text-yellow-800 text-sm space-y-1">
                                        <li><strong>Students aged 16 and over:</strong> Can book and consent independently</li>
                                        <li><strong>Students aged 13-15:</strong> Require parental/guardian consent</li>
                                        <li><strong>Students under 13:</strong> Not eligible for this service</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-700 mt-4">
                            When booking a lesson for a student under 16, you (the parent/guardian) must:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>Provide accurate contact information</li>
                            <li>Consent to data processing as outlined in our Privacy Policy</li>
                            <li>Be responsible for payment and account management</li>
                        </ul>
                    </section>

                    {/* Booking & Scheduling */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            3. Booking & Scheduling
                        </h2>
                        <h3 className="font-bold text-gray-800 mt-4 text-xl">3.1 Free Consultation</h3>
                        <p className="text-gray-700 mt-2">
                            All new students receive a <strong>free 30-minute consultation</strong> to discuss goals, assess needs, and plan lessons. This is non-binding.
                        </p>

                        <h3 className="font-bold text-gray-800 mt-6 text-xl">3.2 Paid Lessons</h3>
                        <p className="text-gray-700 mt-2">
                            After the consultation, lessons can be booked as:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li><strong>Single sessions:</strong> £30 per hour</li>
                            <li><strong>10-session blocks:</strong> £280 (£28/session - save £20)</li>
                        </ul>

                        <h3 className="font-bold text-gray-800 mt-6 text-xl">3.3 Rescheduling</h3>
                        <p className="text-gray-700 mt-2">
                            You may reschedule a lesson with at least <strong>24 hours' notice</strong> at no charge. Reschedule requests can be made via:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>Your student dashboard</li>
                            <li>Email to the tutor</li>
                        </ul>
                    </section>

                    {/* Cancellation & Refunds */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            4. Cancellation & Refund Policy
                        </h2>

                        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl mt-4">
                            <h3 className="font-bold text-red-900 mb-2">14-Day Cooling-Off Period (Distance Selling Regulations)</h3>
                            <p className="text-red-800 text-sm">
                                As this is an online service, you have the right to cancel within <strong>14 days</strong> of your first payment and receive a full refund, <strong>unless</strong> you have already attended paid sessions (in which case only unused sessions are refunded).
                            </p>
                        </div>

                        <h3 className="font-bold text-gray-800 mt-6 text-xl">4.1 Cancellation by Student/Parent</h3>
                        <ul className="text-gray-700 space-y-3 mt-3">
                            <li>
                                <strong>24+ hours before lesson:</strong> Full credit to reschedule or refund (minus processing fees)
                            </li>
                            <li>
                                <strong>Less than 24 hours before lesson:</strong> No refund (lesson is forfeited)
                            </li>
                            <li>
                                <strong>Block bookings:</strong> Unused sessions can be refunded on a pro-rata basis (£28/session) if cancelled with 7+ days' notice
                            </li>
                        </ul>

                        <h3 className="font-bold text-gray-800 mt-6 text-xl">4.2 Cancellation by Tutor</h3>
                        <p className="text-gray-700 mt-2">
                            If I (Davina) need to cancel a lesson due to illness or emergency, you will be offered:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>A full refund, or</li>
                            <li>A rescheduled session at your convenience</li>
                        </ul>

                        <h3 className="font-bold text-gray-800 mt-6 text-xl">4.3 No-Shows</h3>
                        <p className="text-gray-700 mt-2">
                            If a student does not join a scheduled lesson within 15 minutes, the session is considered a no-show and the payment is forfeited.
                        </p>
                    </section>

                    {/* Payment Terms */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            5. Payment Terms
                        </h2>
                        <p className="text-gray-700 mt-4">
                            <strong>Payment Methods:</strong> We accept payments via Stripe (card payments) and Plaid (Open Banking).
                        </p>
                        <p className="text-gray-700 mt-2">
                            <strong>When Payment is Due:</strong>
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>Single sessions: Payment due before lesson begins</li>
                            <li>Block bookings: Full payment upfront or payment plan available (contact for details)</li>
                        </ul>
                        <p className="text-gray-700 mt-4">
                            <strong>Late Payments:</strong> Access to lessons and session materials will be suspended until payment is received.
                        </p>
                        <p className="text-gray-700 mt-4">
                            <strong>Receipts:</strong> You will receive an email receipt after each payment, which serves as your invoice for tax purposes.
                        </p>
                    </section>

                    {/* Conduct & Expectations */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            6. Student Conduct & Expectations
                        </h2>
                        <p className="text-gray-700 mt-4">
                            To maintain a productive learning environment, students must:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                            <li>Join sessions on time with a working camera and microphone</li>
                            <li>Treat the tutor with respect</li>
                            <li>Complete assigned homework and prepare for lessons</li>
                            <li>Not share session recordings or materials without permission</li>
                        </ul>
                        <p className="text-gray-700 mt-4">
                            <strong>Termination of Service:</strong> I reserve the right to terminate the tutoring relationship immediately without refund if a student engages in abusive, disruptive, or inappropriate behavior.
                        </p>
                    </section>

                    {/* Intellectual Property */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            7. Intellectual Property
                        </h2>
                        <p className="text-gray-700 mt-4">
                            All lesson materials, notes, worksheets, and content provided during sessions remain my intellectual property. Students may use these materials for personal study only and may not:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>Reproduce or distribute materials commercially</li>
                            <li>Share materials with non-enrolled students</li>
                            <li>Claim authorship of provided content</li>
                        </ul>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            8. Limitation of Liability
                        </h2>
                        <div className="bg-gray-50 border-l-4 border-gray-600 p-4 rounded-r-xl mt-4">
                            <p className="text-gray-800 text-sm">
                                While I strive to provide high-quality tutoring, I cannot guarantee specific academic outcomes (e.g., exam grades, university admission). Tutoring is one component of a student's education, and results depend on multiple factors including student effort, school instruction, and external circumstances.
                            </p>
                        </div>
                        <p className="text-gray-700 mt-4">
                            <strong>Technical Issues:</strong> I am not liable for service interruptions caused by internet outages, platform failures, or other technical issues beyond my control. Lessons affected by technical problems will be rescheduled at no additional charge.
                        </p>
                        <p className="text-gray-700 mt-4">
                            <strong>Maximum Liability:</strong> My total liability for any claim arising from these Terms is limited to the amount you paid for the specific lesson(s) in question.
                        </p>
                    </section>

                    {/* Privacy & Data Protection */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            9. Privacy & Data Protection
                        </h2>
                        <p className="text-gray-700 mt-4">
                            Your privacy is important. Please review our <a href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</a> and <a href="/cookie-policy" className="text-purple-600 hover:underline">Cookie Policy</a> to understand how we collect, use, and protect your data.
                        </p>
                        <p className="text-gray-700 mt-4">
                            Key points:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>We comply with UK GDPR and Data Protection Act 2018</li>
                            <li>You can access, update, or delete your data at any time</li>
                            <li>Payment records are retained for 7 years (HMRC requirement)</li>
                        </ul>
                    </section>

                    {/* Dispute Resolution */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            10. Dispute Resolution & Complaints
                        </h2>
                        <p className="text-gray-700 mt-4">
                            If you have a complaint or concern, please contact me first:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li><strong>Email:</strong> <a href="mailto:privacy@davinastutoring.co.uk" className="text-purple-600 hover:underline">privacy@davinastutoring.co.uk</a></li>
                            <li><strong>Response Time:</strong> Within 7 working days</li>
                        </ul>
                        <p className="text-gray-700 mt-4">
                            I am committed to resolving issues amicably. If we cannot reach an agreement, disputes may be escalated to the <a href="https://www.ombudsman.org.uk/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Ombudsman Services</a> or small claims court.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            11. Governing Law
                        </h2>
                        <p className="text-gray-700 mt-4">
                            These Terms are governed by the laws of <strong>England and Wales</strong>. Any legal disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
                        </p>
                    </section>

                    {/* Changes to Terms */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            12. Changes to These Terms
                        </h2>
                        <p className="text-gray-700 mt-4">
                            I may update these Terms from time to time. Changes will be posted on this page with an updated "Last updated" date. Significant changes will be communicated via email to active students.
                        </p>
                        <p className="text-gray-700 mt-4">
                            Continued use of the platform after changes constitutes acceptance of the updated Terms.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="bg-gradient-to-r from-purple-100 to-teal-100 border-2 border-purple-300 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About These Terms?</h2>
                        <p className="text-gray-800 mb-4">
                            If you have any questions about these Terms of Service, please contact:
                        </p>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <div className="flex items-center gap-3 mb-2">
                                <Mail size={24} className="text-purple-600" />
                                <strong className="text-gray-900">Email:</strong>
                                <a href="mailto:privacy@davinastutoring.co.uk" className="text-purple-600 hover:underline font-mono">
                                    privacy@davinastutoring.co.uk
                                </a>
                            </div>
                            <p className="text-gray-700 mt-2">
                                <strong>Response Time:</strong> Within 7 working days
                            </p>
                        </div>
                    </section>

                    {/* Acceptance */}
                    <section className="bg-purple-50 border-2 border-purple-600 rounded-xl p-6">
                        <h3 className="font-bold text-purple-900 text-lg mb-3">By Using This Platform, You Agree:</h3>
                        <ul className="text-purple-800 space-y-2">
                            <li>✅ You have read and understood these Terms of Service</li>
                            <li>✅ You are 16+ or have parental/guardian consent if aged 13-15</li>
                            <li>✅ You agree to the cancellation and payment policies</li>
                            <li>✅ You accept the limitation of liability</li>
                        </ul>
                    </section>
                </div>

                {/* Back Button */}
                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={20} /> Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
