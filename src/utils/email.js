/**
 * Email Service Utility
 * 
 * Uses EmailJS for client-side notifications (confirmations)
 * and prepares logic for Resend (used in Supabase Edge Functions for reminders).
 */

import emailjs from '@emailjs/browser';

// These would ideally come from environment variables
const EMAILJS_SERVICE_ID = 'service_xxxx'; // Placeholder
const EMAILJS_TEMPLATE_ID = 'contact_form'; // Default EmailJS template name often used
const EMAILJS_PUBLIC_KEY = 'public_xxxx'; // Placeholder
const TEACHER_EMAIL = 'davina.potter@outlook.com';

export const emailService = {
    /**
     * Send a booking confirmation email to the student
     * @param {Object} bookingData - The booking details
     */
    async sendConfirmation(bookingData) {
        try {
            if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'public_xxxx') {
                console.warn('EmailJS not configured. Skipping confirmation email.');
                return;
            }

            const templateParams = {
                to_name: bookingData.student,
                to_email: bookingData.email,
                subject: bookingData.subject,
                date: bookingData.date,
                time: bookingData.time,
                meeting_link: bookingData.meetingLink,
            };

            const response = await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams,
                EMAILJS_PUBLIC_KEY
            );

            console.log('Confirmation email sent successfully:', response.status, response.text);
            return response;
        } catch (error) {
            console.error('Failed to send confirmation email:', error);
            throw error;
        }
    },

    /**
   * Send a reschedule request notification to the teacher or student
   */
    async sendRescheduleRequest(bookingData, fromType) {
        try {
            if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'public_xxxx') {
                console.warn('EmailJS not configured. Skipping reschedule request email.');
                return;
            }

            const templateParams = {
                to_name: fromType === 'student' ? 'Teacher' : bookingData.student,
                to_email: fromType === 'student' ? TEACHER_EMAIL : bookingData.email,
                from_name: fromType === 'student' ? bookingData.student : 'Davina Potter',
                original_date: bookingData.date,
                original_time: bookingData.time,
                requested_date: bookingData.requestedDate,
                requested_time: bookingData.requestedTime,
                subject: bookingData.subject
            };

            return await emailjs.send(EMAILJS_SERVICE_ID, 'reschedule_request_template', templateParams, EMAILJS_PUBLIC_KEY);
        } catch (error) {
            console.error('Failed to send reschedule request email:', error);
        }
    },

    /**
     * Send a response to a reschedule request
     */
    async sendRescheduleResponse(bookingData, response) {
        try {
            if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'public_xxxx') return;

            const templateParams = {
                to_name: bookingData.student,
                to_email: bookingData.email,
                response: response, // 'Approved' or 'Denied'
                date: bookingData.date,
                time: bookingData.time,
                subject: bookingData.subject
            };

            return await emailjs.send(EMAILJS_SERVICE_ID, 'reschedule_response_template', templateParams, EMAILJS_PUBLIC_KEY);
        } catch (error) {
            console.error('Failed to send reschedule response email:', error);
        }
    },

    /**
     * Send a cancellation notice
     */
    async sendCancellationNotice(bookingData, cancelledBy) {
        try {
            if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'public_xxxx') return;

            const templateParams = {
                to_name: cancelledBy === 'teacher' ? bookingData.student : 'Teacher',
                to_email: cancelledBy === 'teacher' ? bookingData.email : TEACHER_EMAIL,
                cancelled_by: cancelledBy === 'teacher' ? 'Davina Potter' : bookingData.student,
                date: bookingData.date,
                time: bookingData.time,
                subject: bookingData.subject
            };

            return await emailjs.send(EMAILJS_SERVICE_ID, 'cancellation_template', templateParams, EMAILJS_PUBLIC_KEY);
        } catch (error) {
            console.error('Failed to send cancellation email:', error);
        }
    },

    /**
   * Send a refund notice
   */
    async sendRefundNotice(bookingData) {
        try {
            if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'public_xxxx') return;

            const templateParams = {
                to_name: bookingData.student,
                to_email: bookingData.email,
                date: bookingData.date,
                time: bookingData.time,
                amount: bookingData.cost,
                subject: bookingData.subject
            };

            return await emailjs.send(EMAILJS_SERVICE_ID, 'refund_template', templateParams, EMAILJS_PUBLIC_KEY);
        } catch (error) {
            console.error('Failed to send refund email:', error);
        }
    },

    /**
     * Placeholder for sending reminders (usually handled by Supabase Edge Functions)
       * This logic is documentary for the Edge Function implementation.
       */
    async sendReminder(bookingData) {
        console.log('Reminder logic would trigger here (recommended via Supabase Edge Functions)');
    }
};
