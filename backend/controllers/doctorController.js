import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const toggleClock = async (req, res) => {
    const { doctor_id, is_clocking_in } = req.body;
    const { error } = await supabase
        .from('doctors')
        .update({ 
            is_clocked_in: is_clocking_in, 
            last_clock_in: is_clocking_in ? new Date() : undefined 
        })
        .eq('id', doctor_id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: `Clocked ${is_clocking_in ? 'in' : 'out'}` });
};