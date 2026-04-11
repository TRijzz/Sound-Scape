import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/admin.js';
import { upload } from '../middlewares/upload.js';
import {
  searchPublicUsers,
  getPublicUser,
  me,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getLikedSongs,
  likeSong,
  unlikeSong,
  getFollowedArtists,
  followArtist,
  unfollowArtist,
  followUser,
  unfollowUser,
  purchaseVinyl,
  setActiveVinyl,
  updateUserVinyls
} from '../controllers/user.controller.js';

const router = Router();

router.get('/search', searchPublicUsers);
router.get('/public/:id', getPublicUser);
router.get('/me', requireAuth, me);
router.get('/profile', requireAuth, me);
router.get('/', requireAdmin, getUsers);

router.get('/likes', requireAuth, getLikedSongs);
router.post('/likes', requireAuth, likeSong);
router.delete('/likes', requireAuth, unlikeSong);
router.get('/me/likes', requireAuth, getLikedSongs);
router.post('/me/likes', requireAuth, likeSong);
router.delete('/me/likes', requireAuth, unlikeSong);
router.get('/follows', requireAuth, getFollowedArtists);
router.post('/follows', requireAuth, followArtist);
router.delete('/follows', requireAuth, unfollowArtist);
router.get('/me/follows', requireAuth, getFollowedArtists);
router.post('/me/follows', requireAuth, followArtist);
router.delete('/me/follows', requireAuth, unfollowArtist);
router.post('/user-follows', requireAuth, followUser);
router.delete('/user-follows', requireAuth, unfollowUser);
router.post('/me/user-follows', requireAuth, followUser);
router.delete('/me/user-follows', requireAuth, unfollowUser);

router.post('/purchase-vinyl', requireAuth, purchaseVinyl);
router.post('/set-active-vinyl', requireAuth, setActiveVinyl);
router.put('/id/:id/vinyls', requireAdmin, updateUserVinyls);

router.get('/id/:id', requireAdmin, getUser);
router.put('/id/:id', requireAuth, upload.fields([{ name: 'profileImage', maxCount: 1 }]), updateUser);
router.delete('/id/:id', requireAuth, deleteUser);

export default router;
