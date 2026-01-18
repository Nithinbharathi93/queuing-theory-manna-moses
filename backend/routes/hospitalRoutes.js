import express from 'express';
import { 
    createDoctor, 
    updateStats 
} from '../controllers/hospitalController.js';

const router = express.Router();

// Management: Generate doctor credentials
router.post('/create-doctor', createDoctor);

// Reception: Update arrival rates and patient counts
router.patch('/update-stats', updateStats);

export default router;