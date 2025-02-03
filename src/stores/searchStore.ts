import { create } from 'zustand';
import type { SearchResult, CategoryType } from '../types';

interface SearchStore {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  lastSearchCategory: CategoryType | null;
  setResults: (results: SearchResult[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setLastSearchCategory: (category: CategoryType | null) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  results: [],
  isLoading: false,
  error: null,
  lastSearchCategory: null,
  setResults: (results) => set({ results }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setLastSearchCategory: (lastSearchCategory) => set({ lastSearchCategory }),
  resetSearch: () => set({
    results: [],
    lastSearchCategory: null,
    error: null
  })
}));
