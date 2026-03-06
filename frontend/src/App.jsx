import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, UserCog, Stethoscope, ClipboardList, 
  Clock, AlertTriangle, LogOut, RefreshCw, UserPlus, ShieldCheck, UserRoundPlus
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE;

export default function App() {
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role')); 
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Data State
  const [simResults, setSimResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mgmtTab, setMgmtTab] = useState('stats'); // 'stats' or 'doctors'

  // Form States
  const [loginForm, setLoginForm] = useState({ name: '', password: '', role: 'management', drId: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', managementPassword: '', receptionPassword: '' });
  const [docForm, setDocForm] = useState({ drId: '', password: '', serviceTime: 15 });
  const [mgmtForm, setMgmtForm] = useState({ totalBeds: 0, doctorCount: 0, globalServiceTime: 0 });
  const [rcptForm, setRcptForm] = useState({ arrivalRate: 0, emergencyPatients: 0, normalPatients: 0 });

  // Fetch simulation results
  useEffect(() => {
    if (token && role) fetchData();
  }, [token, role]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_BASE}/simulation/results`, config);
      setSimResults(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/hospital/register`, registerForm);
      alert("Hospital Registered Successfully! You can now log in.");
      setIsRegistering(false);
      setRegisterForm({ name: '', managementPassword: '', receptionPassword: '' });
    } catch (err) {
      alert("Registration failed. Name might already be taken.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/login`, loginForm);
      const receivedToken = res.data.token;
      const receivedRole = res.data.role;
      setToken(receivedToken);
      setRole(receivedRole);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('role', receivedRole);
    } catch (err) {
      alert("Login Failed: Check credentials");
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE}/management/add-doctor`, docForm, config);
      alert(`Doctor ${docForm.drId} created successfully!`);
      setDocForm({ drId: '', password: '', serviceTime: 15 });
    } catch (err) {
      alert("Failed to create doctor.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  const updateStats = async (endpoint, data) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.patch(`${API_BASE}${endpoint}`, data, config);
      setTimeout(fetchData, 500);
      alert("System Updated");
    } catch (err) {
      alert("Update failed");
    }
  };

  // --- Auth View (Login / Register) ---
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800">
          <div className="text-center mb-8">
            <div className="bg-blue-600/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <Stethoscope className="text-blue-400" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">{isRegistering ? 'Register Hospital' : 'Welcome Back'}</h1>
            <p className="text-slate-500 text-sm mt-2">HospitalSync</p>
          </div>

          {isRegistering ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-4">
              <InputDark label="Hospital Name" placeholder="City General" required
                onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})} />
              <InputDark label="Management Password" type="password" placeholder="••••••••" required
                onChange={(e) => setRegisterForm({...registerForm, managementPassword: e.target.value})} />
              <InputDark label="Reception Password" type="password" placeholder="••••••••" required
                onChange={(e) => setRegisterForm({...registerForm, receptionPassword: e.target.value})} />
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2" disabled={loading}>
                <UserPlus size={20}/> Create Hospital Account
              </button>
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="bg-slate-800 p-1 rounded-xl flex mb-4">
                {['management', 'reception', 'doctor'].map((r) => (
                  <button key={r} type="button" 
                    onClick={() => setLoginForm({...loginForm, role: r})}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${loginForm.role === r ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
                    {r}
                  </button>
                ))}
              </div>
              {loginForm.role === 'doctor' ? (
                <InputDark label="Doctor ID" placeholder="DR_SMITH_01" required
                  onChange={(e) => setLoginForm({...loginForm, drId: e.target.value})} />
              ) : (
                <InputDark label="Hospital Name" placeholder="General Hospital" required
                  onChange={(e) => setLoginForm({...loginForm, name: e.target.value})} />
              )}
              <InputDark label="Password" type="password" placeholder="••••••••" required
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                <ShieldCheck size={20}/> Secure Access
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors">
              {isRegistering ? "Already have a hospital? Log In" : "Need to register a new hospital?"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Dashboard View ---
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col fixed h-full">
        <h2 className="text-xl font-bold mb-10 flex items-center gap-2 text-blue-400"><Stethoscope size={24}/> HospitalSync</h2>
        <nav className="flex-1 space-y-2">
          <div className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-900/40"><LayoutDashboard size={20}/> Dashboard</div>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-red-400 hover:bg-slate-800 rounded-lg mt-auto transition-colors font-medium"><LogOut size={20}/> Sign Out</button>
      </aside>

      <main className="flex-1 ml-64 p-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Analytics Dashboard</h1>
            <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">Active Role: <span className="text-blue-600">{role}</span></p>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> {loading ? "Syncing..." : "Refresh"}
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard label="Doc Utilization" value={`${simResults?.doctorUtilizationPct || 0}%`} icon={<UserCog className="text-purple-500"/>} />
          <StatCard label="Queue Total" value={simResults?.totalQueueLength || 0} icon={<ClipboardList className="text-blue-500"/>} />
          <StatCard label="Free Beds" value={simResults?.availableBeds || 0} icon={<div className={`w-3 h-3 rounded-full ${simResults?.availableBeds > 0 ? 'bg-green-500' : 'bg-red-500'}`}/>} />
          <StatCard label="Congestion" value={simResults?.congestionLevel || "..."} color={simResults?.congestionLevel === 'High' ? 'text-red-600' : 'text-green-600'} icon={<AlertTriangle className={simResults?.congestionLevel === 'High' ? 'text-red-500' : 'text-green-500'}/>} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Prediction Times Panel */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-lg font-bold mb-6 text-slate-700 flex items-center gap-2"><Clock className="text-slate-400" size={20}/> Prediction Times</h3>
            <div className="space-y-6">
              <TimeBar label="Emergency Patient" time={simResults?.emergencyWaitingTimeMin || 0} max={30} color="bg-red-500" />
              <TimeBar label="Normal Patient" time={simResults?.normalWaitingTimeMin || 0} max={60} color="bg-blue-500" />
              <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-800 font-semibold flex items-center gap-2">
                <AlertTriangle size={16}/> Admission Delay: {simResults?.admissionDelayMin || 0} mins
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-700">Control Panel</h3>
              {role === 'management' && (
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => setMgmtTab('stats')} className={`px-3 py-1 text-xs font-bold rounded-md ${mgmtTab === 'stats' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>System</button>
                  <button onClick={() => setMgmtTab('doctors')} className={`px-3 py-1 text-xs font-bold rounded-md ${mgmtTab === 'doctors' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Doctors</button>
                </div>
              )}
            </div>
            
            {/* Management - System Stats Tab */}
            {role === 'management' && mgmtTab === 'stats' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Beds" type="number" onChange={(e) => setMgmtForm({...mgmtForm, totalBeds: e.target.value})} />
                  <Input label="Doc Limit" type="number" onChange={(e) => setMgmtForm({...mgmtForm, doctorCount: e.target.value})} />
                </div>
                <Input label="Service Time (Mins)" type="number" onChange={(e) => setMgmtForm({...mgmtForm, globalServiceTime: e.target.value})} />
                <button onClick={() => updateStats('/management/update-hospital', mgmtForm)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold mt-2">Update Infrastructure</button>
              </div>
            )}

            {/* Management - Doctor Creation Tab */}
            {role === 'management' && mgmtTab === 'doctors' && (
              <form onSubmit={handleCreateDoctor} className="space-y-4">
                <Input label="Doctor ID" placeholder="DR_NAME" value={docForm.drId} onChange={(e) => setDocForm({...docForm, drId: e.target.value})} />
                <Input label="Doctor Password" type="password" value={docForm.password} onChange={(e) => setDocForm({...docForm, password: e.target.value})} />
                <Input label="Specific Service Time" type="number" value={docForm.serviceTime} onChange={(e) => setDocForm({...docForm, serviceTime: e.target.value})} />
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><UserRoundPlus size={18}/> Create Doctor</button>
              </form>
            )}

            {/* Reception */}
            {role === 'reception' && (
              <div className="space-y-5">
                <Input label="Arrival Rate (p/hr)" type="number" onChange={(e) => setRcptForm({...rcptForm, arrivalRate: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Emergency" type="number" onChange={(e) => setRcptForm({...rcptForm, emergencyPatients: e.target.value})} />
                  <Input label="Normal" type="number" onChange={(e) => setRcptForm({...rcptForm, normalPatients: e.target.value})} />
                </div>
                <button onClick={() => updateStats('/reception/update-stats', rcptForm)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-2">Sync Flow</button>
              </div>
            )}

            {/* Doctor */}
            {role === 'doctor' && (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6"><Clock size={32} className="text-blue-600"/></div>
                <button onClick={() => updateStats('/doctor/clock', {})} className="px-10 py-4 bg-blue-600 text-white rounded-full font-bold shadow-xl shadow-blue-100 hover:scale-105 transition-all">Clock In / Out</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ label, value, icon, color = "text-slate-800" }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:border-blue-200">
      <div className="flex justify-between items-start mb-4"><span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</span> {icon}</div>
      <span className={`text-3xl font-black tracking-tight ${color}`}>{value}</span>
    </div>
  );
}

function TimeBar({ label, time, max, color }) {
  const percentage = Math.min((time / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-2"><span>{label}</span><span className="text-slate-400">{time}m</span></div>
      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-50"><div className={`${color} h-full transition-all duration-700`} style={{ width: `${percentage}%` }} /></div>
    </div>
  );
}

function Input({ label, isDark = false, ...props }) {
  return (
    <div className="w-full text-left">
      <label className={`block text-[10px] font-black mb-1 uppercase tracking-tighter ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</label>
      <input className={`w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`} {...props} />
    </div>
  );
}

function InputDark({ label, ...props }) {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest ml-1">{label}</label>
      <input className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-white placeholder-slate-600" {...props} />
    </div>
  )
}
