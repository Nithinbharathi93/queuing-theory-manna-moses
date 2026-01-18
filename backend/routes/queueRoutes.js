import express from 'express';
import { getLiveSimulation } from '../controllers/queueController.js';

const router = express.Router();

// Public/Staff: Get the real-time queue calculation
router.get('/simulate/:hospital_id', getLiveSimulation);

export default router;