import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.use(cors());
app.use(express.json());

// --- UTILS: SIMULATOR LOGIC ---
const runSimulationLogic = ({ arrival_rate, service_time, doctors, total_beds, emergency_patients, normal_patients }) => {
    const emergency_waiting_time = (emergency_patients * service_time) / (doctors * 2);
    const normal_waiting_time = ((normal_patients + emergency_patients) * service_time) / doctors;
    const total_queue_length = emergency_patients + normal_patients;
    const doctor_utilization = (arrival_rate * service_time) / (doctors * 60) * 100;
    const occupied_beds = emergency_patients + normal_patients;
    const available_beds = total_beds - occupied_beds;
    const admission_delay = available_beds < 0 ? Math.abs(available_beds) * service_time : 0;

    let congestion = "Low";
    if (emergency_waiting_time >= 15) {
        congestion = "High";
    } else if (emergency_waiting_time >= 5 || normal_waiting_time >= 20) {
        congestion = "Medium";
    }

    return {
        emergencyWaitingTimeMin: Number(emergency_waiting_time.toFixed(2)),
        normalWaitingTimeMin: Number(normal_waiting_time.toFixed(2)),
        totalQueueLength: total_queue_length,
        doctorUtilizationPct: Number(doctor_utilization.toFixed(2)),
        availableBeds: available_beds,
        admissionDelayMin: admission_delay,
        congestionLevel: congestion
    };
};

// --- MIDDLEWARE: AUTHORIZATION ---
const checkRole = (allowedRoles) => (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (allowedRoles.includes(userRole)) return next();
    res.status(403).json({ error: "Access Denied: Insufficient Permissions" });
};

// --- ROUTES: AUTH ---
app.post('/api/auth/register-hospital', async (req, res) => {
    const { email, password, hospital_name, reception_password, total_beds } = req.body;
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        const receptionHash = await bcrypt.hash(reception_password, 10);
        const { data: hospitalData, error: dbError } = await supabase
            .from('hospitals')
            .insert([{ id: authData.user.id, name: hospital_name, reception_password_hash: receptionHash, total_beds: total_beds || 0 }])
            .select().single();

        if (dbError) throw dbError;
        res.status(201).json({ message: "Success", hospital: hospitalData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/management', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.status(200).json({ role: 'management', user: data.user, session: data.session });
});

app.post('/api/auth/reception', async (req, res) => {
    const { hospital_name, password } = req.body;
    const { data: hospital, error } = await supabase.from('hospitals').select('*').eq('name', hospital_name).single();
    if (error || !hospital) return res.status(401).json({ error: "Hospital not found" });

    const isMatch = await bcrypt.compare(password, hospital.reception_password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });
    res.status(200).json({ role: 'reception', hospitalId: hospital.id, hospitalName: hospital.name });
});

app.post('/api/auth/doctor', async (req, res) => {
    const { dr_id, password } = req.body;
    const { data: doctor, error } = await supabase.from('doctors').select('*').eq('dr_id', dr_id).single();
    if (error || !doctor) return res.status(401).json({ error: "Invalid Doctor ID" });

    const isMatch = await bcrypt.compare(password, doctor.password_hash);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });
    res.status(200).json({ role: 'doctor', doctorId: doctor.id, hospitalId: doctor.hospital_id });
});

// --- ROUTES: HOSPITAL & DOCTOR MGMT ---
app.post('/api/hospital/create-doctor', checkRole(['management']), async (req, res) => {
    const { hospital_id, service_time } = req.body;
    const dr_id = `DR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPw = await bcrypt.hash(tempPassword, 10);

    const { data, error } = await supabase.from('doctors').insert([{ 
        hospital_id, dr_id, password_hash: hashedPw, service_time: service_time || 15 
    }]).select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ dr_id, tempPassword });
});

app.patch('/api/hospital/update-stats', checkRole(['reception', 'management']), async (req, res) => {
    const { hospital_id, arrival_rate, emergency_patients, normal_patients } = req.body;
    const { error } = await supabase
        .from('hospital_stats')
        .update({ arrival_rate, emergency_patients, normal_patients, updated_at: new Date() })
        .eq('hospital_id', hospital_id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: "Stats updated" });
});

app.post('/api/doctor/toggle-clock', checkRole(['doctor']), async (req, res) => {
    const { doctor_id, is_clocking_in } = req.body;
    const { error } = await supabase.from('doctors').update({ 
        is_clocked_in: is_clocking_in, 
        last_clock_in: is_clocking_in ? new Date() : undefined 
    }).eq('id', doctor_id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: `Clocked ${is_clocking_in ? 'in' : 'out'}` });
});

// --- ROUTES: QUEUE SIMULATION ---
app.get('/api/queue/simulate/:hospital_id', async (req, res) => {
    try {
        const { hospital_id } = req.params;
        const [statsRes, hospitalRes, doctorsRes] = await Promise.all([
            supabase.from('hospital_stats').select('*').eq('hospital_id', hospital_id).maybeSingle(),
            supabase.from('hospitals').select('total_beds').eq('id', hospital_id).single(),
            supabase.from('doctors').select('service_time').eq('hospital_id', hospital_id).eq('is_clocked_in', true)
        ]);

        const doctorCount = doctorsRes.data?.length || 0;
        const avgServiceTime = doctorCount > 0 
            ? doctorsRes.data.reduce((acc, dr) => acc + dr.service_time, 0) / doctorCount 
            : 15; 

        const result = runSimulationLogic({
            arrival_rate: statsRes.data?.arrival_rate || 0,
            service_time: avgServiceTime,
            doctors: doctorCount || 1,
            total_beds: hospitalRes.data.total_beds,
            emergency_patients: statsRes.data?.emergency_patients || 0,
            normal_patients: statsRes.data?.normal_patients || 0
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Unified Backend running on http://localhost:${PORT}`));