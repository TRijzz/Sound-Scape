import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { me, getUsers, getUser, updateUser, deleteUser, getLikedSongs, likeSong, unlikeSong, purchaseVinyl, setActiveVinyl } from '../controllers/user.controller.js';

const router = Router();

router.get('/me', requireAuth, me);
router.get('/profile', requireAuth, me);
router.get('/', getUsers);

// Likes routes must be defined before parameterized routes
router.get('/likes', requireAuth, getLikedSongs);
router.post('/likes', requireAuth, likeSong);
router.delete('/likes', requireAuth, unlikeSong);
router.get('/me/likes', requireAuth, getLikedSongs);
router.post('/me/likes', requireAuth, likeSong);
router.delete('/me/likes', requireAuth, unlikeSong);

router.post('/purchase-vinyl', requireAuth, purchaseVinyl);
router.post('/set-active-vinyl', requireAuth, setActiveVinyl);

router.get('/id/:id', getUser);
router.put('/id/:id', requireAuth, updateUser);
router.delete('/id/:id', requireAuth, deleteUser);

export default router;
