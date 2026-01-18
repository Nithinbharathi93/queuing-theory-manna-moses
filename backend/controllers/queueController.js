import { createClient } from '@supabase/supabase-js';
import { runSimulationLogic } from '../utils/simulator.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const getLiveSimulation = async (req, res) => {
    const { hospital_id } = req.params;

    // Fetch all required data points in parallel for better performance
    const [statsRes, hospitalRes, doctorsRes] = await Promise.all([
        supabase.from('hospital_stats').select('*').eq('hospital_id', hospital_id).single(),
        supabase.from('hospitals').select('total_beds').eq('id', hospital_id).single(),
        supabase.from('doctors').select('service_time').eq('hospital_id', hospital_id).eq('is_clocked_in', true)
    ]);

    const doctorCount = doctorsRes.data?.length || 0;
    
    // Default to a fallback service time if no doctors are clocked in
    const avgServiceTime = doctorCount > 0 
        ? doctorsRes.data.reduce((acc, dr) => acc + dr.service_time, 0) / doctorCount 
        : 15; 

    const result = runSimulationLogic({
        arrival_rate: statsRes.data.arrival_rate,
        service_time: avgServiceTime,
        doctors: doctorCount || 1, // Prevent division by zero
        total_beds: hospitalRes.data.total_beds,
        emergency_patients: statsRes.data.emergency_patients,
        normal_patients: statsRes.data.normal_patients
    });

    res.status(200).json(result);
};