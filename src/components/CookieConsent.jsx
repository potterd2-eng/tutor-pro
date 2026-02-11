import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, CheckCircle, XCircle, ChevronUp } from 'lucide-react';

const CookieConsent = () => {
    const [showBanner, setShowBanner] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Check if user has already made a consent choice
        const consentGiven = sessionStorage.getItem('cookieConsent');
        if (!consentGiven) {
            // Show banner after a brief delay to let them see the site first
            setTimeout(() => setShowBanner(true), 2000);
        }
    }, []);

    const handleAccept = () => {
        sessionStorage.setItem('cookieConsent', 'accepted');
        localStorage.setItem('cookieConsentPreference', 'accepted');
        setShowBanner(false);
        window.dispatchEvent(new Event('cookieConsentGranted'));
    };

    const handleReject = () => {
        sessionStorage.setItem('cookieConsent', 'rejected');
        localStorage.setItem('cookieConsentPreference', 'rejected');
        setShowBanner(false);
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
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-8 duration-500">
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl border-2 border-purple-200">
                {/* Compact Main View */}
                {!showDetails ? (
                    <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Icon & Text */}
                            <div className="flex items-start gap-3 flex-1">
                                <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                                    <Cookie className="text-purple-600" size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">We use cookies to enhance your experience</h3>
                                    <p className="text-xs sm:text-sm text-gray-600">
                                        We store your account, bookings, and session data locally. No tracking or third-party sharing.
                                        <button
                                            onClick={() => setShowDetails(true)}
                                            className="text-purple-600 hover:underline ml-1 font-semibold"
                                        >
                                            Learn more
                                        </button>
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={handleReject}
                                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={handleAccept}
                                    className="flex-1 sm:flex-none px-6 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={16} />
                                    Accept
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Expanded Details View */
                    <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <Cookie className="text-purple-600" size={24} />
                                </div>
                                <h3 className="font-bold text-gray-900">Cookie & Data Storage</h3>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <ChevronUp size={20} />
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto text-sm">
                            <p className="text-gray-700 mb-3">
                                By clicking <strong>"Accept"</strong>, you consent to our use of local storage to:
                            </p>
                            <ul className="space-y-2 text-gray-700">
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
                                We don't use tracking cookies or sell your data. See our{' '}
                                <Link to="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>,{' '}
                                <Link to="/cookie-policy" className="text-purple-600 hover:underline">Cookie Policy</Link>, and{' '}
                                <Link to="/terms" className="text-purple-600 hover:underline">Terms of Service</Link>.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleReject}
                                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                            >
                                Reject
                            </button>
                            <button
                                onClick={handleAccept}
                                className="flex-1 px-6 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={16} />
                                Accept & Continue
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CookieConsent;
