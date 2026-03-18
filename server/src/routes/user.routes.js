import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/admin.js';
import { me, getUsers, getUser, updateUser, deleteUser, getLikedSongs, likeSong, unlikeSong, purchaseVinyl, setActiveVinyl, updateUserVinyls } from '../controllers/user.controller.js';

const router = Router();

router.get('/me', requireAuth, me);
router.get('/profile', requireAuth, me);
router.get('/', requireAdmin, getUsers);

// Likes routes must be defined before parameterized routes
router.get('/likes', requireAuth, getLikedSongs);
router.post('/likes', requireAuth, likeSong);
router.delete('/likes', requireAuth, unlikeSong);
router.get('/me/likes', requireAuth, getLikedSongs);
router.post('/me/likes', requireAuth, likeSong);
router.delete('/me/likes', requireAuth, unlikeSong);

router.post('/purchase-vinyl', requireAuth, purchaseVinyl);
router.post('/set-active-vinyl', requireAuth, setActiveVinyl);
router.put('/id/:id/vinyls', requireAdmin, updateUserVinyls);

router.get('/id/:id', requireAdmin, getUser);
router.put('/id/:id', requireAuth, updateUser);
router.delete('/id/:id', requireAuth, deleteUser);

export default router;
