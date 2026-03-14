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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '25px', padding: '20px' }}>
      {/* LEFT: ADMISSION & DOCTORS */}
      <div>
        <section style={{ border: '2px solid #007bff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Admit Patient</h3>
          <form onSubmit={admit}>
            <input name="name" placeholder="Patient Name" required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
            <label>Department:</label>
            <select name="dept_id" style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
              {data.depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <label>Assign Floor:</label>
            <select name="floor_id" style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
              {data.beds.map(f => {
                const free = f.total_beds - f.admissions.length;
                return <option key={f.id} value={f.id}>Floor {f.floor_number} ({free} free)</option>
              })}
            </select>
            <label style={{ display: 'block', marginBottom: '15px' }}>
              <input type="checkbox" name="is_emergency" /> 🚨 Emergency Patient
            </label>
            <button type="submit" style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Admit & Assign Bed
            </button>
          </form>
        </section>

        <section style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>Doctors Available Now ({data.doctors.length})</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {data.doctors.length > 0 ? data.doctors.map(dr => (
              <div key={dr.id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                <span style={{ color: 'green' }}>●</span> <b>{dr.dr_id}</b> <br/>
                <small style={{ color: '#666' }}>{dr.departments?.name}</small>
              </div>
            )) : <p>No doctors currently clocked in.</p>}
          </div>
        </section>
      </div>

      {/* RIGHT: LIVE STATS & PATIENT TABLE */}
      <div>
        <section style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Live Department Wait Times</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {data.depts.map(dept => {
              const stat = congestionData[dept.id];
              const isHigh = stat?.congestionLevel === 'High';
              return (
                <div key={dept.id} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', background: isHigh ? '#fff0f0' : '#f0fff0' }}>
                  <strong>{dept.name}</strong>
                  <div style={{ color: isHigh ? 'red' : 'green', fontWeight: 'bold' }}>{stat?.congestionLevel || '...'}</div>
                  <small>Est. Wait: {stat?.normalWait?.toFixed(0)} min</small>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Floor Occupancy & Congestion</h3>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
            {data.beds.map(f => {
              const stat = floorCongestion[f.id];
              const color = stat?.congestionLevel === 'High' ? 'red' : 'inherit';
              return (
                <div key={f.id} style={{ minWidth: '150px', padding: '10px', border: `2px solid ${color}`, textAlign: 'center' }}>
                  <b>Floor {f.floor_number}</b><br/>
                  <span style={{color: color}}>{stat?.congestionLevel || '...'}</span><br/>
                  {f.admissions.length} / {f.total_beds}
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h3>Admitted Patients</h3>
          <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f4f4f4' }}>
              <tr>
                <th>Patient Name</th>
                <th>Status</th>
                <th>Floor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.patients.map(p => {
                // Feature 4: Map patient to their floor
                const floorNum = p.admissions?.[0]?.floors?.floor_number || 'N/A';
                return (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td>{p.is_emergency ? <span style={{ color: 'red' }}>🚨 Emergency</span> : 'Normal'}</td>
                    <td>Floor {floorNum}</td>
                    <td><button onClick={() => discharge(p.id)} style={{ color: 'red', cursor: 'pointer' }}>Discharge</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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