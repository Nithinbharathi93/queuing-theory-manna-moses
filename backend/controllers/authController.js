import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Management Login (Standard Auth)
export const loginManagement = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) return res.status(401).json({ error: error.message });
        res.status(200).json({ role: 'management', user: data.user, session: data.session });
    } catch (err) {
        console.error('Error in loginManagement:', err);
        res.status(500).json({ error: err.message || 'Login failed' });
    }
};

// 2. Reception Login (Hospital Name + Shared Password)
export const loginReception = async (req, res) => {
    try {
        const { hospital_name, password } = req.body;
        if (!hospital_name || !password) {
            return res.status(400).json({ error: 'Hospital name and password are required' });
        }
        const { data: hospital, error } = await supabase
            .from('hospitals')
            .select('id, name, reception_password_hash')
            .eq('name', hospital_name)
            .single();

        if (error || !hospital) return res.status(401).json({ error: "Hospital not found" });

        const isMatch = await bcrypt.compare(password, hospital.reception_password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid reception password" });

        res.status(200).json({ role: 'reception', hospitalId: hospital.id, hospitalName: hospital.name });
    } catch (err) {
        console.error('Error in loginReception:', err);
        res.status(500).json({ error: err.message || 'Login failed' });
    }
};

// 3. Doctor Login (Custom DrID + Generated Password)
export const loginDoctor = async (req, res) => {
    try {
        const { dr_id, password } = req.body;
        if (!dr_id || !password) {
            return res.status(400).json({ error: 'Doctor ID and password are required' });
        }
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('*, hospitals(name)')
            .eq('dr_id', dr_id)
            .single();

        if (error || !doctor) return res.status(401).json({ error: "Invalid Doctor ID" });

        const isMatch = await bcrypt.compare(password, doctor.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid password" });

        res.status(200).json({ role: 'doctor', doctorId: doctor.id, hospitalId: doctor.hospital_id });
    } catch (err) {
        console.error('Error in loginDoctor:', err);
        res.status(500).json({ error: err.message || 'Login failed' });
    }
};

export const registerHospital = async (req, res) => {
    const { email, password, hospital_name, reception_password, total_beds } = req.body;

    try {
        // 1. Create the Management User in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;

        // 2. Hash the shared Reception Password
        const receptionHash = await bcrypt.hash(reception_password, 10);

        // 3. Create the Hospital Record
        // We use the authData.user.id as the primary key to link Management to the Hospital
        const { data: hospitalData, error: dbError } = await supabase
            .from('hospitals')
            .insert([{
                id: authData.user.id, 
                name: hospital_name,
                reception_password_hash: receptionHash,
                total_beds: total_beds || 0
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        res.status(201).json({
            message: "Hospital and Management account created successfully",
            hospital: hospitalData
        });
    } catch (error) {
        console.error("CRITICAL REGISTRATION ERROR:", error); 
        
        res.status(500).json({ 
            error: "Internal Server Error", 
            message: error.message 
        });
    }
};