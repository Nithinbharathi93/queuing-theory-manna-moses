import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const SUPABASE_URL = 'https://ehxxxmuxopuuwphafcdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeHh4bXV4b3B1dXdwaGFmY2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzg5MjgsImV4cCI6MjA4ODgxNDkyOH0.2kFympWljjvxn-omsq4oLDyR3wEMDDNW34YDeiqnhv0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loginError, setLoginError] = useState(null);

  // --- 1. AUTH LOGIC WITH ROLE VERIFICATION ---
const handleLogin = async (email, password, selectedRole) => {
  setLoginError(null);
  
  // 1. Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) return setLoginError(authError.message);
  
  const userId = authData.user.id;
  let isValidRole = false;

  // 2. Cross-reference Table Check
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

  // 3. Final Redirection
  if (isValidRole) {
    setUser(authData.user);
    setRole(selectedRole);
    setView('dashboard');
  } else {
    await supabase.auth.signOut();
    setLoginError(`Access Denied: You are not a registered ${selectedRole}.`);
  }
};

  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setView('login');
  };

  if (view === 'login') return <LoginPage onLogin={handleLogin} setView={setView} error={loginError} />;
  if (view === 'register') return <RegisterPage setView={setView} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <nav className="bg-white shadow-sm px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shadow-inner">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <strong className="text-xl font-black text-blue-700 tracking-tight">{role.toUpperCase()} <span className="font-light text-slate-400">PORTAL</span></strong>
          <span className="hidden sm:inline-block w-px h-6 bg-gray-300"></span>
          <span className="text-slate-500 text-sm font-medium">Logged in as: <span className="text-slate-800">{user.email}</span></span>
        </div>
        <button onClick={handleLogout} className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold py-2 px-5 rounded-lg shadow-sm transition-all flex items-center gap-2">
          Logout
        </button>
      </nav>
      <main className="p-4 sm:p-8 max-w-7xl mx-auto">
        {role === 'management' && <ManagementDashboard user={user} />}
        {role === 'reception' && <ReceptionDashboard user={user} />}
        {role === 'doctor' && <DoctorDashboard user={user} />}
      </main>
    </div>
  );
}

// --- 2. MANAGEMENT DASHBOARD ---
function ManagementDashboard({ user }) {
  const [depts, setDepts] = useState([]);
  const [floors, setFloors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  // NEW: State to track which floor the admin is looking at
  const [selectedFloor, setSelectedFloor] = useState(null);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    const [d, f, dr, st] = await Promise.all([
      supabase.from('departments').select('*'),
      // NEW: We join admissions and patients so we can see who is on each floor
      supabase.from('floors').select(`
        *,
        admissions(
          bed_number,
          discharge_time,
          patients(name, is_emergency, departments(name))
        )
      `).order('floor_number', { ascending: true }),
      supabase.from('doctors').select('*, departments(name)'),
      supabase.from('staff').select('*')
    ]);
    
    setDepts(d.data || []);
    setFloors(f.data || []);
    setDoctors(dr.data || []);
    setStaff(st.data || []);
  };

  // --- DELETE HANDLERS ---
  const handleDelete = async (table, id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert(error.message);
    else fetchConfig();
  };

  const addDept = async (e) => {
    e.preventDefault();
    await supabase.from('departments').insert([{ hospital_id: user.id, name: e.target.name.value }]);
    e.target.reset();
    fetchConfig();
  };

  const addFloor = async (e) => {
    e.preventDefault();
    await supabase.from('floors').insert([{ 
      hospital_id: user.id, 
      floor_number: parseInt(e.target.num.value), 
      total_beds: parseInt(e.target.beds.value) 
    }]);
    e.target.reset();
    fetchConfig();
  };

  const createStaff = async (e, type) => {
    e.preventDefault();
    const { email, password, dr_id, dept_id } = e.target.elements;
    const { data, error: authError } = await supabase.auth.signUp({ email: email.value, password: password.value });

    if (authError) return alert("Auth Error: " + authError.message);

    const table = type === 'doctor' ? 'doctors' : 'staff';
    const insertData = type === 'doctor' 
      ? { id: data.user.id, dr_id: dr_id.value, hospital_id: user.id, dept_id: dept_id.value }
      : { id: data.user.id, hospital_id: user.id, role: 'reception' };

    const { error: dbError } = await supabase.from(table).insert([insertData]);

    if (dbError) alert(`Linked table insertion failed.`);
    else {
      alert(`${type} created!`);
      e.target.reset();
      fetchConfig();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans">
      {/* LEFT COLUMN: Infrastructure */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">Hospital Infrastructure</h2>
          
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Departments
            </h3>
            <form onSubmit={addDept} className="flex gap-2 mb-4">
              <input name="name" placeholder="Dept Name" required className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm">Add</button>
            </form>
            <ul className="space-y-2">
              {depts.map(d => (
                <li key={d.id} className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-lg border border-slate-100 group">
                  <span className="font-medium text-slate-700">{d.name}</span>
                  <button onClick={() => handleDelete('departments', d.id)} className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Floors & Bed Capacity
          </h3>
          <p className="text-xs text-slate-500 mb-4 -mt-2">Click a floor to see patients</p>
          <form onSubmit={addFloor} className="grid grid-cols-3 gap-2 mb-4">
            <input name="num" type="number" placeholder="Floor No." required className="px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
            <input name="beds" type="number" placeholder="Total Beds" required className="px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors text-sm shadow-sm">Add Floor</button>
          </form>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Floor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Occupancy</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {floors.map(f => {
                  const activeAdmissions = f.admissions.filter(a => !a.discharge_time).length;
                  const isSelected = selectedFloor?.id === f.id;
                  return (
                    <tr 
                      key={f.id} 
                      onClick={() => setSelectedFloor(f)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap"><span className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>Floor {f.floor_number}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600">{activeAdmissions} / {f.total_beds}</span>
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                            <div className={`h-full ${activeAdmissions / f.total_beds > 0.8 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (activeAdmissions / f.total_beds) * 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete('floors', f.id); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* NEW: FLOOR DETAILS VIEW */}
        {selectedFloor && (
          <section className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl shadow-inner border border-indigo-100 transition-all duration-300 transform scale-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-indigo-900">Floor {selectedFloor.floor_number} - Current Patients</h3>
              <button onClick={() => setSelectedFloor(null)} className="text-indigo-400 hover:text-indigo-700 bg-white hover:bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-indigo-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-indigo-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Bed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dept</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedFloor.admissions.filter(a => !a.discharge_time).length > 0 ? (
                    selectedFloor.admissions.filter(a => !a.discharge_time).map((adm, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-600">#{adm.bed_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-800">{adm.patients.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{adm.patients.departments?.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {adm.patients.is_emergency ? 
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>Emergency</span> : 
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Normal</span>
                          }
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="px-4 py-8 text-center text-sm text-slate-500 italic">No patients currently admitted on this floor.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* RIGHT COLUMN: Staff Management */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">User Management</h2>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Register Receptionist
            </h3>
            <form onSubmit={(e) => createStaff(e, 'reception')} className="space-y-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <input name="email" type="email" placeholder="Email Address" required className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
              <input name="password" type="password" placeholder="Password" required className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors text-sm shadow-sm">Add Receptionist</button>
            </form>
            
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Receptionists</h4>
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              <ul className="divide-y divide-slate-200">
                {staff.map((s, idx) => (
                  <li key={s.id} className={`flex justify-between items-center px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {s.id.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">ID: {s.id.substring(0,8)}...</p>
                        <p className="text-xs text-slate-500 capitalize">{s.role}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete('staff', s.id)} className="text-red-500 hover:bg-red-50 text-xs font-semibold px-2 py-1 rounded transition-colors">Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Register Doctor
            </h3>
            <form onSubmit={(e) => createStaff(e, 'doctor')} className="space-y-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <input name="dr_id" placeholder="Doctor ID (e.g. DOC1)" required className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
              <input name="email" type="email" placeholder="Email Address" required className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
              <input name="password" type="password" placeholder="Password" required className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
              <select name="dept_id" className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-700">
                <option value="">Select Department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 rounded-lg transition-colors text-sm shadow-sm">Add Doctor</button>
            </form>
            
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Doctors</h4>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dr ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dept</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {doctors.map(dr => (
                    <tr key={dr.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{dr.dr_id}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        <span className="bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded text-xs border border-slate-200">{dr.departments?.name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button onClick={() => handleDelete('doctors', dr.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-semibold transition-colors">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// --- 3. RECEPTION DASHBOARD ---
function ReceptionDashboard({ user }) {
  const [data, setData] = useState({ patients: [], beds: [], depts: [], doctors: [] });
  const [congestionData, setCongestionData] = useState({});
  const [floorCongestion, setFloorCongestion] = useState({});
  

  useEffect(() => {
    loadData();
    
    // Optional: Real-time listener to refresh data when admissions change
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, () => loadData())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const loadData = async () => {
    // 1. Fetch data with relational joins for the Table display
    const [d, f, p, dr] = await Promise.all([
      supabase.from('departments').select('*'),
      supabase.from('floors').select('*, admissions(*)').filter('admissions.discharge_time', 'is', null),
      // Join floors through admissions to show Floor No. in the patient table
      supabase.from('patients').select(`
        *, 
        admissions(bed_number, floors(floor_number))
      `).neq('status', 'discharged'),
      supabase.from('doctors').select('*, departments(name)').eq('is_clocked_in', true)
    ]);

    const depts = d.data || [];
    setData({
      depts,
      beds: f.data || [],
      patients: p.data || [],
      doctors: dr.data || []
    });

    // 1. Refresh Dept Congestion
    depts.forEach(dept => refreshCongestion(dept.id, null, 'dept'));

    // 2. NEW: Refresh Floor Congestion
    f.data.forEach(floor => refreshCongestion(null, floor.id, 'floor'));
  };

  const refreshCongestion = async (deptId, floorId, type) => {
    try {
      const { data: result } = await supabase.functions.invoke('calculate-congestion', {
        body: { dept_id: deptId, floor_id: floorId }
      });
      if (result) {
        if (type === 'dept') setCongestionData(prev => ({ ...prev, [deptId]: result }));
        else setFloorCongestion(prev => ({ ...prev, [floorId]: result }));
      }
    } catch (err) {
      console.error("Congestion check failed:", err);
    }
  };

  const admit = async (e) => {
    e.preventDefault();
    const { name, dept_id, floor_id, is_emergency } = e.target.elements;
    
    // Find the correct hospital_id for the staff member
    const { data: staffInfo } = await supabase.from('staff').select('hospital_id').eq('id', user.id).single();

    const { data: patient } = await supabase.from('patients').insert([{ 
      hospital_id: staffInfo.hospital_id, 
      name: name.value, 
      dept_id: dept_id.value, 
      is_emergency: is_emergency.checked, 
      status: 'admitted' 
    }]).select().single();

    await supabase.from('admissions').insert([{ 
      patient_id: patient.id, 
      floor_id: floor_id.value, 
      bed_number: Math.floor(Math.random() * 500) 
    }]);

    loadData();
  };

  const discharge = async (pid) => {
    // Feature 6: Auto-update bed to free
    await supabase.from('admissions').update({ discharge_time: new Date() }).eq('patient_id', pid);
    await supabase.from('patients').update({ status: 'discharged' }).eq('id', pid);
    loadData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
      {/* LEFT: ADMISSION & DOCTORS */}
      <div className="space-y-6 lg:col-span-1">
        <section className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500 overflow-hidden">
          <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
            Admit Patient
          </h3>
          <form className="space-y-4" onSubmit={admit}>
            <div>
              <input name="name" placeholder="Patient Full Name" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
              <select name="dept_id" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700">
                {data.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assign Floor</label>
              <select name="floor_id" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700">
                {data.beds.map(f => {
                  const free = f.total_beds - f.admissions.length;
                  return <option key={f.id} value={f.id}>Floor {f.floor_number} ({free} free beds)</option>
                })}
              </select>
            </div>
            <label className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
              <input type="checkbox" name="is_emergency" className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-red-300" />
              <span className="text-sm font-semibold text-red-700 flex items-center gap-1">🚨 Mark as Emergency</span>
            </label>
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Admit & Assign Bed
            </button>
          </form>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            Active Doctors ({data.doctors.length})
          </h3>
          <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {data.doctors.length > 0 ? data.doctors.map(dr => (
              <div key={dr.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <b className="text-sm font-semibold text-slate-700">{dr.dr_id}</b>
                  </div>
                  <small className="text-xs text-slate-500 ml-4.5">{dr.departments?.name}</small>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500 italic p-4 text-center bg-slate-50 rounded-lg border border-slate-100">No doctors currently clocked in.</p>}
          </div>
        </section>
      </div>

      {/* RIGHT: LIVE STATS & PATIENT TABLE */}
      <div className="space-y-6 lg:col-span-2">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            Live Department Wait Times
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.depts.map(dept => {
              const stat = congestionData[dept.id];
              const isHigh = stat?.congestionLevel === 'High';
              return (
                <div key={dept.id} className={`p-4 rounded-xl border transition-colors ${isHigh ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-100'}`}>
                  <strong className="block text-sm font-bold text-slate-800 mb-1 truncate" title={dept.name}>{dept.name}</strong>
                  <div className={`text-lg font-black ${isHigh ? 'text-red-600' : 'text-emerald-600'}`}>
                    {stat?.congestionLevel || '...'}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1">
                    Est. Wait: {stat?.normalWait?.toFixed(0) || 0} min
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            Floor Occupancy & Congestion
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {data.beds.map(f => {
              const stat = floorCongestion[f.id];
              const isHigh = stat?.congestionLevel === 'High';
              const fillPercentage = f.total_beds > 0 ? (f.admissions.length / f.total_beds) * 100 : 0;
              
              return (
                <div key={f.id} className={`min-w-[160px] snap-center p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${isHigh ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <b className="text-sm font-bold text-slate-700 mb-1">Floor {f.floor_number}</b>
                  <span className={`text-sm font-black mb-3 px-2 py-0.5 rounded-full ${isHigh ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {stat?.congestionLevel || 'Normal'}
                  </span>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${isHigh ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${fillPercentage}%`}}></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{f.admissions.length} / {f.total_beds} Beds</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            Admitted Patients
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Floor</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.patients.length > 0 ? data.patients.map(p => {
                  const floorNum = p.admissions?.[0]?.floors?.floor_number || 'N/A';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">{p.name.charAt(0)}</div>
                          <div className="ml-3">
                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-500">ID: {p.id.substring(0,8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {p.is_emergency ? 
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800"><span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>Emergency</span> : 
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Normal</span>
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-slate-600">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">Floor {floorNum}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button onClick={() => discharge(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-semibold rounded-lg transition-all shadow-sm">
                          Discharge
                        </button>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan="4" className="px-6 py-10 text-center text-sm text-slate-500 italic">No patients admitted currently.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

// --- 4. DOCTOR DASHBOARD ---
function DoctorDashboard({ user }) {
  const [doc, setDoc] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => { 
    supabase.from('doctors').select('*, departments(name)').eq('id', user.id).single().then(({data}) => setDoc(data));
  }, []);

  const toggleClock = async () => {
    const { data } = await supabase.from('doctors').update({ is_clocked_in: !doc.is_clocked_in }).eq('id', user.id).select().single();
    setDoc({ ...doc, is_clocked_in: data.is_clocked_in });
  };

  const getStats = async () => {
    const { data } = await supabase.functions.invoke('calculate-congestion', { body: { dept_id: doc.dept_id } });
    setStats(data);
  };

  return (
    <div className="max-w-4xl mx-auto font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header Profile */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-6 sm:px-10 py-8 sm:py-12 text-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4 backdrop-blur-sm border border-white/10 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              {doc?.departments?.name || 'Department'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Dr. {doc?.dr_id}</h2>
          </div>
          <div className="sm:text-right">
            <span className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold shadow-sm ${doc?.is_clocked_in ? 'bg-white text-emerald-600' : 'bg-slate-800/40 text-white border border-white/20'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${doc?.is_clocked_in ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              {doc?.is_clocked_in ? 'Active / Clocked In' : 'Offline / Clocked Out'}
            </span>
          </div>
        </div>

        {/* Actions Body */}
        <div className="p-6 sm:p-10 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-8 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${doc?.is_clocked_in ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Shift Management</h3>
              <p className="text-sm text-slate-500 mb-6 h-10 w-4/5 mx-auto">Sign in to start accepting patients and appearing active on the dashboard.</p>
              <button onClick={toggleClock} className={`w-full py-3.5 px-4 rounded-lg font-bold text-sm transition-all shadow-sm ${doc?.is_clocked_in ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-4 focus:ring-emerald-500/30 border border-transparent'}`}>
                {doc?.is_clocked_in ? 'Clock Out' : 'Clock In Now'}
              </button>
            </div>
            
            <div className="p-8 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Department Stats</h3>
              <p className="text-sm text-slate-500 mb-6 h-10 w-4/5 mx-auto">Check live wait times and congestion levels for your department.</p>
              <button onClick={getStats} className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm focus:ring-4 focus:ring-blue-500/30 border border-transparent">
                Calculate Wait Times
              </button>
            </div>
          </div>
          
          {stats && (
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-3xl mx-auto mt-8 overflow-hidden font-sans">
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2 text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-bold tracking-wider uppercase text-slate-700">Real-Time Statistics</span>
                </div>
                <button 
                  onClick={() => setStats(null)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-white rounded-md shadow-sm border border-slate-200 hover:bg-slate-100"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Body: Metric Cards */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Congestion Level */}
                  <div className={`p-4 rounded-xl border ${stats.congestionLevel === 'High' ? 'bg-red-50 border-red-200 text-red-700' : stats.congestionLevel === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} flex flex-col justify-between`}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Congestion</p>
                    <p className="text-xl font-bold">{stats.congestionLevel || 'Normal'}</p>
                  </div>
                  
                  {/* Queue Length */}
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 flex flex-col justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Patients Waiting</p>
                    <p className="text-2xl font-bold">{stats.queueLength || 0}</p>
                  </div>
                  
                  {/* Normal Wait */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">Avg Wait Time</p>
                    <p className="text-2xl font-bold flex items-baseline gap-1">
                      {stats.normalWait?.toFixed(0) || 0}
                      <span className="text-sm font-medium text-slate-500">min</span>
                    </p>
                  </div>
                  
                  {/* Emergency Wait */}
                  <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 flex flex-col justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"></path></svg>
                      Urgent Wait
                    </p>
                    <p className="text-2xl font-bold flex items-baseline gap-1">
                      {stats.emergencyWait?.toFixed(0) || 0}
                      <span className="text-sm font-medium opacity-80">min</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- AUTH COMPONENTS ---
function LoginPage({ onLogin, setView, error }) {
  const [role, setRole] = useState('management');
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 self-center shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">HMS Portal</h2>
          <p className="text-slate-500 mt-2 font-medium">Sign in to manage your hospital</p>
        </div>
        
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium flex items-center gap-2 animate-pulse"><svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}
        
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); onLogin(e.target.email.value, e.target.password.value, role); }}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input name="email" type="email" placeholder="name@hospital.com" required className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input name="password" type="password" placeholder="••••••••" required className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Select Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50 text-slate-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207l5%205%205-5%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5em_1.5em] bg-[position:right_1rem_center] bg-no-repeat pr-10">
              <option value="management">Management / Admin</option>
              <option value="reception">Receptionist</option>
              <option value="doctor">Medical Doctor</option>
            </select>
          </div>
          <button type="submit" className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Sign In</button>
        </form>
        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-slate-500 text-sm">Need a new workspace?</p>
          <button type="button" onClick={() => setView('register')} className="mt-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors">Register New Hospital &rarr;</button>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ setView }) {
  const handleReg = async (e) => {
    e.preventDefault();
    const { email, password, name } = e.target.elements;
    const { data, error } = await supabase.auth.signUp({ email: email.value, password: password.value });
    if (error) return alert(error.message);
    await supabase.from('hospitals').insert([{ id: data.user.id, name: name.value }]);
    alert("Hospital Registered successfully!");
    setView('login');
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="mb-8">
          <button type="button" onClick={() => setView('login')} className="mb-6 flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> 
            Back to Login
          </button>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Create Workspace</h2>
          <p className="text-slate-500 mt-2 font-medium">Register a new hospital platform</p>
        </div>
        
        <form className="space-y-5" onSubmit={handleReg}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Hospital Name</label>
            <input name="name" placeholder="e.g. City General Hospital" required className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Email</label>
            <input name="email" type="email" placeholder="admin@hospital.com" required className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Password</label>
            <input name="password" type="password" placeholder="••••••••" required className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow bg-slate-50" />
          </div>
          <button type="submit" className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 mt-4">Register Hospital</button>
        </form>
      </div>
    </div>
  );
}