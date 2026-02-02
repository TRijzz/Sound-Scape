import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);

  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'error', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.getCategories();
      const list = Array.isArray(res?.categories) ? res.categories : Array.isArray(res) ? res : [];
      setCategories(list);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCategory = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiService.createCategory({
        name: name.trim(),
        description: description.trim(),
        cover_image: coverImage.trim(),
        is_public: isPublic
      });
      showToast('Category created successfully!', 'success');
      setName('');
      setDescription('');
      setCoverImage('');
      setIsPublic(true);
      await load();
    } catch (error) {
      console.error('Error creating category:', error);
      showToast(`Failed to create category: ${error.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat) => {
    setEditId(cat._id || cat.id);
    setEditName(cat.name || '');
    setEditDescription(cat.description || '');
    setEditCoverImage(cat.cover_image || '');
    setEditIsPublic(cat.is_public !== false);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditDescription('');
    setEditCoverImage('');
    setEditIsPublic(true);
  };

  const saveCategory = async () => {
    if (!editId) return;
    try {
      await apiService.updateCategory(editId, {
        name: editName.trim(),
        description: editDescription.trim(),
        cover_image: editCoverImage.trim(),
        is_public: editIsPublic
      });
      showToast('Category updated successfully!', 'success');
      cancelEdit();
      await load();
    } catch (error) {
      console.error('Error updating category:', error);
      showToast(`Failed to update category: ${error.message}`, 'error');
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiService.deleteCategory(id);
      showToast('Category deleted successfully!', 'success');
      await load();
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast(`Failed to delete category: ${error.message}`, 'error');
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Create Section */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">Create Category</h2>
        <div className="flex flex-col gap-3 p-4 bg-dark-gray/40 rounded-xl border border-gray-800">
          <div className="flex gap-3">
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Category Name" 
              className="flex-1 px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" 
            />
            <input 
              value={coverImage} 
              onChange={e => setCoverImage(e.target.value)} 
              placeholder="Cover Image URL (optional)" 
              className="flex-1 px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" 
            />
          </div>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="Description (optional)" 
            className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 h-20 resize-none" 
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300 select-none">
              <input 
                type="checkbox" 
                checked={isPublic} 
                onChange={e => setIsPublic(e.target.checked)} 
                className="w-4 h-4 rounded bg-light-gray/50 border-gray-700 text-neon-blue focus:ring-neon-blue" 
              />
              Public
            </label>
            <div className="flex-1" />
            <button 
              onClick={createCategory} 
              disabled={!name.trim() || creating} 
              className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50 font-medium"
            >
              {creating ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </div>
      </motion.section>

      {/* List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Categories ({categories.length})</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-dark-gray/20 rounded-xl border border-gray-800 border-dashed">
            No categories found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <motion.div 
                key={cat._id || cat.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-dark-gray/40 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
              >
                {editId === (cat._id || cat.id) ? (
                  <div className="space-y-3">
                    <input 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full px-3 py-2 rounded bg-dark-bg border border-gray-700 text-white" 
                      placeholder="Name"
                    />
                    <input 
                      value={editCoverImage} 
                      onChange={e => setEditCoverImage(e.target.value)} 
                      className="w-full px-3 py-2 rounded bg-dark-bg border border-gray-700 text-white text-sm" 
                      placeholder="Image URL"
                    />
                    <textarea 
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)} 
                      className="w-full px-3 py-2 rounded bg-dark-bg border border-gray-700 text-white text-sm h-20 resize-none" 
                      placeholder="Description"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-gray-300 text-sm">
                      <input 
                        type="checkbox" 
                        checked={editIsPublic} 
                        onChange={e => setEditIsPublic(e.target.checked)} 
                        className="w-4 h-4 rounded bg-dark-bg border-gray-700" 
                      />
                      Public
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-sm rounded bg-gray-700 text-white hover:bg-gray-600">Cancel</button>
                      <button onClick={saveCategory} className="px-3 py-1.5 text-sm rounded bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-white">{cat.name}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-neon-blue">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteCategory(cat._id || cat.id)} className="text-gray-400 hover:text-red-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    {cat.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{cat.description}</p>}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{cat.songs?.length || 0} songs</span>
                      <span className={`px-2 py-0.5 rounded-full ${cat.is_public ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {cat.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
