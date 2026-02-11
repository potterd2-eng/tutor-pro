import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Cookie } from 'lucide-react';

const CookiePolicy = () => {
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
                    <Cookie size={48} className="text-purple-600" />
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Cookie Policy</h1>
                        <p className="text-gray-500">Last updated: February 2026</p>
                    </div>
                </div>

                <div className="prose prose-lg max-w-none space-y-8">
                    {/* Introduction */}
                    <section>
                        <p className="text-gray-700 leading-relaxed">
                            This Cookie Policy explains how <strong>Davina's Tutoring Platform</strong> uses browser storage technologies to provide our online tutoring services. We are committed to transparency about the data we store and your rights under UK GDPR and PECR regulations.
                        </p>
                    </section>

                    {/* What Are Cookies */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            What Are "Cookies" and Local Storage?
                        </h2>
                        <p className="text-gray-700 mt-4">
                            While we don't use traditional cookies, we use <strong>browser local storage</strong> – a similar technology that stores data directly in your browser. This allows us to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                            <li>Keep you logged in to your student dashboard</li>
                            <li>Remember your lesson bookings and payment history</li>
                            <li>Save your preferences and session data</li>
                            <li>Provide a seamless experience across browsing sessions</li>
                        </ul>
                    </section>

                    {/* What We Store */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            What Data We Store
                        </h2>
                        <div className="mt-4 space-y-4">
                            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-xl">
                                <h3 className="font-bold text-purple-900 mb-2">Essential Storage (Required for Service)</h3>
                                <ul className="text-purple-800 text-sm space-y-1">
                                    <li><strong>Student Account Data:</strong> Your name, email, encrypted PIN</li>
                                    <li><strong>Booking Information:</strong> Lesson dates, times, subjects, payment status</li>
                                    <li><strong>Payment Records:</strong> Transaction IDs, amounts, receipts (no card details)</li>
                                    <li><strong>Session History:</strong> Past lessons, notes, progress tracking</li>
                                    <li><strong>Consent Preference:</strong> Your cookie consent choice</li>
                                </ul>
                                <p className="text-xs text-purple-700 mt-3">
                                    <strong>Legal Basis:</strong> Contractual necessity (GDPR Article 6(1)(b)) – we need this data to provide tutoring services.
                                </p>
                            </div>

                            <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-xl">
                                <h3 className="font-bold text-gray-900 mb-2">We Do NOT Use:</h3>
                                <ul className="text-gray-700 text-sm space-y-1">
                                    <li>❌ Advertising or tracking cookies</li>
                                    <li>❌ Social media cookies</li>
                                    <li>❌ Third-party analytics cookies (e.g., Google Analytics)</li>
                                    <li>❌ Any non-essential cookies</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* How Long */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            How Long We Keep This Data
                        </h2>
                        <p className="text-gray-700 mt-4">
                            Data stored in your browser remains until:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                            <li><strong>You clear your browser data</strong> (manually or via browser settings)</li>
                            <li><strong>You delete your account</strong> via your dashboard settings</li>
                            <li><strong>You request deletion</strong> by emailing privacy@davinastutoring.co.uk</li>
                        </ul>
                        <p className="text-gray-700 mt-4">
                            Additionally, we maintain server-side backups according to the retention periods in our <a href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</a>:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>Student contact details: 1 year after last session</li>
                            <li>Session notes: 3 years after course completion</li>
                            <li>Payment records: 7 years (HMRC legal requirement)</li>
                        </ul>
                    </section>

                    {/* Managing Storage */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            How to Manage Your Stored Data
                        </h2>

                        <h3 className="font-bold text-gray-800 mt-4 text-xl">Option 1: Dashboard Settings</h3>
                        <p className="text-gray-700 mt-2">
                            From your student dashboard, you can:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                            <li>Download all your data (GDPR right to access)</li>
                            <li>Update your information</li>
                            <li>Request account deletion</li>
                        </ul>

                        <h3 className="font-bold text-gray-800 mt-6 text-xl">Option 2: Browser Settings</h3>
                        <p className="text-gray-700 mt-2">
                            You can clear local storage via your browser settings:
                        </p>
                        <div className="bg-gray-50 rounded-xl p-4 mt-3">
                            <div className="space-y-3 text-sm">
                                <div>
                                    <strong className="text-gray-900">Chrome:</strong>
                                    <p className="text-gray-600">Settings → Privacy and security → Clear browsing data → Cookies and other site data</p>
                                </div>
                                <div>
                                    <strong className="text-gray-900">Firefox:</strong>
                                    <p className="text-gray-600">Settings → Privacy & Security → Cookies and Site Data → Clear Data</p>
                                </div>
                                <div>
                                    <strong className="text-gray-900">Safari:</strong>
                                    <p className="text-gray-600">Preferences → Privacy → Manage Website Data → Remove All</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-red-700 mt-3 font-semibold">
                            ⚠️ Warning: Clearing browser data will log you out and remove all saved lesson/payment information from this device.
                        </p>

                        <h3 className="font-bold text-gray-800 mt-6 text-xl">Option 3: Email Request</h3>
                        <p className="text-gray-700 mt-2">
                            Email <a href="mailto:privacy@davinastutoring.co.uk" className="text-purple-600 hover:underline">privacy@davinastutoring.co.uk</a> to request complete data deletion across all systems.
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            Your Rights
                        </h2>
                        <p className="text-gray-700 mt-4">
                            Under UK GDPR, you have the right to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                            <li><strong>Withdraw consent:</strong> You can reject cookies at any time (though this limits platform functionality)</li>
                            <li><strong>Access your data:</strong> Download everything we store via your dashboard</li>
                            <li><strong>Rectify data:</strong> Update incorrect information</li>
                            <li><strong>Erase data:</strong> Request deletion (subject to legal retention requirements)</li>
                            <li><strong>Port data:</strong> Export your data in machine-readable format</li>
                        </ul>
                        <p className="text-gray-700 mt-4">
                            For full details, see our <a href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</a>.
                        </p>
                    </section>

                    {/* Changes to Policy */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                            Changes to This Policy
                        </h2>
                        <p className="text-gray-700 mt-4">
                            We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. Significant changes will be communicated via email to active students.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="bg-gradient-to-r from-purple-100 to-teal-100 border-2 border-purple-300 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions?</h2>
                        <p className="text-gray-800 mb-4">
                            If you have any questions about this Cookie Policy or how your data is stored, please contact:
                        </p>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <p className="text-gray-900">
                                <strong>Email:</strong> <a href="mailto:privacy@davinastutoring.co.uk" className="text-purple-600 hover:underline font-mono">privacy@davinastutoring.co.uk</a>
                            </p>
                            <p className="text-gray-700 mt-2">
                                <strong>Response Time:</strong> Within 7 working days
                            </p>
                        </div>
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

export default CookiePolicy;
