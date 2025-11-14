import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.js';

export const useSearchSuggestions = () => {
  const [suggestions, setSuggestions] = useState({ artists: [], songs: [], albums: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchSuggestions = useCallback(async (query, limit = 5) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions({ artists: [], songs: [], albums: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await apiService.searchAll(query, limit);
      setSuggestions(results);
    } catch (err) {
      setError(err.message);
      console.error('Search suggestions failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions({ artists: [], songs: [], albums: [] });
  }, []);

  return { suggestions, isLoading, error, searchSuggestions, clearSuggestions };
};
