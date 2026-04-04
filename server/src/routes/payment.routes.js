import { Router } from 'express';
// import { initiateKhaltiVinylPayment, verifyKhaltiPayment } from '../controllers/payment.controller.js';
// import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Khalti payment endpoints are intentionally disabled for now until the payment flow is resumed.
// router.post('/khalti/initiate', requireAuth, initiateKhaltiVinylPayment);
// router.post('/khalti/verify', verifyKhaltiPayment);

export default router;
