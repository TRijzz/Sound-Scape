import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { me, getUsers, getUser, updateUser, deleteUser } from '../controllers/user.controller.js';

const router = Router();

router.get('/me', requireAuth, me);
router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', requireAuth, updateUser);
router.delete('/:id', requireAuth, deleteUser);

export default router;
