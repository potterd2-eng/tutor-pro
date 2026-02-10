// Conflict detection utilities for booking system

/**
 * Check if a time slot is available
 * @param {Array} bookings - Array of all bookings
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @param {string} time - Time to check (HH:MM)
 * @param {string} excludeId - Booking ID to exclude (for rescheduling)
 * @returns {boolean} True if slot is available
 */
export const isSlotAvailable = (bookings, date, time, excludeId = null) => {
    return !bookings.some(b =>
        b.date === date &&
        b.time === time &&
        b.status === 'confirmed' &&
        b.id !== excludeId
    );
};

/**
 * Check if a UTC timestamp slot is available
 * @param {Array} bookings - Array of bookings with utcTimestamp
 * @param {string} utcTimestamp - UTC ISO string to check
 * @param {string} excludeId - Booking ID to exclude
 * @returns {boolean} True if slot is available
 */
export const isUTCSlotAvailable = (bookings, utcTimestamp, excludeId = null) => {
    const checkTime = new Date(utcTimestamp).getTime();
    return !bookings.some(b => {
        if (b.id === excludeId || b.status !== 'confirmed') return false;
        const bookingTime = new Date(b.utcTimestamp || `${b.date}T${b.time}`).getTime();
        return bookingTime === checkTime;
    });
};

/**
 * Find conflicting bookings for a given slot
 * @param {Array} bookings - Array of all bookings
 * @param {string} date - Date to check
 * @param {string} time - Time to check
 * @param {string} excludeId - Booking ID to exclude
 * @returns {Array} Array of conflicting bookings
 */
export const findConflicts = (bookings, date, time, excludeId = null) => {
    return bookings.filter(b =>
        b.date === date &&
        b.time === time &&
        b.status === 'confirmed' &&
        b.id !== excludeId
    );
};

/**
 * Get available time slots for a given date
 * @param {Array} allSlots - All possible time slots
 * @param {Array} bookings - Existing bookings
 * @param {string} date - Date to check
 * @returns {Array} Available time slots
 */
export const getAvailableSlots = (allSlots, bookings, date) => {
    return allSlots.filter(slot =>
        isSlotAvailable(bookings, date, slot.time)
    );
};

/**
 * Validate reschedule request for conflicts
 * @param {Array} bookings - All bookings
 * @param {string} bookingId - ID of booking being rescheduled
 * @param {string} newDate - New date
 * @param {string} newTime - New time
 * @returns {object} { isValid: boolean, conflicts: Array, message: string }
 */
export const validateReschedule = (bookings, bookingId, newDate, newTime) => {
    const conflicts = findConflicts(bookings, newDate, newTime, bookingId);

    if (conflicts.length > 0) {
        return {
            isValid: false,
            conflicts,
            message: `This slot is already booked by ${conflicts[0].student}. Please choose another time.`
        };
    }

    return {
        isValid: true,
        conflicts: [],
        message: 'Slot is available'
    };
};

/**
 * Get suggested alternative slots when there's a conflict
 * @param {Array} allSlots - All possible slots
 * @param {Array} bookings - Existing bookings
 * @param {string} date - Preferred date
 * @param {number} count - Number of alternatives to suggest
 * @returns {Array} Suggested alternative slots
 */
export const getSuggestedAlternatives = (allSlots, bookings, date, count = 3) => {
    const available = getAvailableSlots(allSlots, bookings, date);
    return available.slice(0, count);
};
