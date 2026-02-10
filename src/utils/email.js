/**
 * Email Service Utility
 * 
 * Uses EmailJS for client-side notifications (confirmations)
 */

import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_ryo31ep';
const EMAILJS_TEMPLATE_ID = 'template_73af12q'; // "Student Master Template" (Formerly Confirmation)
const EMAILJS_TEACHER_TEMPLATE_ID = 'template_mfg5t3p'; // Teacher Notification Template
const EMAILJS_PUBLIC_KEY = 'ZyVRcQAs8z8yf9kTp';
const TEACHER_EMAIL = 'davina.potter@outlook.com';

export const emailService = {
    /**
     * Internal helper to send the "Student Master Template"
     */
    async _sendStudentEmail(toName, toEmail, emailTitle, emailBody) {
        if (!EMAILJS_PUBLIC_KEY) return;

        return emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
                to_name: toName,
                to_email: toEmail,
                email_title: emailTitle,   // The Subject Line
                email_body: emailBody      // The Main Message Content
            },
            EMAILJS_PUBLIC_KEY
        );
    },

    /**
     * Send a booking confirmation email to the student
     */
    async sendConfirmation(bookingData) {
        try {
            // 1. Send Student Confirmation (Dynamic Body)
            const subjectLine = `Booking Confirmed: ${bookingData.subject} with Davina`;
            const messageBody = `Hi ${bookingData.student},

Your consultation is confirmed! I'm looking forward to speaking with you.

📅 Date: ${bookingData.date}
⏰ Time: ${bookingData.time}
🔗 Meeting Link: ${bookingData.meetingLink}

How to prepare:
To help us make the most of our chat, it would be great if you could share:
- Your Exam Board (e.g., AQA, Edexcel)
- Current working grade & Desired grade
- Any specific topics you find difficult

(Don't worry if you don't know these yet!)

See you soon,
Davina Potter`;

            await this._sendStudentEmail(bookingData.student, bookingData.email, subjectLine, messageBody);
            console.log('Confirmation email sent');

            // 2. Send Teacher Notification (Keep existing separate template for safety/Thread-Reply)
            await this.sendTeacherNotification(bookingData);

        } catch (error) {
            console.error('Failed to send confirmation email:', error);
            throw error;
        }
    },

    /**
     * Send a notification email to the teacher
     */
    async sendTeacherNotification(bookingData) {
        try {
            if (!EMAILJS_PUBLIC_KEY) return;
            // Uses the separate Teacher Template (template_mfg5t3p)
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEACHER_TEMPLATE_ID, {
                student_name: bookingData.student,
                student_email: bookingData.email,
                subject: bookingData.subject,
                date: bookingData.date,
                time: bookingData.time,
                booking_type: bookingData.bookingFor === 'parent' ? 'Parent' : 'Student',
                to_email: TEACHER_EMAIL
            }, EMAILJS_PUBLIC_KEY);
        } catch (error) {
            console.error('Failed to send teacher notification:', error);
        }
    },

    /**
     * Send a reschedule request
     */
    async sendRescheduleRequest(bookingData, fromType) {
        try {
            // Only handle sending TO STUDENT here (Teacher gets notified via dashboard/UI usually, or we could add teacher logic)
            if (fromType === 'teacher') {
                const subjectLine = `Reschedule Request: ${bookingData.subject}`;
                const messageBody = `Hi ${bookingData.student},

I would like to request to reschedule our lesson originally set for ${bookingData.date} at ${bookingData.time}.

Requested New Time:
📅 Date: ${bookingData.requestedDate}
⏰ Time: ${bookingData.requestedTime}

Please login to your dashboard to Approve or Deny this request.

Best,
Davina Potter`;
                return await this._sendStudentEmail(bookingData.student, bookingData.email, subjectLine, messageBody);
            }
        } catch (error) {
            console.error('Failed to send reschedule request:', error);
        }
    },

    /**
     * Send a response to a reschedule request
     */
    async sendRescheduleResponse(bookingData, response) {
        try {
            const subjectLine = `Reschedule ${response}: ${bookingData.subject}`;
            const messageBody = `Hi ${bookingData.student},

Your reschedule request has been ${response}.

New Lesson Time:
📅 Date: ${bookingData.date}
⏰ Time: ${bookingData.time}

Best,
Davina`;
            return await this._sendStudentEmail(bookingData.student, bookingData.email, subjectLine, messageBody);
        } catch (error) {
            console.error('Failed to send reschedule response:', error);
        }
    },

    /**
     * Send a cancellation notice
     */
    async sendCancellationNotice(bookingData, cancelledBy) {
        try {
            if (cancelledBy === 'teacher') {
                const subjectLine = `Lesson Cancelled: ${bookingData.subject}`;
                const messageBody = `Hi ${bookingData.student},

The lesson scheduled for ${bookingData.date} at ${bookingData.time} has been cancelled.

Topic: ${bookingData.subject}

If this was a paid lesson, any applicable refunds will be processed shortly.`;

                return await this._sendStudentEmail(bookingData.student, bookingData.email, subjectLine, messageBody);
            }
        } catch (error) {
            console.error('Failed to send cancellation email:', error);
        }
    },

    /**
     * Send a refund notice
     */
    async sendRefundNotice(bookingData) {
        try {
            const subjectLine = `Refund Processed: ${bookingData.subject}`;
            const messageBody = `Hi ${bookingData.student},

A refund of £${bookingData.cost} has been initiated for your lesson on ${bookingData.date}.

Please allow 5-10 business days for this to appear in your account.`;

            return await this._sendStudentEmail(bookingData.student, bookingData.email, subjectLine, messageBody);
        } catch (error) {
            console.error('Failed to send refund email:', error);
        }
    },

    async sendReminder(bookingData) {
        console.log('Reminder logic would trigger here');
    },

    /**
     * Send a notification to teacher about payment override
     */
    async sendPaymentOverriddenNotification(studentName, date) {
        try {
            if (!EMAILJS_PUBLIC_KEY) return;
            // Reusing Teacher Template but with specific subject/type to alert teacher
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEACHER_TEMPLATE_ID, {
                student_name: studentName,
                student_email: "System Alert",
                subject: "PAYMENT EXCEPTION USED",
                date: date,
                time: new Date().toLocaleTimeString(),
                booking_type: "URGENT: Payment Override",
                to_email: TEACHER_EMAIL
            }, EMAILJS_PUBLIC_KEY);
        } catch (error) {
            console.error('Failed to send payment override notification:', error);
        }
    }
};
