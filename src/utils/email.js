/**
 * Email Service Utility
 * Uses Supabase Edge Functions + Resend for sending emails (no EmailJS; higher limits, no quota issues).
 */

import supabase from '../services/supabase';

// Teacher Configuration (export for use in dashboards when notifying teacher)
export const TEACHER_EMAIL = 'davina.potter@outlook.com';

export const emailService = {
    /**
     * Internal helper to send emails via Supabase Edge Function
     */
    async _sendEmail(to, subject, html, from_name = 'Davina Tutoring') {
        const payload = { to, subject, html, from_name };
        console.log('[EmailService] Attempting to send email:', { to, subject });

        try {
            if (!supabase || !supabase.functions) {
                console.error('[EmailService] Supabase client is not properly initialized. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await supabase.functions.invoke('send-general-email', {
                body: payload
            });

            if (error) {
                console.error('[EmailService] Supabase Edge Function returned an error:', error);

                // Check for common Resend trial plan error (code 403 or message about unverified domains)
                if (error.message?.toLowerCase().includes('authorized') || error.message?.toLowerCase().includes('verify')) {
                    console.warn('[EmailService] POTENTIAL TRIAL LIMIT: Resend may be blocking this email because the recipient is not your verified email and you are on a Trial plan.');
                }
                throw error;
            }

            console.log('[EmailService] Email sent successfully:', data);
            return data;
        } catch (error) {
            console.error('[EmailService] Critical failure sending email:', error);
            throw error;
        }
    },

    /**
     * Send a booking confirmation email to the student
     */
    async sendConfirmation(bookingData) {
        try {
            const isConsultation = bookingData.type === 'consultation' || bookingData.subject === 'Free Consultation';
            const subjectLine = isConsultation
                ? `Booking Confirmed: ${bookingData.subject} with Davina`
                : `Lesson Confirmed: ${bookingData.subject} for ${bookingData.date}`;

            const htmlContent = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                    <div style="background: #7c3aed; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0;">Booking Confirmed!</h2>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hi ${bookingData.student},</p>
                        <p>Your ${isConsultation ? 'consultation' : 'lesson'} is confirmed. I'm looking forward to our session!</p>
                        
                        <div style="background: #f4f4f9; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>📚 Subject:</strong> ${bookingData.subject}</p>
                            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${bookingData.date}</p>
                            <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${bookingData.time}</p>
                            ${bookingData.meetingLink ? `
                            <div style="margin-top: 15px;">
                                <a href="${bookingData.meetingLink}" style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join Session</a>
                            </div>
                            <p style="font-size: 12px; margin-top: 10px;">Or copy link: ${bookingData.meetingLink}</p>
                            ` : ''}
                        </div>

                        ${isConsultation ? `
                        <p><strong>How to prepare:</strong><br>
                        To help us make the most of our chat, feel free to share your Exam Board, current grades, or specific topics you find difficult.</p>
                        ` : `
                        <p>Please ensure you have a stable internet connection and a quiet space for our lesson.</p>
                        `}
                        
                        <p style="margin-top: 30px; border-top: 1px solid #eee; pt: 20px;">
                            See you soon,<br>
                            <strong>Davina Potter</strong>
                        </p>
                    </div>
                </div>
            `;

            await this._sendEmail(bookingData.email, subjectLine, htmlContent);
            console.log('Confirmation email sent');

            // 2. Send Teacher Notification
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
            const subject = `New Booking: ${bookingData.student} - ${bookingData.subject}`;
            const html = `
                <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                    <h2>New Booking Notification</h2>
                    <p><strong>Student:</strong> ${bookingData.student}</p>
                    <p><strong>Email:</strong> ${bookingData.email}</p>
                    <p><strong>Subject:</strong> ${bookingData.subject}</p>
                    <p><strong>Date:</strong> ${bookingData.date}</p>
                    <p><strong>Time:</strong> ${bookingData.time}</p>
                    <p><strong>Type:</strong> ${bookingData.bookingFor === 'parent' ? 'Parent Booking' : 'Student Booking'}</p>
                    <p><strong>Role:</strong> ${bookingData.bookingFor === 'parent' ? 'Parent' : 'Student'}</p>
                </div>
            `;
            await this._sendEmail(TEACHER_EMAIL, subject, html);
        } catch (error) {
            console.error('Failed to send teacher notification:', error);
        }
    },

    /**
     * Send a reschedule request
     */
    async sendRescheduleRequest(bookingData, fromType) {
        try {
            if (fromType === 'teacher') {
                const subjectLine = `Reschedule Request: ${bookingData.subject}`;
                const html = `
                    <div style="font-family: sans-serif;">
                        <p>Hi ${bookingData.student},</p>
                        <p>I would like to request to reschedule our lesson originally set for ${bookingData.date} at ${bookingData.time}.</p>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                            <p><strong>Requested New Time:</strong></p>
                            <p>📅 Date: ${bookingData.requestedDate}</p>
                            <p>⏰ Time: ${bookingData.requestedTime}</p>
                        </div>
                        <p>Please login to your dashboard to Approve or Deny this request.</p>
                        <p>Best,<br>Davina Potter</p>
                    </div>
                `;
                return await this._sendEmail(bookingData.email, subjectLine, html);
            } else if (fromType === 'student' || fromType === 'parent') {
                const subject = `RESCHEDULE REQUEST: ${bookingData.subject}`;
                const html = `
                    <div style="font-family: sans-serif;">
                        <p><strong>${fromType === 'parent' ? 'Parent' : 'Student'}:</strong> ${bookingData.student}</p>
                        <p><strong>Requested Date:</strong> ${bookingData.requestedDate}</p>
                        <p><strong>Requested Time:</strong> ${bookingData.requestedTime}</p>
                        <p><strong>Subject:</strong> ${bookingData.subject}</p>
                    </div>
                `;
                return await this._sendEmail(TEACHER_EMAIL, subject, html);
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
            const html = `
                <div style="font-family: sans-serif;">
                    <p>Hi ${bookingData.student},</p>
                    <p>Your reschedule request has been <strong>${response}</strong>.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                        <p><strong>New Lesson Time:</strong></p>
                        <p>📅 Date: ${bookingData.date}</p>
                        <p>⏰ Time: ${bookingData.time}</p>
                    </div>
                    <p>Best,<br>Davina</p>
                </div>
            `;
            await this._sendEmail(bookingData.email, subjectLine, html);

            if (response === 'Accepted' || response === 'Declined' || response === 'Approved') {
                await this.sendRescheduleResponseToTeacher(bookingData, response);
            }
        } catch (error) {
            console.error('Failed to send reschedule response:', error);
        }
    },

    /**
     * Notify teacher that a student has responded to a reschedule request
     */
    async sendRescheduleResponseToTeacher(bookingData, response) {
        try {
            const subject = `RESCHEDULE ${response.toUpperCase()}: ${bookingData.subject}`;
            const html = `<p>Student <strong>${bookingData.student}</strong> has ${response} the reschedule for ${bookingData.date} at ${bookingData.time}.</p>`;
            await this._sendEmail(TEACHER_EMAIL, subject, html);
        } catch (error) {
            console.error('Failed to notify teacher of reschedule response:', error);
        }
    },

    /**
     * Send a cancellation notice
     */
    async sendCancellationNotice(bookingData, cancelledBy) {
        try {
            if (cancelledBy === 'teacher') {
                const subjectLine = `Lesson Cancelled: ${bookingData.subject}`;
                const html = `
                    <div style="font-family: sans-serif;">
                        <p>Hi ${bookingData.student},</p>
                        <p>The lesson scheduled for ${bookingData.date} at ${bookingData.time} has been cancelled.</p>
                        <p><strong>Topic:</strong> ${bookingData.subject}</p>
                        <p>If this was a paid lesson, any applicable refunds will be processed shortly.</p>
                    </div>
                `;
                return await this._sendEmail(bookingData.email, subjectLine, html);
            } else if (cancelledBy === 'student') {
                const subject = `LESSON CANCELLED: ${bookingData.subject}`;
                const html = `<p>Student <strong>${bookingData.student}</strong> cancelled the lesson on ${bookingData.date} at ${bookingData.time}.</p>`;
                await this._sendEmail(TEACHER_EMAIL, subject, html);
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
            const html = `
                <div style="font-family: sans-serif;">
                    <p>Hi ${bookingData.student},</p>
                    <p>A refund of <strong>£${bookingData.cost}</strong> has been initiated for your lesson on ${bookingData.date}.</p>
                    <p>Please allow 5-10 business days for this to appear in your account.</p>
                </div>
            `;
            return await this._sendEmail(bookingData.email, subjectLine, html);
        } catch (error) {
            console.error('Failed to send refund email:', error);
        }
    },

    /**
     * Send a payment receipt
     */
    async sendReceipt(paymentData) {
        try {
            const subjectLine = `Receipt: Payment for ${paymentData.subject}`;
            const html = `
                <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; max-width: 500px;">
                    <h3>Payment Receipt</h3>
                    <hr>
                    <p><strong>Receipt #:</strong> ${paymentData.id.toString().slice(-6)}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Item:</strong> ${paymentData.subject}</p>
                    <p><strong>Amount:</strong> £${paymentData.cost}</p>
                    <p><strong>Status:</strong> Paid</p>
                    <hr>
                    <p>Thank you for your business!</p>
                    <p>Best,<br>Davina</p>
                </div>
            `;
            return await this._sendEmail(paymentData.email, subjectLine, html);
        } catch (error) {
            console.error('Failed to send receipt email:', error);
        }
    },

    async sendReminder(bookingData) {
        console.log('Reminder logic is handled by Supabase Edge Function');
    },

    /**
     * Send a notification to teacher about payment override
     */
    async sendPaymentOverriddenNotification(studentName, date) {
        try {
            const subject = "PAYMENT EXCEPTION USED";
            const html = `<p><strong>URGENT:</strong> Payment override used for student <strong>${studentName}</strong> on ${date}.</p>`;
            await this._sendEmail(TEACHER_EMAIL, subject, html, "System Alert");
        } catch (error) {
            console.error('Failed to send payment override notification:', error);
        }
    },

    /**
     * Send notification for a new message
     */
    async sendMessageNotification(fromName, toEmail, messagePreview) {
        try {
            const subjectLine = `New Message from ${fromName}`;
            const html = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                    <div style="background: #0d9488; padding: 20px; text-align: center; color: white;">
                        <h2 style="margin: 0;">New Message Notification</h2>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hi,</p>
                        <p>You have a new message from <strong>${fromName}</strong>:</p>
                        <blockquote style="background: #f0fdfa; border-left: 4px solid #0d9488; padding: 15px; font-style: italic; margin: 20px 0; border-radius: 0 8px 8px 0;">
                            "${messagePreview}"
                        </blockquote>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${window.location.origin}" style="background: #0d9488; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View in Dashboard</a>
                        </div>
                        <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
                            TutorPro Notification System
                        </p>
                    </div>
                </div>
            `;
            await this._sendEmail(toEmail, subjectLine, html, "TutorPro System");
        } catch (error) {
            console.error('Failed to send message notification:', error);
        }
    },

    /**
     * Notify teacher of a new booking (Individual or Recurring)
     */
    async sendNewBookingNotificationToTeacher(bookingData) {
        try {
            const subject = `NEW BOOKING: ${bookingData.subject}`;
            const html = `
                <p><strong>Student:</strong> ${bookingData.student}</p>
                <p><strong>Email:</strong> ${bookingData.email}</p>
                <p><strong>Date:</strong> ${bookingData.date}</p>
                <p><strong>Time:</strong> ${bookingData.time}</p>
                <p><strong>Type:</strong> ${bookingData.recurringId ? 'Recurring' : 'Individual'}</p>
            `;
            await this._sendEmail(TEACHER_EMAIL, subject, html);
        } catch (error) {
            console.error('Failed to notify teacher of new booking:', error);
        }
    }
};
