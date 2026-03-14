import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const SUPABASE_URL = 'https://ehxxxmuxopuuwphafcdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeHh4bXV4b3B1dXdwaGFmY2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzg5MjgsImV4cCI6MjA4ODgxNDkyOH0.2kFympWljjvxn-omsq4oLDyR3wEMDDNW34YDeiqnhv0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'management', 'reception', 'doctor'
  const [view, setView] = useState('login'); // login, register, dashboard
  const [hospitalData, setHospitalData] = useState(null);
  const [loginError, setLoginError] = useState(null); // New state for error messages

  // --- AUTH LOGIC ---
const handleLogin = async (email, password, selectedRole) => {

  setLoginError(null); // Reset error on new attempt
  // 1. Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  
if (authError) {
        setLoginError(authError.message);
        return;
    }

  const userId = authData.user.id;
  let isValidRole = false;

  // Role Verification logic
    if (selectedRole === 'management') {
      const { data } = await supabase.from('hospitals').select('id').eq('id', userId).single();
      if (data) isValidRole = true;
    } else if (selectedRole === 'reception') {
      const { data } = await supabase.from('staff').select('id').eq('id', userId).eq('role', 'reception').single();
      if (data) isValidRole = true;
    } else if (selectedRole === 'doctor') {
      const { data } = await supabase.from('doctors').select('id').eq('id', userId).single();
      if (data) isValidRole = true;
    }

    if (isValidRole) {
      setUser(authData.user);
      setRole(selectedRole);
      setView('dashboard'); // Only redirect on success
    } else {
      await supabase.auth.signOut();
      setLoginError(`Access Denied: Your account is not registered as ${selectedRole}.`);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
    setView('login');
  };

  if (view === 'login') return <LoginPage onLogin={handleLogin} setView={setView} error={loginError} />;
  if (view === 'register') return <RegisterPage setView={setView} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-slate-900 to-brand-dark">
      <nav className="bg-brand-dark border-b border-brand-border shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚕️</span>
            </div>
            <span className="text-white text-lg font-semibold">Hospital Management</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-300">
              <span className="text-brand-accent font-semibold">{role?.toUpperCase()}</span> | {user?.email}
            </span>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {role === 'management' && <ManagementDashboard user={user} />}
        {role === 'reception' && <ReceptionDashboard user={user} />}
        {role === 'doctor' && <DoctorDashboard user={user} />}
      </main>
    </div>
  );
}

// --- 1. MANAGEMENT: DEPT & FLOOR CONFIG ---
function ManagementDashboard({ user }) {
  const [depts, setDepts] = useState([]);
  const [floors, setFloors] = useState([]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data: d } = await supabase.from('departments').select('*').eq('hospital_id', user.id);
    const { data: f } = await supabase.from('floors').select('*').eq('hospital_id', user.id);
    setDepts(d || []);
    setFloors(f || []);
  };

  const addDept = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    await supabase.from('departments').insert([{ hospital_id: user.id, name }]);
    fetchConfig();
    e.target.reset();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white mb-8">Hospital Configuration</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center text-sm font-bold">+</span>
            Add Department
          </h3>
          <form onSubmit={addDept} className="space-y-4">
            <input 
              name="name" 
              placeholder="Department Name (e.g. Cardiology)" 
              required
              className="w-full px-4 py-3 bg-slate-800 border border-brand-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
            />
            <button 
              type="submit"
              className="w-full px-4 py-3 bg-brand-accent hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
            >
              Add Department
            </button>
          </form>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Departments
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {depts.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No departments added yet</p>
            ) : (
              depts.map(d => (
                <div key={d.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 border-l-4 border-brand-accent">
                  <span className="text-brand-accent text-lg">•</span>
                  <span className="text-white font-medium">{d.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 2. RECEPTION: PATIENTS, BEDS, & DISCHARGE ---
function ReceptionDashboard({ user }) {
  const [patients, setPatients] = useState([]);
  const [beds, setBeds] = useState([]);
  const [depts, setDepts] = useState([]);

  useEffect(() => {
    loadReceptionData();
  }, []);

  const loadReceptionData = async () => {
    // Feature: Bed Allocation Box logic
    const { data: f } = await supabase.from('floors').select(`*, admissions(id, discharge_time)`).eq('hospital_id', user.id);
    const { data: d } = await supabase.from('departments').select('*').eq('hospital_id', user.id);
    const { data: p } = await supabase.from('patients').select('*, admissions(*)').eq('hospital_id', user.id).neq('status', 'discharged');
    
    setBeds(f || []);
    setDepts(d || []);
    setPatients(p || []);
  };

  const admitPatient = async (e) => {
    e.preventDefault();
    const { name, dept_id, floor_id, is_emergency } = e.target.elements;
    
    // Create Patient
    const { data: p } = await supabase.from('patients').insert([{ 
      hospital_id: user.id, name: name.value, dept_id: dept_id.value, is_emergency: is_emergency.checked, status: 'admitted' 
    }]).select().single();

    // Feature: Smart Bed Allocation
    await supabase.from('admissions').insert([{ 
      patient_id: p.id, floor_id: floor_id.value, bed_number: Math.floor(Math.random() * 100) 
    }]);

    loadReceptionData();
    e.target.reset();
  };

  const dischargePatient = async (id) => {
    // Feature: Auto-update bed as free
    await supabase.from('admissions').update({ discharge_time: new Date() }).eq('patient_id', id);
    await supabase.from('patients').update({ status: 'discharged' }).eq('id', id);
    loadReceptionData();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-8">Bed & Patient Management</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admit Patient Form */}
        <div className="lg:col-span-1 bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">➕</span>
            Admit Patient
          </h3>
          <form onSubmit={admitPatient} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Patient Name</label>
              <input 
                name="name" 
                placeholder="Full Name" 
                required
                className="w-full px-4 py-2 bg-slate-800 border border-brand-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Department</label>
              <select 
                name="dept_id"
                className="w-full px-4 py-2 bg-slate-800 border border-brand-border rounded-lg text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
              >
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Floor</label>
              <select 
                name="floor_id"
                className="w-full px-4 py-2 bg-slate-800 border border-brand-border rounded-lg text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition"
              >
                {beds.map(f => (
                  <option key={f.id} value={f.id}>
                    Floor {f.floor_number} - {f.total_beds - f.admissions.filter(a => !a.discharge_time).length} free beds
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
              <input type="checkbox" name="is_emergency" className="w-4 h-4 accent-brand-accent cursor-pointer" />
              <span className="font-medium">Emergency Admission</span>
            </label>
            <button 
              type="submit"
              className="w-full px-4 py-3 bg-brand-accent hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
            >
              Admit & Assign Bed
            </button>
          </form>
        </div>

        {/* Bed Occupancy */}
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">🛏️</span>
            Bed Occupancy Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beds.map(f => {
              const occupiedBeds = f.admissions.filter(a => !a.discharge_time).length;
              const occupancyRate = (occupiedBeds / f.total_beds) * 100;
              return (
                <div key={f.id} className="bg-slate-800 border border-brand-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white font-semibold">Floor {f.floor_number}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      occupancyRate >= 80 ? 'bg-red-900 text-red-200' : 
                      occupancyRate >= 50 ? 'bg-yellow-900 text-yellow-200' : 
                      'bg-green-900 text-green-200'
                    }`}>
                      {occupancyRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        occupancyRate >= 80 ? 'bg-red-500' : 
                        occupancyRate >= 50 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-sm mt-2">{occupiedBeds} / {f.total_beds} beds occupied</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Patients */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">👥</span>
          Active Patients ({patients.length})
        </h3>
        {patients.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No active patients</p>
        ) : (
          <div className="space-y-3">
            {patients.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-4 border-l-4 border-brand-accent hover:bg-slate-750 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-accent rounded-full flex items-center justify-center text-white font-bold">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{p.name}</p>
                    <p className={`text-xs font-medium ${p.is_emergency ? 'text-red-400' : 'text-slate-400'}`}>
                      {p.is_emergency ? '🚨 EMERGENCY' : '✓ Normal Admission'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => dischargePatient(p.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Discharge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- 3. DOCTOR: CLOCK-IN & CONGESTION ---
function DoctorDashboard({ user }) {
  const [isClocked, setIsClocked] = useState(false);
  const [congestion, setCongestion] = useState(null);

  const toggleClock = async () => {
    const { data } = await supabase.from('doctors').update({ is_clocked_in: !isClocked }).eq('id', user.id).select().single();
    setIsClocked(data.is_clocked_in);
  };

  const checkCongestion = async (deptId) => {
    // Feature: Per-dept congestion calculation
    const { data } = await supabase.functions.invoke('calculate-congestion', { body: { dept_id: deptId } });
    setCongestion(data);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-8">Doctor Portal</h2>
      
      {/* Status Card */}
      <div className="bg-gradient-to-r from-brand-surface to-slate-800 border border-brand-border rounded-xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-2">CURRENT STATUS</p>
            <p className={`text-3xl font-bold ${isClocked ? 'text-green-400' : 'text-slate-400'}`}>
              {isClocked ? '🔴 Active' : '⭕ Offline'}
            </p>
          </div>
          <button 
            onClick={toggleClock}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
              isClocked 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-brand-accent hover:bg-emerald-600 text-white'
            }`}
          >
            {isClocked ? 'Clock Out' : 'Clock In'}
          </button>
        </div>
      </div>

      {/* Congestion Check */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Department Congestion
        </h3>
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => checkCongestion('YOUR_DEPT_ID')}
            className="px-6 py-3 bg-brand-accent hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
          >
            Refresh Stats
          </button>
        </div>
        
        {congestion ? (
          <div className="bg-slate-800 rounded-lg p-6 border border-brand-border font-mono text-sm text-slate-300 max-h-96 overflow-y-auto">
            <pre>{JSON.stringify(congestion, null, 2)}</pre>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400 border border-dashed border-brand-border">
            <p className="text-lg">Click "Refresh Stats" to view congestion data</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SIMPLE LOGIN/REGISTER COMPONENTS ---
function LoginPage({ onLogin, setView }) {
  const [role, setRole] = useState('management');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-slate-900 to-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-4xl">⚕️</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Hospital Management</h1>
          <p className="text-slate-400">Professional Healthcare System</p>
        </div>

        {/* Login Form */}
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            onLogin(e.target.email.value, e.target.password.value, role); 
          }}
          className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl p-8 space-y-5"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-6">Login</h2>
          
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Email Address</label>
            <input 
              name="email" 
              type="email" 
              placeholder="admin@hospital.com" 
              required
              className="w-full px-4 py-3 bg-slate-800 border border-brand-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
            <input 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              required
              className="w-full px-4 py-3 bg-slate-800 border border-brand-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Role</label>
            <select 
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-brand-border rounded-lg text-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition"
            >
              <option value="management">👨‍💼 Management</option>
              <option value="reception">👩‍💻 Reception</option>
              <option value="doctor">👨‍⚕️ Doctor</option>
            </select>
          </div>

          <button 
            type="submit"
            className="w-full px-4 py-3 bg-brand-accent hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors mt-7"
          >
            Sign In
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 mb-4">New hospital?</p>
          <button 
            type="button" 
            onClick={() => setView('register')}
            className="px-6 py-3 border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white font-semibold rounded-lg transition-all"
          >
            Register Hospital
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ setView }) {
  const handleReg = async (e) => {
    e.preventDefault();
    const { email, password, name } = e.target.elements;
    const { data } = await supabase.auth.signUp({ email: email.value, password: password.value });
    await supabase.from('hospitals').insert([{ id: data.user.id, name: name.value }]);
    alert("Hospital Registered! You can now login.");
    setView('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-slate-900 to-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-4xl">⚕️</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Hospital Management</h1>
          <p className="text-slate-400">Register Your Hospital</p>
        </div>

        {/* Register Form */}
        <form 
          onSubmit={handleReg}
          className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl p-8 space-y-5"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-6">Create Hospital Account</h2>
          
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Hospital Name</label>
            <input 
              name="name" 
              placeholder="Central Medical Hospital" 
              required
              className="w-full px-4 py-3 bg-slate-800 border border-brand-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Admin Email</label>
            <input 
              name="email" 
              type="email" 
              placeholder="admin@hospital.com" 
              required
              className="w-full px-4 py-3 bg-slate-800 border border-brand-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
            <input 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              required
              className="w-full px-4 py-3 bg-slate-800 border border-brand-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition"
            />
          </div>

          <button 
            type="submit"
            className="w-full px-4 py-3 bg-brand-accent hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors mt-7"
          >
            Register Hospital
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={() => setView('login')}
            className="text-brand-accent hover:text-emerald-400 font-semibold transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}