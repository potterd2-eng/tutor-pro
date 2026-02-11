import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, CheckCircle, XCircle } from 'lucide-react';

const CookieConsent = () => {
    const [showBanner, setShowBanner] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Check if user has already made a consent choice
        const consentGiven = sessionStorage.getItem('cookieConsent');
        if (!consentGiven) {
            // Show banner after a brief delay for better UX
            setTimeout(() => setShowBanner(true), 1000);
        }
    }, []);

    const handleAccept = () => {
        sessionStorage.setItem('cookieConsent', 'accepted');
        localStorage.setItem('cookieConsentPreference', 'accepted');
        setShowBanner(false);
        // Trigger a custom event so other components know consent was given
        window.dispatchEvent(new Event('cookieConsentGranted'));
    };

    const handleReject = () => {
        sessionStorage.setItem('cookieConsent', 'rejected');
        localStorage.setItem('cookieConsentPreference', 'rejected');
        setShowBanner(false);
        // Clear any existing localStorage data
        const keysToKeep = ['cookieConsentPreference'];
        Object.keys(localStorage).forEach(key => {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        });
        alert('You have rejected cookies. Please note that the tutoring platform requires local storage to function. You will have limited access to features.');
    };

    if (!showBanner) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-purple-100 p-3 rounded-xl">
                        <Cookie className="text-purple-600" size={32} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cookie & Data Storage Notice</h2>
                        <p className="text-gray-600 text-sm">
                            We use local storage to save your account information, bookings, and session data to provide our tutoring services.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="mb-6">
                    {!showDetails ? (
                        <div className="bg-gray-50 border-l-4 border-purple-600 p-4 rounded-r-xl">
                            <p className="text-gray-700 text-sm leading-relaxed">
                                By clicking <strong>"Accept"</strong>, you consent to our use of local storage to:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    Save your student account and login details
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    Store your lesson bookings and payment history
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    Remember your preferences and session data
                                </li>
                            </ul>
                            <p className="text-xs text-gray-500 mt-3">
                                We don't use tracking cookies or sell your data to third parties.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                            <h3 className="font-bold text-gray-900 mb-3">What We Store</h3>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <h4 className="font-semibold text-gray-800">Essential Storage (Required)</h4>
                                    <p className="text-gray-600 mt-1">Student account data (name, email, PIN), lesson bookings, payment records, session notes. Without this, the platform cannot function.</p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-gray-800">How Long We Keep It</h4>
                                    <p className="text-gray-600 mt-1">1 year after your last session (or 7 years for payment records per HMRC requirements). See our <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link> for details.</p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-gray-800">Your Rights</h4>
                                    <p className="text-gray-600 mt-1">You can download, update, or delete your data at any time from your dashboard. See our <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link> for full details.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-purple-600 hover:text-purple-700 text-sm font-semibold mt-3 underline"
                    >
                        {showDetails ? 'Show Less' : 'Learn More'}
                    </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleAccept}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={20} />
                        Accept & Continue
                    </button>
                    <button
                        onClick={handleReject}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <XCircle size={20} />
                        Reject
                    </button>
                </div>

                {/* Footer Links */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 justify-center text-xs text-gray-500">
                    <Link to="/privacy" className="hover:text-purple-600 underline">Privacy Policy</Link>
                    <Link to="/cookie-policy" className="hover:text-purple-600 underline">Cookie Policy</Link>
                    <Link to="/terms" className="hover:text-purple-600 underline">Terms of Service</Link>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
