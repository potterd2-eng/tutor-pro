// Timezone utility functions for production-ready booking system
// Stores all dates/times in UTC, displays in local timezone

/**
 * Convert local date and time to UTC ISO string
 * @param {string} localDate - Date in YYYY-MM-DD format
 * @param {string} localTime - Time in HH:MM format
 * @returns {string} UTC ISO string
 */
export const toUTC = (localDate, localTime) => {
    const dateTime = new Date(`${localDate}T${localTime}`);
    return dateTime.toISOString();
};

/**
 * Convert UTC ISO string to local date
 * @param {string} utcString - UTC ISO string
 * @returns {string} Local date in YYYY-MM-DD format
 */
export const toLocalDate = (utcString) => {
    const date = new Date(utcString);
    return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
};

/**
 * Convert UTC ISO string to local time
 * @param {string} utcString - UTC ISO string
 * @returns {string} Local time in HH:MM format
 */
export const toLocalTime = (utcString) => {
    const date = new Date(utcString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/**
 * Format UTC ISO string for display with timezone
 * @param {string} utcString - UTC ISO string
 * @param {boolean} includeTimezone - Whether to show timezone abbreviation
 * @returns {string} Formatted date/time string
 */
export const formatDateTime = (utcString, includeTimezone = true) => {
    const date = new Date(utcString);
    const options = {
        dateStyle: 'medium',
        timeStyle: 'short'
    };

    let formatted = date.toLocaleString('en-GB', options);

    if (includeTimezone) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tzAbbr = date.toLocaleTimeString('en-GB', { timeZoneName: 'short' }).split(' ').pop();
        formatted += ` (${tzAbbr})`;
    }

    return formatted;
};

/**
 * Get user's current timezone
 * @returns {string} Timezone name (e.g., "Europe/London")
 */
export const getUserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Check if two UTC timestamps conflict (same date and time)
 * @param {string} utc1 - First UTC ISO string
 * @param {string} utc2 - Second UTC ISO string
 * @returns {boolean} True if they conflict
 */
export const doTimesConflict = (utc1, utc2) => {
    const date1 = new Date(utc1);
    const date2 = new Date(utc2);
    return date1.getTime() === date2.getTime();
};

/**
 * Create a booking object with UTC timestamp
 * @param {string} localDate - Local date in YYYY-MM-DD
 * @param {string} localTime - Local time in HH:MM
 * @param {object} bookingData - Additional booking data
 * @returns {object} Booking with UTC timestamp
 */
export const createBooking = (localDate, localTime, bookingData = {}) => {
    return {
        ...bookingData,
        utcTimestamp: toUTC(localDate, localTime),
        timezone: getUserTimezone(),
        createdAt: new Date().toISOString()
    };
};
