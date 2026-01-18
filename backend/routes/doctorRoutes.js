import express from 'express';
import { toggleClock } from '../controllers/doctorController.js';

const router = express.Router();

// Doctor: Clock-in or Clock-out toggle
router.post('/toggle-clock', toggleClock);

export default router;