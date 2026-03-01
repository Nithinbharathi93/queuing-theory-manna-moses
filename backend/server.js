import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { runSimulationLogic } from './utils/logic.js';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- MONGODB SCHEMAS ---

const hospitalSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    managementPassword: { type: String, required: true },
    receptionPassword: { type: String, required: true },
    // Simulation variables
    totalBeds: { type: Number, default: 0 },
    doctorCount: { type: Number, default: 0 },
    globalServiceTime: { type: Number, default: 10 },
    arrivalRate: { type: Number, default: 0 },
    emergencyPatients: { type: Number, default: 0 },
    normalPatients: { type: Number, default: 0 }
});

const doctorSchema = new mongoose.Schema({
    drId: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    serviceTime: { type: Number, default: 10 },
    isClockedIn: { type: Boolean, default: false }
});

const Hospital = mongoose.model('Hospital', hospitalSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);

// --- AUTH MIDDLEWARE ---

const protect = (roles) => async (req, res, next) => {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "No token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!roles.includes(decoded.role)) {
            return res.status(403).json({ message: "Unauthorized role" });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};

// --- ROUTES ---

// 1. Management: Register Hospital
app.post('/api/hospital/register', async (req, res) => {
    const { name, managementPassword, receptionPassword } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hMgmtPass = await bcrypt.hash(managementPassword, salt);
    const hRcptPass = await bcrypt.hash(receptionPassword, salt);

    const hospital = await Hospital.create({ 
        name, 
        managementPassword: hMgmtPass, 
        receptionPassword: hRcptPass 
    });
    res.status(201).json(hospital);
});

// 2. Login (Universal)
app.post('/api/login', async (req, res) => {
    const { name, drId, password, role } = req.body; // name for hospital/reception, drId for doc

    let user;
    let isValid = false;

    if (role === 'management' || role === 'reception') {
        user = await Hospital.findOne({ name });
        if (!user) return res.status(404).json({ message: "Hospital not found" });
        const passToCompare = role === 'management' ? user.managementPassword : user.receptionPassword;
        isValid = await bcrypt.compare(password, passToCompare);
    } else if (role === 'doctor') {
        user = await Doctor.findOne({ drId });
        if (!user) return res.status(404).json({ message: "Doctor not found" });
        isValid = await bcrypt.compare(password, user.password);
    }

    if (!isValid) return res.status(401).json({ message: "Invalid Credentials" });

    const token = jwt.sign({ id: user._id, role, hospitalId: role === 'doctor' ? user.hospitalId : user._id }, process.env.JWT_SECRET);
    res.json({ token, role });
});

// 3. Management: Add Doctors
app.post('/api/management/add-doctor', protect(['management']), async (req, res) => {
    const { drId, password, serviceTime } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const doctor = await Doctor.create({ 
        drId, 
        password: hashedPassword, 
        serviceTime, 
        hospitalId: req.user.id 
    });
    res.status(201).json(doctor);
});

// 4. Management: Update Hospital Config
app.patch('/api/management/update-hospital', protect(['management']), async (req, res) => {
    const updated = await Hospital.findByIdAndUpdate(req.user.id, req.body, { new: true });
    res.json(updated);
});

// 5. Reception: Update Stats
app.patch('/api/reception/update-stats', protect(['reception']), async (req, res) => {
    const { arrivalRate, emergencyPatients, normalPatients } = req.body;
    const updated = await Hospital.findByIdAndUpdate(req.user.hospitalId, 
        { arrivalRate, emergencyPatients, normalPatients }, 
        { new: true }
    );
    res.json(updated);
});

// 6. Doctor: Clock In/Out
app.patch('/api/doctor/clock', protect(['doctor']), async (req, res) => {
    const doctor = await Doctor.findById(req.user.id);
    doctor.isClockedIn = !doctor.isClockedIn;
    await doctor.save();
    res.json({ message: `Doctor ${doctor.isClockedIn ? 'Clocked In' : 'Clocked Out'}` });
});

// 7. Simulation: Get Results
app.get('/api/simulation/results', protect(['management', 'reception', 'doctor']), async (req, res) => {
    const h = await Hospital.findById(req.user.hospitalId);
    
    // Logic: calculate based on currently clocked-in doctors
    const activeDoctorCount = await Doctor.countDocuments({ hospitalId: h._id, isClockedIn: true });

    const results = runSimulationLogic({
        arrival_rate: h.arrivalRate,
        service_time: h.globalServiceTime,
        doctors: activeDoctorCount || h.doctorCount, // Fallback to set count if 0 clocked in
        total_beds: h.totalBeds,
        emergency_patients: h.emergencyPatients,
        normal_patients: h.normalPatients
    });

    res.json(results);
});

// --- DATABASE & SERVER START ---

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
    })
    .catch(err => console.log(err));