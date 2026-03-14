import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const SUPABASE_URL = 'https://ehxxxmuxopuuwphafcdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeHh4bXV4b3B1dXdwaGFmY2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzg5MjgsImV4cCI6MjA4ODgxNDkyOH0.2kFympWljjvxn-omsq4oLDyR3wEMDDNW34YDeiqnhv0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function NoStyle() {
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
    <div>
      <nav style={{ padding: '10px', background: '#eee' }}>
        <strong>{role.toUpperCase()} PORTAL</strong> | Logged in as: {user.email}
        <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Logout</button>
      </nav>
      <hr />
      {role === 'management' && <ManagementDashboard user={user} />}
      {role === 'reception' && <ReceptionDashboard user={user} />}
      {role === 'doctor' && <DoctorDashboard user={user} />}
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', padding: '20px' }}>
      {/* LEFT COLUMN: Infrastructure */}
      <div>
        <h2>Hospital Infrastructure</h2>
        <section style={{ marginBottom: '30px' }}>
          <h3>Departments</h3>
          <form onSubmit={addDept}><input name="name" placeholder="Dept Name" required /><button>Add</button></form>
          <ul>{depts.map(d => <li key={d.id}>{d.name} <button onClick={() => handleDelete('departments', d.id)}>x</button></li>)}</ul>
        </section>

        <section>
          <h3>Floors & Bed Capacity (Click a floor to see patients)</h3>
          <form onSubmit={addFloor}>
            <input name="num" type="number" placeholder="Floor No." required />
            <input name="beds" type="number" placeholder="Total Beds" required />
            <button>Add Floor</button>
          </form>
          <table border="1" cellPadding="10" style={{ marginTop: '10px', width: '100%', cursor: 'pointer' }}>
            <thead>
              <tr><th>Floor</th><th>Occupancy</th><th>Action</th></tr>
            </thead>
            <tbody>
              {floors.map(f => {
                const activeAdmissions = f.admissions.filter(a => !a.discharge_time).length;
                return (
                  <tr 
                    key={f.id} 
                    onClick={() => setSelectedFloor(f)}
                    style={{ background: selectedFloor?.id === f.id ? '#e0f7fa' : 'transparent' }}
                  >
                    <td><strong>Floor {f.floor_number}</strong></td>
                    <td>{activeAdmissions} / {f.total_beds} Beds</td>
                    <td><button onClick={(e) => { e.stopPropagation(); handleDelete('floors', f.id); }}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* NEW: FLOOR DETAILS VIEW */}
        {selectedFloor && (
          <section style={{ marginTop: '20px', padding: '15px', border: '2px solid #00acc1', borderRadius: '8px' }}>
            <h3>Floor {selectedFloor.floor_number} - Current Patients</h3>
            <button onClick={() => setSelectedFloor(null)}>Close Details</button>
            <table border="1" cellPadding="5" style={{ width: '100%', marginTop: '10px' }}>
              <thead>
                <tr><th>Bed</th><th>Patient Name</th><th>Dept</th><th>Status</th></tr>
              </thead>
              <tbody>
                {selectedFloor.admissions.filter(a => !a.discharge_time).length > 0 ? (
                  selectedFloor.admissions.filter(a => !a.discharge_time).map((adm, idx) => (
                    <tr key={idx}>
                      <td>#{adm.bed_number}</td>
                      <td>{adm.patients.name}</td>
                      <td>{adm.patients.departments?.name}</td>
                      <td>{adm.patients.is_emergency ? '🚨 Emergency' : 'Normal'}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4">No patients currently admitted on this floor.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* RIGHT COLUMN: Staff Management */}
      <div>
        <h2>User Management</h2>

        <section style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px' }}>
          <h3>Register Receptionist</h3>
          <form onSubmit={(e) => createStaff(e, 'reception')}>
            <input name="email" type="email" placeholder="Email" required /><br/>
            <input name="password" type="password" placeholder="Password" required /><br/>
            <button>Add Receptionist</button>
          </form>
          <h4>Active Receptionists:</h4>
          <ul>
            {staff.map(s => (
              <li key={s.id}>
                ID: {s.id.substring(0,8)}... ({s.role}) 
                <button onClick={() => handleDelete('staff', s.id)}>Remove</button>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h3>Register Doctor</h3>
          <form onSubmit={(e) => createStaff(e, 'doctor')}>
            <input name="dr_id" placeholder="Doctor ID (e.g. DOC1)" required /><br/>
            <input name="email" type="email" placeholder="Email" required /><br/>
            <input name="password" type="password" placeholder="Password" required /><br/>
            <select name="dept_id">
              <option value="">Select Department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select><br/>
            <button>Add Doctor</button>
          </form>
          <h4>Active Doctors:</h4>
          <table border="1" cellPadding="5" style={{ marginTop: '10px', width: '100%' }}>
            <thead>
              <tr><th>Dr ID</th><th>Dept</th><th>Action</th></tr>
            </thead>
            <tbody>
              {doctors.map(dr => (
                <tr key={dr.id}>
                  <td>{dr.dr_id}</td>
                  <td>{dr.departments?.name || 'N/A'}</td>
                  <td><button onClick={() => handleDelete('doctors', dr.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

// --- 3. RECEPTION DASHBOARD ---
function ReceptionDashboard({ user }) {
  const [data, setData] = useState({ patients: [], beds: [], depts: [] });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: d } = await supabase.from('departments').select('*');
    const { data: f } = await supabase.from('floors').select('*, admissions(*)');
    const { data: p } = await supabase.from('patients').select('*, admissions(*)').neq('status', 'discharged');
    setData({ depts: d || [], beds: f || [], patients: p || [] });
  };

  const admit = async (e) => {
    e.preventDefault();
    const { name, dept_id, floor_id, is_emergency } = e.target.elements;
    
    const { data: patient } = await supabase.from('patients').insert([{ 
      hospital_id: data.beds[0]?.hospital_id, name: name.value, dept_id: dept_id.value, is_emergency: is_emergency.checked, status: 'admitted' 
    }]).select().single();

    await supabase.from('admissions').insert([{ 
      patient_id: patient.id, floor_id: floor_id.value, bed_number: Math.floor(Math.random() * 500) 
    }]);
    loadData();
  };

  const discharge = async (pid) => {
    await supabase.from('admissions').update({ discharge_time: new Date() }).eq('patient_id', pid);
    await supabase.from('patients').update({ status: 'discharged' }).eq('id', pid);
    loadData();
  };

  return (
    <div>
      <h2>Reception: Patient flow</h2>
      <section>
        <h3>Admit Patient</h3>
        <form onSubmit={admit}>
          <input name="name" placeholder="Patient Name" required />
          <select name="dept_id">{data.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select name="floor_id">
            {data.beds.map(f => {
              const free = f.total_beds - f.admissions.filter(a => !a.discharge_time).length;
              return <option key={f.id} value={f.id}>Floor {f.floor_number} ({free} free)</option>
            })}
          </select>
          <label><input type="checkbox" name="is_emergency" /> Emergency</label>
          <button>Admit</button>
        </form>
      </section>

      <section>
        <h3>Bed Management & Suggestions</h3>
        <div style={{ background: '#f9f9f9', padding: '10px' }}>
          {data.beds.map(f => {
            const free = f.total_beds - f.admissions.filter(a => !a.discharge_time).length;
            const isBest = free > 0 && free === Math.max(...data.beds.map(fl => fl.total_beds - fl.admissions.filter(a => !a.discharge_time).length));
            return (
              <p key={f.id} style={{ color: free > 0 ? 'green' : 'red' }}>
                Floor {f.floor_number}: {free} / {f.total_beds} beds available {isBest && '⭐ (Best Option)'}
              </p>
            )
          })}
        </div>
      </section>

      <section>
        <h3>Current Patients</h3>
        <ul>{data.patients.map(p => <li key={p.id}>{p.name} - <button onClick={() => discharge(p.id)}>Discharge</button></li>)}</ul>
      </section>
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
    <div>
      <h2>Doctor: {doc?.dr_id} ({doc?.departments?.name})</h2>
      <button onClick={toggleClock}>{doc?.is_clocked_in ? 'Clock Out' : 'Clock In'}</button>
      <p>Status: {doc?.is_clocked_in ? 'Active' : 'Offline'}</p>
      <hr />
      <button onClick={getStats}>Calculate Wait Times</button>
      {stats && <pre>{JSON.stringify(stats, null, 2)}</pre>}
    </div>
  );
}

// --- AUTH COMPONENTS ---
function LoginPage({ onLogin, setView, error }) {
  const [role, setRole] = useState('management');
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>Hospital Management System</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); onLogin(e.target.email.value, e.target.password.value, role); }}>
        <input name="email" type="email" placeholder="Email" required style={{ width: '100%' }} /><br/>
        <input name="password" type="password" placeholder="Password" required style={{ width: '100%' }} /><br/>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%' }}>
          <option value="management">Management</option>
          <option value="reception">Receptionist</option>
          <option value="doctor">Doctor</option>
        </select><br/>
        <button type="submit" style={{ width: '100%' }}>Login</button>
        <button type="button" onClick={() => setView('register')} style={{ width: '100%' }}>Register New Hospital</button>
      </form>
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
    alert("Hospital Registered!");
    setView('login');
  };
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>New Hospital Registration</h2>
      <form onSubmit={handleReg}>
        <input name="name" placeholder="Hospital Name" required style={{ width: '100%' }} /><br/>
        <input name="email" type="email" placeholder="Admin Email" required style={{ width: '100%' }} /><br/>
        <input name="password" type="password" placeholder="Password" required style={{ width: '100%' }} /><br/>
        <button type="submit">Register</button>
        <button type="button" onClick={() => setView('login')}>Back</button>
      </form>
    </div>
  );
}