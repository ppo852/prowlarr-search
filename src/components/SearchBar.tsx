import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { CategoryType } from '../types';

interface SearchBarProps {
  onSearch: (query: string, category: CategoryType) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryType>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), category);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher des torrents..."
            className="w-full px-4 py-3 pl-12 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
          />
          <Search 
            size={20} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryType)}
          className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
        >
          <option value="all">Toutes catégories</option>
          <option value="movies">Films</option>
          <option value="tv">Séries TV</option>
          <option value="anime">Anime</option>
          <option value="music">Musique</option>
          <option value="software">Logiciels</option>
          <option value="books">Livres</option>
        </select>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
        >
          Rechercher
        </button>
      </div>
    </form>
  );
}