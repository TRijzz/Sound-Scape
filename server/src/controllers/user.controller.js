import User from '../models/User.js';

export const me = async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  res.json(user);
};

export const getUsers = async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
};

export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateUser = async (req, res) => {
  const { name, avatar_url } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { name, avatar_url } },
    { new: true }
  ).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ success: true });
};