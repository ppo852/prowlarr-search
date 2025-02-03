import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSearchStore } from '../stores/searchStore';
import { SearchBar } from '../components/SearchBar';
import { ResultCard } from '../components/ResultCard';
import { SortControls } from '../components/SortControls';
import { RssFeedList } from '../components/RssFeedList';
import { Toast } from '../components/Toast';
import type { SearchResult, SortOption, CategoryType } from '../types';
import { prowlarrAPI } from '../lib/prowlarr';
import { tmdbAPI } from '../lib/tmdb';
import { globalSettings } from '../lib/settings';

export function SearchPage() {
  const [sortOption, setSortOption] = useState<SortOption>('seeds');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [settings, setSettings] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { results, isLoading, error, lastSearchCategory, setResults, setIsLoading, setError, setLastSearchCategory } = useSearchStore();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await globalSettings.load();
        setSettings(globalSettings);
      } catch (err) {
        console.error('Failed to load global settings:', err);
        setError('Erreur lors du chargement des paramètres. Contactez votre administrateur.');
      }
    };
    loadSettings();
  }, []);

  const handleSearch = async (query: string, category: CategoryType) => {
    setIsLoading(true);
    setError(null);
    setLastSearchCategory(category);

    try {
      const searchResults = await prowlarrAPI.search(query, category);
      setResults(searchResults);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur lors de la recherche. Vérifiez les paramètres Prowlarr avec votre administrateur.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (result: SearchResult) => {
    if (!user?.qbit_url) {
      setError('Veuillez configurer vos paramètres qBittorrent dans les réglages');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('urls', result.link);

      if (user.qbit_username && user.qbit_password) {
        formData.append('username', user.qbit_username);
        formData.append('password', user.qbit_password);
      }

      await fetch(`${user.qbit_url}/api/v2/torrents/add`, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });

      setShowToast(true);
    } catch (error) {
      console.error('Error adding torrent:', error);
      setError('Erreur lors de l\'ajout du torrent à qBittorrent');
    }
  };

  const handleSort = (option: SortOption) => {
    if (option === sortOption) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('desc');
    }
  };

  const sortResults = (results: SearchResult[]): SearchResult[] => {
    return [...results].sort((a, b) => {
      let comparison = 0;
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'seeds':
          comparison = a.seeds - b.seeds;
          break;
        case 'leech':
          comparison = a.leech - b.leech;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {showToast && (
        <Toast 
          message="Téléchargement envoyé" 
          onClose={() => setShowToast(false)} 
        />
      )}
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} />
      </div>

      {error && (
        <div className="mb-8 bg-red-900/50 border border-red-500 text-red-200 p-4 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400">Recherche en cours...</div>
      ) : results.length > 0 ? (
        <div className="space-y-8">
          <div>
            <div className="mb-4">
              <SortControls
                sortOption={sortOption}
                sortDirection={sortDirection}
                onSortOptionChange={setSortOption}
                onSortDirectionChange={setSortDirection}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {sortResults(results).map((result) => (
                <ResultCard
                  key={result.link}
                  result={result}
                  onDownload={handleDownload}
                  isSearchResult={true}
                />
              ))}
            </div>
          </div>
        </div>
      ) : lastSearchCategory ? (
        <div className="text-center text-gray-400">
          Aucun résultat trouvé
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-100 mb-6">
              Torrents du jour
            </h2>
            <RssFeedList onDownload={handleDownload} />
          </div>
        </div>
      )}
    </div>
  );
}