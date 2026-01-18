import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Management: Create Doctor Credentials
export const createDoctor = async (req, res) => {
    const { hospital_id, service_time } = req.body;
    const dr_id = `DR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPw = await bcrypt.hash(tempPassword, 10);

    const { error } = await supabase.from('doctors').insert([{ 
        hospital_id, dr_id, password_hash: hashedPw, service_time 
    }]);

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ dr_id, tempPassword });
};

// Reception: Update Live Stats
export const updateStats = async (req, res) => {
    const { hospital_id, arrival_rate, emergency_patients, normal_patients } = req.body;
    const { error } = await supabase
        .from('hospital_stats')
        .update({ arrival_rate, emergency_patients, normal_patients, updated_at: new Date() })
        .eq('hospital_id', hospital_id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: "Stats updated" });
};