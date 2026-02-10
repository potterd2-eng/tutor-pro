import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Mail, Clock, Trash2, Download } from 'lucide-react';

const PrivacyPolicy = () => {
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
                    <Shield size={48} className="text-purple-600" />
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
                        <p className="text-gray-500">Last updated: February 2026</p>
                    </div>
                </div>

                <div className="prose prose-lg max-w-none space-y-8">
                    {/* Introduction */}
                    <section>
                        <p className="text-gray-700 leading-relaxed">
                            At <strong>Davina's Tutoring Platform</strong>, your privacy is paramount. This policy explains what data I collect,
                            why I collect it, how long I keep it, and your rights under the <strong>UK GDPR and Data Protection Act 2018</strong>.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            As a sole trader, I (Davina) am the data controller. For any questions or requests, please contact me at:
                        </p>
                        <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-xl mt-4">
                            <div className="flex items-center gap-2 text-purple-900 font-bold">
                                <Mail size={20} />
                                privacy@davinastutoring.co.uk
                            </div>
                            <p className="text-sm text-purple-700 mt-1">Response time: Within 7 working days</p>
                        </div>
                    </section>

                    {/* What Data I Collect */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <span className="text-3xl">📋</span> What Data I Collect
                        </h2>
                        <div className="space-y-4 mt-4">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-800 mb-2">Personal Information</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li><strong>Name:</strong> To identify you and personalize your dashboard</li>
                                    <li><strong>Email address:</strong> For booking confirmations, lesson reminders, and PIN recovery</li>
                                    <li><strong>Account PIN:</strong> Securely hashed (encrypted) for dashboard access</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-800 mb-2">Educational Data</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li><strong>Session notes:</strong> Topics covered, progress updates, homework assignments</li>
                                    <li><strong>Session history:</strong> Dates, times, subjects of past lessons</li>
                                    <li><strong>Subject/Grade level:</strong> To tailor teaching approach</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-800 mb-2">Payment Information</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li><strong>Payment tokens:</strong> Encrypted references from Plaid (Open Banking) or Stripe</li>
                                    <li><strong>Transaction records:</strong> Amount, date, payment status (for invoicing and HMRC compliance)</li>
                                    <li><strong>Note:</strong> I never see or store your bank account details or card numbers</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-800 mb-2">Technical Data</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                    <li><strong>IP address:</strong> Logged for security and audit purposes (6-month retention)</li>
                                    <li><strong>Browser/device info:</strong> For technical support and compatibility</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Why I Collect It */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <span className="text-3xl">🎯</span> Why I Collect This Data
                        </h2>
                        <div className="mt-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="text-xl">✅</span>
                                <div>
                                    <strong className="text-gray-800">Providing tutoring services:</strong>
                                    <p className="text-gray-600">To schedule lessons, track progress, and personalize teaching</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">✅</span>
                                <div>
                                    <strong className="text-gray-800">Payment processing:</strong>
                                    <p className="text-gray-600">To handle secure payments and generate invoices</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">✅</span>
                                <div>
                                    <strong className="text-gray-800">Legal compliance:</strong>
                                    <p className="text-gray-600">HMRC requires 7-year retention of financial records</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">✅</span>
                                <div>
                                    <strong className="text-gray-800">Security:</strong>
                                    <p className="text-gray-600">Audit logging protects against unauthorized access</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* How Long I Keep It */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <Clock size={32} className="text-purple-600" /> Data Retention Periods
                        </h2>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-purple-100">
                                    <tr>
                                        <th className="border border-purple-200 px-4 py-3 text-left font-bold text-gray-800">Data Type</th>
                                        <th className="border border-purple-200 px-4 py-3 text-left font-bold text-gray-800">Retention Period</th>
                                        <th className="border border-purple-200 px-4 py-3 text-left font-bold text-gray-800">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                    <tr className="hover:bg-purple-50">
                                        <td className="border border-gray-200 px-4 py-3">Student contact details (name, email, PIN)</td>
                                        <td className="border border-gray-200 px-4 py-3 font-semibold text-purple-700">1 year after last session</td>
                                        <td className="border border-gray-200 px-4 py-3">Allows re-booking while respecting inactivity</td>
                                    </tr>
                                    <tr className="hover:bg-purple-50">
                                        <td className="border border-gray-200 px-4 py-3">Session notes & progress reports</td>
                                        <td className="border border-gray-200 px-4 py-3 font-semibold text-purple-700">3 years after course completion</td>
                                        <td className="border border-gray-200 px-4 py-3">Reference for future students; dispute resolution</td>
                                    </tr>
                                    <tr className="hover:bg-purple-50">
                                        <td className="border border-gray-200 px-4 py-3">Payment records & tokens</td>
                                        <td className="border border-gray-200 px-4 py-3 font-semibold text-purple-700">7 years</td>
                                        <td className="border border-gray-200 px-4 py-3 font-bold text-red-700">HMRC legal requirement</td>
                                    </tr>
                                    <tr className="hover:bg-purple-50">
                                        <td className="border border-gray-200 px-4 py-3">Consultation inquiries (no booking made)</td>
                                        <td className="border border-gray-200 px-4 py-3 font-semibold text-purple-700">6 months</td>
                                        <td className="border border-gray-200 px-4 py-3">Follow-up opportunity; then deleted</td>
                                    </tr>
                                    <tr className="hover:bg-purple-50">
                                        <td className="border border-gray-200 px-4 py-3">Audit logs (IP, access records)</td>
                                        <td className="border border-gray-200 px-4 py-3 font-semibold text-purple-700">6 months</td>
                                        <td className="border border-gray-200 px-4 py-3">Security monitoring; GDPR accountability</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-gray-600 mt-4">
                            <strong>Automatic deletion:</strong> Data is permanently erased from all systems (including backups) once retention periods expire.
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <span className="text-3xl">⚖️</span> Your Rights Under GDPR
                        </h2>
                        <div className="mt-4 space-y-4">
                            <div className="bg-teal-50 border-l-4 border-teal-600 p-4 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                    <Download size={24} className="text-teal-700 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-bold text-teal-900">Right to Access (Article 15)</h3>
                                        <p className="text-teal-800 text-sm mt-1">
                                            You can download all your data anytime from your dashboard via the "Download My Data" button.
                                            You'll receive a JSON file with all information I hold about you.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                    <Trash2 size={24} className="text-red-700 mt-1 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-bold text-red-900">Right to Erasure / "Right to be Forgotten" (Article 17)</h3>
                                        <p className="text-red-800 text-sm mt-1">
                                            You can request deletion of your account and all associated data at any time by emailing
                                            <strong> privacy@davinastutoring.co.uk</strong>. I will verify your identity (name + email + PIN)
                                            and permanently delete your data within <strong>30 days</strong>.
                                        </p>
                                        <p className="text-red-800 text-sm mt-2 font-semibold">
                                            Exception: Payment records must be retained for 7 years (HMRC legal requirement).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl mt-1 flex-shrink-0">📝</span>
                                    <div>
                                        <h3 className="font-bold text-purple-900">Right to Rectification (Article 16)</h3>
                                        <p className="text-purple-800 text-sm mt-1">
                                            You can update your name or email anytime from your dashboard settings.
                                            For session note corrections, email me with details.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 border-l-4 border-gray-600 p-4 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl mt-1 flex-shrink-0">📦</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Right to Data Portability (Article 20)</h3>
                                        <p className="text-gray-800 text-sm mt-1">
                                            The "Download My Data" feature provides your data in machine-readable JSON format,
                                            which you can import to another tutoring platform.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded-r-xl">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl mt-1 flex-shrink-0">🚨</span>
                                    <div>
                                        <h3 className="font-bold text-yellow-900">Right to Lodge a Complaint (Article 77)</h3>
                                        <p className="text-yellow-800 text-sm mt-1">
                                            If you're unhappy with how I've handled your data, you can complain to the
                                            <strong> Information Commissioner's Office (ICO)</strong>:
                                        </p>
                                        <ul className="text-yellow-800 text-sm mt-2 space-y-1">
                                            <li>• Website: <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer" className="underline">ico.org.uk/make-a-complaint</a></li>
                                            <li>• Phone: 0303 123 1113</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Data Deletion Process */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <Trash2 size={32} className="text-red-600" /> How to Request Data Deletion
                        </h2>
                        <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-6">
                            <h3 className="font-bold text-red-900 text-lg mb-4">Step-by-Step Process:</h3>
                            <ol className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                                    <div className="text-gray-800">
                                        <strong>Email me at:</strong> <span className="text-red-700 font-mono">privacy@davinastutoring.co.uk</span>
                                        <p className="text-sm text-gray-600 mt-1">Subject line: "Data Deletion Request"</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                                    <div className="text-gray-800">
                                        <strong>Include:</strong> Your full name, registered email, and account PIN
                                        <p className="text-sm text-gray-600 mt-1">This verifies your identity</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                                    <div className="text-gray-800">
                                        <strong>I will verify</strong> your details within 7 working days
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</span>
                                    <div className="text-gray-800">
                                        <strong>Permanent deletion</strong> from all systems (including backups) within 30 days
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">5</span>
                                    <div className="text-gray-800">
                                        <strong>You receive</strong> a confirmation email once deletion is complete
                                    </div>
                                </li>
                            </ol>
                            <p className="text-sm text-red-800 mt-4 font-semibold">
                                ⚠️ Payment records will be anonymized (name/email removed) but kept for 7 years per HMRC requirements.
                            </p>
                        </div>
                    </section>

                    {/* Data Security */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <Shield size={32} className="text-purple-600" /> How I Protect Your Data
                        </h2>
                        <div className="mt-4 space-y-3 text-gray-700">
                            <div className="flex items-start gap-3">
                                <span className="text-xl">🔐</span>
                                <p><strong>Encryption:</strong> PINs are hashed (not stored in plain text), payment tokens are encrypted at rest</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">🔒</span>
                                <p><strong>HTTPS:</strong> All data transmitted over secure SSL/TLS connections</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">🛡️</span>
                                <p><strong>Access Control:</strong> Only I (Davina, sole operator) have access. I use strong passwords + 2FA on all accounts</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">📊</span>
                                <p><strong>Audit Logging:</strong> All data access is logged for 6 months to detect unauthorized access</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">💻</span>
                                <p><strong>Device Security:</strong> My work laptop has full-disk encryption (FileVault/BitLocker) and up-to-date antivirus</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-xl">☁️</span>
                                <p><strong>GDPR-Compliant Hosting:</strong> Data stored on EU servers (Supabase/Netlify) compliant with UK GDPR</p>
                            </div>
                        </div>
                    </section>

                    {/* Third Parties */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <span className="text-3xl">🤝</span> Third-Party Services
                        </h2>
                        <p className="text-gray-700 mt-4">
                            I use the following trusted providers (all GDPR-compliant):
                        </p>
                        <ul className="mt-3 space-y-2">
                            <li className="flex items-start gap-3">
                                <strong className="text-purple-700 min-w-[120px]">Plaid:</strong>
                                <span className="text-gray-700">Secure Open Banking payments (they only handle bank authorization, not storage)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <strong className="text-purple-700 min-w-[120px]">Stripe:</strong>
                                <span className="text-gray-700">Card payment processing (they store encrypted payment methods, I only receive transaction confirmations)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <strong className="text-purple-700 min-w-[120px]">Supabase:</strong>
                                <span className="text-gray-700">Database hosting (EU servers, encrypted backups)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <strong className="text-purple-700 min-w-[120px]">Netlify:</strong>
                                <span className="text-gray-700">Website hosting with automatic HTTPS</span>
                            </li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-4">
                            I <strong>never</strong> sell or share your data with marketers or advertisers.
                        </p>
                    </section>

                    {/* Policy Updates */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 border-b-2 border-purple-200 pb-3">
                            <span className="text-3xl">🔄</span> Policy Updates
                        </h2>
                        <p className="text-gray-700 mt-4">
                            This policy is reviewed annually (next review: <strong>February 2027</strong>) or whenever data practices change.
                            If significant changes occur, I will notify all active students via email.
                        </p>
                        <p className="text-gray-700 mt-2">
                            Last updated: <strong>February 9, 2026</strong>
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="bg-gradient-to-r from-purple-100 to-teal-100 border-2 border-purple-300 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions or Concerns?</h2>
                        <p className="text-gray-800 mb-4">
                            If you have any questions about this policy or how your data is handled, please don't hesitate to contact me:
                        </p>
                        <div className="bg-white rounded-xl p-4 shadow-md">
                            <div className="flex items-center gap-3 mb-2">
                                <Mail size={24} className="text-purple-600" />
                                <strong className="text-gray-900">Email:</strong>
                                <a href="mailto:privacy@davinastutoring.co.uk" className="text-purple-600 hover:underline font-mono">
                                    privacy@davinastutoring.co.uk
                                </a>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock size={24} className="text-teal-600" />
                                <strong className="text-gray-900">Response Time:</strong>
                                <span className="text-gray-700">Within 7 working days</span>
                            </div>
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

export default PrivacyPolicy;
