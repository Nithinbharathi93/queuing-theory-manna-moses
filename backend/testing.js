import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase Project details
const SUPABASE_URL = 'https://ehxxxmuxopuuwphafcdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeHh4bXV4b3B1dXdwaGFmY2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzg5MjgsImV4cCI6MjA4ODgxNDkyOH0.2kFympWljjvxn-omsq4oLDyR3wEMDDNW34YDeiqnhv0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const testHospital = {
    email: `mgmt_${Date.now()}@hospital.com`,
    password: 'password123',
    name: 'City General Hospital'
};

const runTests = async () => {
    console.log("🚀 Starting Supabase Backend Integration Tests...\n");

    // 1. TEST: Hospital Registration (Auth + Profile)
    console.log("--- Testing Hospital Registration ---");
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testHospital.email,
        password: testHospital.password,
    });

    if (authError) return console.error("❌ Auth Registration Failed:", authError.message);
    const hospitalId = authData.user.id;

    const { error: profileError } = await supabase
        .from('hospitals')
        .insert([{ id: hospitalId, name: testHospital.name, global_service_time: 12 }]);

    if (profileError) console.error("❌ Hospital Profile Creation Failed:", profileError.message);
    else console.log("✅ Hospital Registered and Profile Created.");

    // 2. TEST: Adding a Department
    console.log("\n--- Testing Department Creation ---");
    const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .insert([{ hospital_id: hospitalId, name: 'Emergency', arrival_rate: 5.5 }])
        .select()
        .single();

    if (deptError) console.error("❌ Dept Creation Failed:", deptError.message);
    else console.log("✅ Department 'Emergency' Created.");

    // 3. TEST: Adding a Doctor to the Dept
    console.log("\n--- Testing Doctor Registration ---");
    const { data: docData, error: docError } = await supabase
        .from('doctors')
        .insert([{ 
            dr_id: `DOC_${Date.now()}`, 
            hospital_id: hospitalId, 
            dept_id: deptData.id,
            is_clocked_in: true 
        }])
        .select()
        .single();

    if (docError) console.error("❌ Doctor Creation Failed:", docError.message);
    else console.log("✅ Doctor Added and Clocked In.");

    // 4. TEST: Floor and Bed Setup
    console.log("\n--- Testing Floor/Bed Setup ---");
    const { error: floorError } = await supabase
        .from('floors')
        .insert([
            { hospital_id: hospitalId, floor_number: 1, total_beds: 10 },
            { hospital_id: hospitalId, floor_number: 2, total_beds: 5 }
        ]);

    if (floorError) console.error("❌ Floor Setup Failed:", floorError.message);
    else console.log("✅ Floors 1 and 2 Created.");

    // 5. TEST: Patient Entry and Admission (The "Smart Suggestion" Logic)
    console.log("\n--- Testing Patient Entry & Admission ---");
    const { data: patientData, error: pError } = await supabase
        .from('patients')
        .insert([{ 
            hospital_id: hospitalId, 
            dept_id: deptData.id, 
            name: 'John Doe', 
            is_emergency: true,
            status: 'admitted'
        }])
        .select()
        .single();

    // Simulating finding a free bed on Floor 1
    const { error: admitError } = await supabase
        .from('admissions')
        .insert([{ 
            patient_id: patientData.id, 
            floor_id: (await supabase.from('floors').select('id').eq('floor_number', 1).single()).data.id,
            bed_number: 101 
        }]);

    if (admitError) console.error("❌ Patient Admission Failed:", admitError.message);
    else console.log("✅ Patient 'John Doe' Admitted to Floor 1, Bed 101.");

    // 6. TEST: Simulation Edge Function call
    console.log("\n--- Testing Congestion Edge Function ---");
    const { data: simData, error: simError } = await supabase.functions.invoke('calculate-congestion', {
        body: { dept_id: deptData.id }
    });

    if (simError) console.warn("⚠️ Edge Function Call Failed (Ensure it is deployed):", simError.message);
    else console.log("✅ Congestion Results:", simData);

    // 7. TEST: Discharge (Auto-Update Logic)
    console.log("\n--- Testing Patient Discharge ---");
    const { error: dischargeError } = await supabase
        .from('admissions')
        .update({ discharge_time: new Date().toISOString() })
        .eq('patient_id', patientData.id);

    if (dischargeError) console.error("❌ Discharge Failed:", dischargeError.message);
    else console.log("✅ Patient Discharged. Bed is now free for queries.");

    console.log("\n🏁 All Tests Completed.");
    // ... (previous setup code) ...

// ... (Make sure you have variables for hospitalId and deptData.id from earlier in the script)

// 8. TEST: Double Booking Prevention (Constraint Check)
console.log("\n--- Testing Bed Collision Prevention ---");

// First, we need a second patient to try and "steal" the bed
const { data: secondPatient } = await supabase
    .from('patients')
    .insert([{ hospital_id: hospitalId, dept_id: deptData.id, name: 'Jane Smith' }])
    .select()
    .single();

// We also need the ID of the floor we created in Test #4
const { data: floor1 } = await supabase
    .from('floors')
    .select('id')
    .eq('floor_number', 1)
    .eq('hospital_id', hospitalId)
    .single();

const { error: collisionError } = await supabase
    .from('admissions')
    .insert([{ 
        patient_id: secondPatient.id, 
        floor_id: floor1.id, 
        bed_number: 101 // Same bed number we used for John Doe in Test #5
    }]);

if (collisionError) {
    console.log("✅ Collision Blocked: Database prevented double-booking.");
} else {
    console.error("❌ Logic Failure: Database allowed two patients in one bed!");
}

// 9. TEST: Smart Floor Suggestion Query
console.log("\n--- Testing 'Suggest Free Floor' Query ---");

// This query looks for floors and counts active admissions (where discharge_time is null)
const { data: floorStats, error: suggestError } = await supabase
    .from('floors')
    .select(`
        floor_number,
        total_beds,
        admissions(id)
    `)
    .eq('hospital_id', hospitalId)
    .is('admissions.discharge_time', null);

if (suggestError) {
    console.error("❌ Suggestion Query Failed:", suggestError.message);
} else {
    // Calculate availability locally for the test
    const suggestions = floorStats.map(f => ({
        floor: f.floor_number,
        available: f.total_beds - f.admissions.length
    })).filter(f => f.available > 0);
    
    console.log("✅ Available Floors Found:", suggestions);
}
};

runTests();