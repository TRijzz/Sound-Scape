import { Router } from 'express';
import { initiateKhaltiVinylPayment, verifyKhaltiPayment } from '../controllers/payment.controller.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/khalti/initiate', requireAuth, initiateKhaltiVinylPayment);
router.post('/khalti/verify', verifyKhaltiPayment);

export default router;
