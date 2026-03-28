import Mood from '../models/Mood.js';

const normalizeMoodName = (value = '') => String(value || '').trim().replace(/\s+/g, ' ');

const toNormalizedKey = (value = '') => normalizeMoodName(value).toLowerCase();

export const ensureMoodsExist = async (values = []) => {
  const uniqueEntries = Array.from(new Map(
    values
      .map((value) => normalizeMoodName(value))
      .filter(Boolean)
      .map((value) => [toNormalizedKey(value), value])
  ).entries()).map(([normalized_name, name]) => ({ normalized_name, name }));

  if (uniqueEntries.length === 0) return [];

  const existing = await Mood.find({
    normalized_name: { $in: uniqueEntries.map((entry) => entry.normalized_name) }
  })
    .select('normalized_name')
    .lean();

  const existingKeys = new Set(existing.map((entry) => entry.normalized_name));
  const missing = uniqueEntries.filter((entry) => !existingKeys.has(entry.normalized_name));

  if (missing.length > 0) {
    await Mood.insertMany(missing, { ordered: false }).catch(() => {});
  }

  return uniqueEntries.map((entry) => entry.name);
};

export const getRegisteredMoods = async () => {
  const moods = await Mood.find({})
    .sort({ name: 1 })
    .select('name')
    .lean();

  return moods.map((entry) => entry.name);
};
