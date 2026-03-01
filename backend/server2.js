import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import queueRoutes from './routes/queueRoutes.js';

const app = express();

// 1. Global Middleware
app.use(cors()); // Permits requests from your React frontend (port 5173)
app.use(express.json()); // Parses incoming JSON bodies for your controllers

// 2. Route Definitions
// Handles Registration and Login for all roles
app.use('/api/auth', authRoutes); 

// Management and Reception resource/stat updates
app.use('/api/hospital', hospitalRoutes); 

// Doctor-specific actions like clock-in/out
app.use('/api/doctor', doctorRoutes); 

// The core simulation engine for the dashboard
app.use('/api/queue', queueRoutes); 

// 3. Error Handling Middleware (Basic)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server!' });
});

// 4. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
🚀 Hospital System Backend Live
📡 Endpoint: http://localhost:${PORT}/api
🛠️  Mode: ES Modules
    `);
});