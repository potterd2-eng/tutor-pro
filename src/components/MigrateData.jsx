import React, { useState } from 'react';
import supabase, { studentService, bookingService, sessionService, chatService, availabilityService } from '../services/supabase';
import { Upload, Check, AlertCircle, RefreshCw } from 'lucide-react';

const MigrateData = () => {
    const [status, setStatus] = useState('idle'); // idle, fast_syncing, full_syncing, success, error
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
    const [logs, setLogs] = useState([]);

    const log = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const daysMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };

    const migrate = async () => {
        try {
            setStatus('full_syncing');
            setLogs([]);
            log("Starting Full Migration...");

            // 1. STUDENTS
            const localStudents = JSON.parse(localStorage.getItem('tutor_students') || '[]');
            log(`Found ${localStudents.length} students locally.`);

            // Map old string IDs to new UUIDs for relations
            const idMap = {}; // { oldId: newUuid }

            for (const s of localStudents) {
                // Check if exists by name (simple dedup)
                // In real app, might want smarter check. 
                // For now, we'll try to insert. If generic ID, we let DB generate UUID.

                const { data: existing } = await supabase.from('students').select('id').eq('email', `${s.name.replace(/\s+/g, '').toLowerCase()}@example.com`).maybeSingle();

                let studentId;
                if (existing) {
                    studentId = existing.id;
                    log(`Student ${s.name} already exists (ID: ${studentId})`);
                } else {
                    const email = `${s.name.replace(/\s+/g, '').toLowerCase()}@example.com`; // Fake email generator for migration
                    const res = await studentService.create({
                        name: s.name,
                        email: email
                    });
                    studentId = res.id;
                    log(`Created student ${s.name} (ID: ${studentId})`);
                }
                idMap[s.id] = studentId;
            }

            // 2. BOOKINGS
            const localBookings = JSON.parse(localStorage.getItem('tutor_bookings') || '[]');
            log(`Found ${localBookings.length} bookings locally.`);

            for (const b of localBookings) {
                const newStudentId = idMap[b.studentId] || idMap[Object.keys(idMap).find(k => k === b.studentId)]; // Fallback

                if (!newStudentId) {
                    log(`Skipping booking ${b.id} - Student not found in map.`);
                    continue;
                }

                // Check existing
                const { data: existing } = await supabase.from('bookings')
                    .select('id')
                    .eq('date', b.date)
                    .eq('time', b.time)
                    .eq('student_id', newStudentId)
                    .maybeSingle();

                if (!existing) {
                    await bookingService.create({
                        student_id: newStudentId,
                        date: b.date,
                        time: b.time,
                        subject: b.subject,
                        status: b.status,
                        type: b.type,
                        cost: b.cost,
                        payment_status: b.paymentStatus ? b.paymentStatus.toLowerCase() : 'due',
                        notes: b.notes
                    });
                }
            }
            log("Bookings migrated.");

            // 3. SCHEDULE (Availability)
            const localSchedule = JSON.parse(localStorage.getItem('tutor_weekly_schedule') || '[]');
            log("Migrating Schedule...");

            // First, clear existing slots to avoid duplicates
            const { error: delErr } = await supabase.from('availability_slots').delete().gte('day_of_week', 0);
            if (delErr) log(`Warning clearing slots: ${delErr.message}`);

            for (const day of localSchedule) {
                if (!day.active) continue;
                const dayIdx = daysMap[day.day];

                for (const interval of day.intervals) {
                    await availabilityService.create({
                        day_of_week: dayIdx,
                        start_time: interval.start,
                        end_time: interval.end,
                        slot_type: 'both', // default from local
                        is_active: true
                    });
                }
            }
            log("Schedule migrated.");

            // 4. SESSION HISTORY
            const localHistory = JSON.parse(localStorage.getItem('tutor_session_history') || '[]');
            log(`Found ${localHistory.length} history items.`);

            for (const h of localHistory) {
                const newStudentId = idMap[h.studentId] || idMap[Object.keys(idMap).find(k => k === h.studentId)];

                if (newStudentId) {
                    await sessionService.create({
                        student_id: newStudentId,
                        date: h.date,
                        topic: h.topic,
                        feedback_well: h.feedbackWell || h.feedback_well,
                        feedback_improve: h.feedbackImprove || h.feedback_improve,
                        next_steps: h.nextSteps || h.next_steps,
                        cost: h.cost,
                        payment_status: h.paymentStatus ? h.paymentStatus.toLowerCase() : 'due',
                        type: h.type || 'lesson'
                    });
                } else {
                    log(`Skipping history item for student ${h.studentId} - Not found.`);
                }
            }
            log("History migrated.");

            setStatus('success');
            log("MIGRATION COMPLETE ✅");

        } catch (err) {
            console.error(err);
            setStatus('error');
            const msg = (err && err.message) || String(err);
            if (msg === 'Failed to fetch' || msg.includes('fetch')) {
                log(`ERROR: Network error – "${msg}". Check your internet connection, Supabase URL and anon key in .env, and that the Supabase project allows your app origin (CORS).`);
            } else {
                log(`ERROR: ${msg}`);
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <RefreshCw size={20} className={status === 'full_syncing' ? 'animate-spin' : ''} />
                Cloud Sync (Teacher)
            </h3>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-4 text-sm">
                <p className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>
                        Click <strong>Sync to Cloud</strong> below to upload your local data (Students, Schedule, Bookings, Session history) to the database. You can then access it from other devices. This does not run automatically.
                        <br />
                        <strong>Note:</strong> This overrides the cloud schedule with your local schedule.
                    </span>
                </p>
            </div>

            <button
                type="button"
                onClick={migrate}
                disabled={status === 'full_syncing'}
                className={`w-full min-h-[48px] py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mb-4 border-2 ${status === 'success'
                    ? 'bg-green-500 border-green-600 text-white hover:bg-green-600'
                    : status === 'full_syncing'
                    ? 'bg-gray-300 border-gray-400 text-gray-600 cursor-wait'
                    : 'bg-purple-600 border-purple-700 text-white hover:bg-purple-700 shadow-md'
                    }`}
            >
                {status === 'full_syncing' ? (
                    <>Syncing...</>
                ) : status === 'success' ? (
                    <><Check size={20} /> Synced Successfully</>
                ) : (
                    <><Upload size={20} /> Sync to Cloud</>
                )}
            </button>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Log</p>
            <div className="h-32 bg-gray-100 border border-gray-200 text-gray-700 font-mono text-xs p-3 rounded-xl overflow-y-auto">
                {logs.length === 0 ? <span className="text-gray-400">Ready to sync. Click the button above to start.</span> : logs.map((l, i) => (
                    <div key={i}>{l}</div>
                ))}
            </div>
        </div>
    );
};

export default MigrateData;
