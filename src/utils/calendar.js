/**
 * Generates a Google Calendar Event URL
 * @param {Object} lesson - The lesson object { date: 'YYYY-MM-DD', time: 'HH:MM', subject: '...' }
 * @returns {string} - The Google Calendar URL
 */
export const generateGoogleCalendarUrl = (lesson) => {
    if (!lesson || !lesson.date || !lesson.time) return '#';

    try {
        const startTime = new Date(`${lesson.date}T${lesson.time}`);
        // Assume 1 hour duration
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `Tutoring: ${lesson.subject || 'Lesson'}`,
            dates: `${formatTime(startTime)}/${formatTime(endTime)}`,
            details: `Tutoring session with Davina. Join via your Student Dashboard.`,
            location: 'https://davina-tutor-pro.netlify.app' // Or actual URL
        });

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch (e) {
        console.error("Error generating calendar link", e);
        return '#';
    }
};
