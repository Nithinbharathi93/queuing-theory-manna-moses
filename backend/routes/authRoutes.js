import express from 'express';
import { 
    loginManagement, 
    loginReception, 
    loginDoctor,
    registerHospital
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register-hospital', registerHospital);
router.post('/management', loginManagement);
router.post('/reception', loginReception);
router.post('/doctor', loginDoctor);


export default router;