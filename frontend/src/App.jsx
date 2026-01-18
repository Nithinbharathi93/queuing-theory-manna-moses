import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// --- CONFIGURATION ---
const API_BASE = import.meta.env.VITE_API_BASE;
const api = axios.create({ baseURL: API_BASE });

// --- REUSABLE UI COMPONENTS ---
// 1. Unified Input Field
const InputField = ({ label, ...props }) => (
  <div className="space-y-2">
    {label && <label className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] ml-1">{label}</label>}
    <input 
      className="w-full p-4 bg-[#0f172a] border border-[#334155] rounded-2xl text-white placeholder:text-slate-600 focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all"
      {...props}
    />
  </div>
);

// 2. Unified Action Button
const ActionButton = ({ children, onClick, variant = 'primary', className = '' }) => {
  const baseStyle = "w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95";
  const variants = {
    primary: "bg-[#10b981] text-[#0f172a] hover:bg-[#34d399] shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    outline: "bg-transparent border border-[#334155] text-slate-400 hover:border-[#10b981] hover:text-white"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// 3. Unified Card
const Card = ({ children, className = '' }) => (
  <div className={`bg-[#1e293b] border border-[#334155] p-8 rounded-[30px] shadow-2xl ${className}`}>
    {children}
  </div>
);

// --- NAVBAR ---
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    setUserRole(localStorage.getItem('user_role'));
  }, [location]);

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(null);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-md border-b border-[#334155] px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="relative">
             <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center font-black text-[#0f172a] transition-all group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]">H</div>
             {userRole && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0f172a] animate-pulse" />}
          </div>
          <h1 className="hidden sm:block font-bold text-xl tracking-tight text-white uppercase italic">
            Hospital<span className="text-[#10b981] not-italic font-black">Sync</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {userRole ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-ping" />
                <span className="text-[10px] font-black text-[#10b981] uppercase tracking-widest">{userRole} Active</span>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest">Sign Out</button>
            </>
          ) : (
            <button onClick={() => navigate('/register')} className="bg-[#10b981] text-[#0f172a] px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-[#10b981]/20">
              Join Network
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- PAGES ---

// 1. LANDING
const Landing = () => {
  const navigate = useNavigate();
  const roles = [
    { id: 'management', icon: '🏢', label: 'Admin Ops' },
    { id: 'reception', icon: '⚡', label: 'Front Desk' },
    { id: 'doctor', icon: '🩺', label: 'Medical Staff' }
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12 space-y-4">
        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">System <span className="text-[#10b981]">Entry</span></h2>
        <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">Select your authorization level</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {roles.map((r) => (
          <div key={r.id} onClick={() => navigate(`/login/${r.id}`)} 
            className="bg-[#1e293b] border border-[#334155] p-10 rounded-3xl hover:border-[#10b981] hover:shadow-[0_0_40px_rgba(16,185,129,0.1)] hover:-translate-y-2 transition-all cursor-pointer group flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-[#0f172a] rounded-2xl flex items-center justify-center text-3xl group-hover:text-[#10b981] transition-colors border border-[#334155]">
              {r.icon}
            </div>
            <h3 className="uppercase font-black text-slate-300 text-xl tracking-widest group-hover:text-white">{r.label}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. REGISTER
const Register = () => {
  const [form, setForm] = useState({ email: '', password: '', hospital_name: '', reception_password: '', total_beds: 50 });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register-hospital', form);
      navigate('/login/management');
    } catch (err) { alert("Registration failed"); }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Initialize Node</h2>
          <p className="text-slate-400 text-sm mt-2">Create new hospital cluster</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField placeholder="Hospital Name" onChange={e => setForm({...form, hospital_name: e.target.value})} required />
          <InputField type="email" placeholder="Admin Email" onChange={e => setForm({...form, email: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
             <InputField type="password" placeholder="Admin Pass" onChange={e => setForm({...form, password: e.target.value})} required />
             <InputField type="password" placeholder="Shared Pass" onChange={e => setForm({...form, reception_password: e.target.value})} required />
          </div>
          <InputField type="number" placeholder="Total Capacity" onChange={e => setForm({...form, total_beds: e.target.value})} required />
          <ActionButton className="mt-4">Deploy Network</ActionButton>
        </form>
      </Card>
    </div>
  );
};

// 3. LOGIN
const Login = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const endpoint = `/auth/${role}`;
      const payload = role === 'management' ? { email: identifier, password } 
                    : role === 'doctor' ? { dr_id: identifier, password } 
                    : { hospital_name: identifier, password };
      const res = await api.post(endpoint, payload);
      
      localStorage.setItem('user_role', role);
      localStorage.setItem('hospital_id', res.data.hospitalId || res.data.user?.id);
      if(role === 'doctor') localStorage.setItem('doctor_uuid', res.data.doctorId);
      navigate(`/${role}-dash`);
    } catch (err) { alert("Auth Failed"); }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="mb-8">
          <h3 className="text-3xl font-black text-white capitalize mb-2">{role} Access</h3>
          <p className="text-slate-400 font-medium">Verify credentials to enter portal.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <InputField 
            label="Identity Key"
            placeholder={role === 'doctor' ? 'Enter DR-ID' : 'Enter Username'}
            onChange={e => setIdentifier(e.target.value)}
          />
          <InputField 
            label="Access Token"
            type="password"
            placeholder="••••••••"
            onChange={e => setPassword(e.target.value)}
          />
          <ActionButton className="mt-4">Authorize Session</ActionButton>
        </form>
      </Card>
    </div>
  );
};

// 4. MANAGEMENT DASHBOARD
const ManagementDash = () => {
  const [newDr, setNewDr] = useState(null);
  const [serviceTime, setServiceTime] = useState(15);
  const hId = localStorage.getItem('hospital_id');

  const createDoctor = async () => {
    const res = await api.post('/hospital/create-doctor', { hospital_id: hId, service_time: serviceTime });
    setNewDr(res.data);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-8">
      <header>
        <h2 className="text-4xl font-black text-white uppercase tracking-tight">Command Center</h2>
        <p className="text-slate-400">Hospital Administration & Staffing</p>
      </header>

      <Card>
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <InputField 
              label="Staff Processing Rate (Mins)"
              type="number" 
              value={serviceTime}
              onChange={e => setServiceTime(e.target.value)} 
            />
          </div>
          <ActionButton onClick={createDoctor} className="md:w-auto px-8">Generate Doctor ID</ActionButton>
        </div>

        {newDr && (
          <div className="mt-8 p-6 bg-[#0f172a] rounded-2xl border border-[#10b981] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]" />
             <h4 className="text-[#10b981] font-black uppercase tracking-widest text-xs mb-4">Credentials Generated</h4>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <p className="text-slate-500 text-[10px] uppercase">ID Vector</p>
                   <p className="text-white font-mono text-xl">{newDr.dr_id}</p>
                </div>
                <div>
                   <p className="text-slate-500 text-[10px] uppercase">Pass Key</p>
                   <p className="text-white font-mono text-xl">{newDr.tempPassword}</p>
                </div>
             </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// 5. RECEPTION DASHBOARD
const ReceptionDash = () => {
  const [stats, setStats] = useState({ arrival_rate: 0, emergency_patients: 0, normal_patients: 0 });
  const [sim, setSim] = useState(null);
  const hId = localStorage.getItem('hospital_id');

  const fetchData = async () => {
    const res = await api.get(`/queue/simulate/${hId}`);
    setSim(res.data);
    setStats(prev => ({ ...prev, arrival_rate: res.data.arrival_rate || 0 }));
  };

  useEffect(() => { fetchData(); }, [hId]);

  const handleSync = async () => {
     await api.patch('/hospital/update-stats', { hospital_id: hId, ...stats });
     fetchData();
  };

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8">
        
        {/* LEFT: Live Analytics */}
        <div className="lg:col-span-8 space-y-8">
          <header>
            <h2 className="text-4xl font-black text-white tracking-tight">Live <span className="text-[#10b981]">Dynamics</span></h2>
            <p className="text-slate-400">Real-time patient flow calculation.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <MetricDisplay label="Wait Time" value={`${sim?.normalWaitingTimeMin || 0}m`} sub="Estimated" />
             <MetricDisplay label="Utilization" value={`${sim?.doctorUtilizationPct || 0}%`} sub="Staff Load" />
             <MetricDisplay label="Bed Count" value={sim?.availableBeds || 0} sub="Available" />
          </div>

          <div className="bg-[#1e293b] border border-[#334155] p-8 rounded-[40px] relative overflow-hidden">
             <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div>
                   <p className="text-[#10b981] font-black text-xs uppercase tracking-[0.3em] mb-4">Congestion Vector</p>
                   <h3 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-white">{sim?.congestionLevel || 'N/A'}</h3>
                </div>
                <div className="md:text-right">
                   <p className="text-slate-500 text-xs font-bold uppercase">Queue Population</p>
                   <p className="text-4xl font-black text-white">{sim?.totalQueueLength || 0}</p>
                </div>
             </div>
             {/* Glow Effect */}
             <div className={`absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-20 ${sim?.congestionLevel === 'High' ? 'bg-red-500' : 'bg-[#10b981]'}`} />
          </div>
        </div>

        {/* RIGHT: Control Panel */}
        <Card className="lg:col-span-4 self-start sticky top-28">
          <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Input Stream</h3>
          <div className="space-y-6">
            {['arrival_rate', 'emergency_patients', 'normal_patients'].map(key => (
              <InputField 
                key={key}
                label={key.replace('_', ' ')}
                type="number"
                value={stats[key]}
                onChange={e => setStats({...stats, [key]: Number(e.target.value)})}
              />
            ))}
            <ActionButton onClick={handleSync}>Sync To Core</ActionButton>
          </div>
        </Card>
      </div>
    </div>
  );
};

const MetricDisplay = ({ label, value, sub }) => (
  <div className="bg-[#1e293b] border border-[#334155] p-6 rounded-3xl">
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-black text-white">{value}</p>
    <p className="text-[10px] text-[#10b981] font-bold mt-2 uppercase">{sub}</p>
  </div>
);

// 6. DOCTOR DASHBOARD
const DoctorDash = () => {
  const [clockedIn, setClockedIn] = useState(false);
  const drUuid = localStorage.getItem('doctor_uuid');

  const toggleClock = async () => {
    // In production, sync with DB. Mocking for UI state here.
    try {
        await api.post('/doctor/toggle-clock', { doctor_id: drUuid, is_clocking_in: !clockedIn });
    } catch(e) { console.error("API error, toggling UI only"); }
    setClockedIn(!clockedIn);
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 space-y-12">
      <div className="relative">
         <div className={`w-64 h-64 rounded-full border border-[#334155] bg-[#1e293b] flex items-center justify-center transition-all duration-700 ${clockedIn ? 'shadow-[0_0_100px_rgba(16,185,129,0.2)]' : ''}`}>
             <div className={`w-56 h-56 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${clockedIn ? 'bg-[#10b981] scale-100' : 'bg-[#0f172a] scale-90 border border-[#334155]'}`}>
                 <span className="text-6xl mb-2">{clockedIn ? '🟢' : '⚪'}</span>
                 <span className={`text-xs font-black uppercase tracking-widest ${clockedIn ? 'text-[#0f172a]' : 'text-slate-500'}`}>
                    {clockedIn ? 'System Active' : 'Offline'}
                 </span>
             </div>
         </div>
      </div>
      
      <div className="text-center space-y-6">
        <div>
           <h2 className="text-3xl font-black text-white">{clockedIn ? 'Shift In Progress' : 'Standby Mode'}</h2>
           <p className="text-slate-400 text-sm">Status affects algorithmic patient distribution.</p>
        </div>
        <button 
           onClick={toggleClock} 
           className={`px-12 py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all hover:scale-105 ${clockedIn ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' : 'bg-[#10b981] text-[#0f172a] shadow-lg shadow-[#10b981]/20'}`}>
           {clockedIn ? 'Terminate Shift' : 'Initiate Shift'}
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200 selection:bg-[#10b981] selection:text-[#0f172a]">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/management-dash" element={<ManagementDash />} />
          <Route path="/reception-dash" element={<ReceptionDash />} />
          <Route path="/doctor-dash" element={<DoctorDash />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}