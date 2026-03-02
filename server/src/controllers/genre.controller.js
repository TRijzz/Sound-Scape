import Genre from '../models/Genre.js';

export const getGenres = async (req, res) => {
  try {
    const genres = await Genre.find({ is_active: true }).sort({ name: 1 });
    res.json(genres);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch genres', error: error.message });
  }
};

export const createGenre = async (req, res) => {
  try {
    const { name, description } = req.body;
    const genre = await Genre.create({ name, description });
    console.log(`🆕 Genre Created: ${name}`);
    res.status(201).json(genre);
  } catch (error) {
    console.log(`❌ Failed to create genre: ${req.body.name}`);
    res.status(500).json({ message: 'Failed to create genre', error: error.message });
  }
};

export const updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const genre = await Genre.findByIdAndUpdate(id, req.body, { new: true });
    if (!genre) return res.status(404).json({ message: 'Genre not found' });
    console.log(`✏️ Genre Updated: ${genre.name}`);
    res.json(genre);
  } catch (error) {
    console.log(`❌ Failed to update genre ID: ${req.params.id}`);
    res.status(500).json({ message: 'Failed to update genre', error: error.message });
  }
};

export const deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const genre = await Genre.findByIdAndDelete(id);
    if (!genre) return res.status(404).json({ message: 'Genre not found' });
    console.log(`🗑️ Genre Deleted: ${genre.name}`);
    res.json({ message: 'Genre deleted successfully' });
  } catch (error) {
    console.log(`❌ Failed to delete genre ID: ${req.params.id}`);
    res.status(500).json({ message: 'Failed to delete genre', error: error.message });
  }
};
