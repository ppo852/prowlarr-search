import React, { useState } from 'react';
import { Download, Info, Film } from 'lucide-react';
import type { SearchResult } from '../types';
import { tmdbAPI } from '../lib/tmdb';

interface ResultCardProps {
  result: SearchResult;
  onDownload: (result: SearchResult) => void;
  isSearchResult?: boolean;
  poster?: string | null;
}

export function ResultCard({ result, onDownload, isSearchResult = false, poster }: ResultCardProps) {
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);

  const formatSize = (bytes: number): string => {
    const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const handleTmdbSearch = async () => {
    setIsSearchingTmdb(true);
    setTmdbError(null);

    try {
      const tmdbResult = await tmdbAPI.searchTitle(result.name);
      if (tmdbResult) {
        window.open(tmdbAPI.getTmdbUrl(tmdbResult.id, tmdbResult.type), '_blank');
      } else {
        setTmdbError("Aucun résultat trouvé sur TMDB");
      }
    } catch (error) {
      setTmdbError(error instanceof Error ? error.message : "Erreur lors de la recherche TMDB");
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex gap-4 flex-1">
          {!isSearchResult && poster && (
            <div className="flex-shrink-0">
              <img
                src={poster}
                alt="Poster"
                className="w-24 h-36 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-100 mb-3 line-clamp-2">
              {result.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
              <span className="text-red-500">{formatSize(result.size)}</span>
              <span>•</span>
              <span className="text-green-500">{result.seeds} sources</span>
              <span>•</span>
              <span className="text-blue-700">{result.category}</span>
            </div>
            {tmdbError && (
              <div className="mt-2 text-sm text-red-400">
                {tmdbError}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isSearchResult && (
            <>
              <button
                onClick={handleTmdbSearch}
                disabled={isSearchingTmdb}
                className={`p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-full hover:bg-yellow-500/10 ${
                  isSearchingTmdb ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Rechercher sur TMDB"
              >
                <Film className={`h-5 w-5 ${isSearchingTmdb ? 'animate-spin' : ''}`} />
              </button>
              <a
                href={result.desc_link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-blue-500/10"
                title="Plus d'informations"
              >
                <Info className="h-5 w-5" />
              </a>
            </>
          )}
          <button
            onClick={() => onDownload(result)}
            className="ml-4 flex items-center gap-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors shrink-0"
            title="Télécharger le torrent"
          >
            <Download size={16} />
            <span>Télécharger</span>
          </button>
        </div>
      </div>
    </div>
  );
}