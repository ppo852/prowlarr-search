import React, { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import type { SearchResult } from '../types';
import { tmdbAPI } from '../lib/tmdb';
import { globalSettings } from '../lib/settings';

type ViewMode = 'compact';

interface RssFeed {
  id: string;
  feed_name: string;
  feed_url: string;
}

interface RssFeedItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  size: number;
  category: string;
  torrent: string;
  feedName: string;
  tmdbPoster?: string | null;
  tmdbId?: number;
  tmdbType?: 'movie' | 'tv';
  torznab_attr?: {
    seeders: number;
    peers: number;
    grabs: number;
    downloadvolumefactor: number;
    uploadvolumefactor: number;
  };
}

interface RssFeedListProps {
  onDownload: (result: SearchResult) => Promise<void>;
}

async function fetchFeeds(token: string): Promise<RssFeed[]> {
  const response = await fetch('/api/rss-feeds', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load RSS feeds');
  }

  return response.json();
}

async function fetchFeedItems(feed: RssFeed, token: string): Promise<RssFeedItem[]> {
  const response = await fetch(`/api/rss/parse?url=${encodeURIComponent(feed.feed_url)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || 'Failed to fetch RSS feed items');
  }

  const items = await response.json();
  
  const itemsWithPosters = await Promise.all(
    items.map(async (item: RssFeedItem) => {
      const tmdbToken = globalSettings.getTmdbAccessToken();
      if (!tmdbToken) return item;

      try {
        const tmdbResult = await tmdbAPI.searchTitle(item.title);
        return {
          ...item,
          tmdbPoster: tmdbResult?.posterUrl || null,
          tmdbId: tmdbResult?.id,
          tmdbType: tmdbResult?.type
        };
      } catch (error) {
        console.error('Error fetching TMDB info:', error);
        return item;
      }
    })
  );

  return itemsWithPosters;
}

export function RssFeedList({ onDownload }: RssFeedListProps) {
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [selectedFeed, setSelectedFeed] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: feeds = [], isLoading: isLoadingFeeds, refetch: refetchFeeds } = useQuery({
    queryKey: ['rss-feeds'],
    queryFn: () => token ? fetchFeeds(token) : Promise.resolve([]),
    enabled: !!token && !!user?.id,
    staleTime: Infinity, // Les données ne deviennent jamais périmées automatiquement
    cacheTime: Infinity, // Le cache ne expire jamais automatiquement
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Permettre le chargement au montage initial
    refetchOnReconnect: false
  });

  const { data: feedItems = {}, isLoading: isLoadingItems, refetch: refetchItems } = useQuery({
    queryKey: ['rss-items'],
    queryFn: async () => {
      if (!token || feeds.length === 0) return {};
      
      const itemsByFeed: { [feedId: string]: RssFeedItem[] } = {};
      
      for (const feed of feeds) {
        try {
          const items = await fetchFeedItems(feed, token);
          itemsByFeed[feed.id] = items;
        } catch (error) {
          console.error(`Error loading feed ${feed.feed_url}:`, error);
          itemsByFeed[feed.id] = [];
        }
      }
      
      return itemsByFeed;
    },
    enabled: !!token && feeds.length > 0,
    staleTime: Infinity, // Les données ne deviennent jamais périmées automatiquement
    cacheTime: Infinity, // Le cache ne expire jamais automatiquement
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Permettre le chargement au montage initial
    refetchOnReconnect: false
  });

  const isLoading = isLoadingFeeds || isLoadingItems;

  const handleRefresh = async () => {
    console.log('🔄 Début du rafraîchissement');
    try {
      // 1. Invalider le cache
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rss-feeds'] }),
        queryClient.invalidateQueries({ queryKey: ['rss-items'] })
      ]);
      console.log('🗑️ Cache invalidé');

      // 2. Recharger les données
      const feeds = await refetchFeeds();
      console.log('📥 Flux RSS rechargés');
      
      if (feeds.data && feeds.data.length > 0) {
        const items = await refetchItems();
        console.log('📥 Items RSS rechargés');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  const detectCategory = (category: string) => {
    const categoryCode = parseInt(category);
    switch (categoryCode) {
      case 2000: return 'Films';
      case 5000: return 'Séries TV';
      case 2020: return 'Animation';
      case 5070: return 'Animation Séries';
      case 100010: return 'Séries TV';  
      default: return null;
    }
  };

  const formatSize = (size: number) => {
    if (!size) return 'Unknown';
    const gb = size / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = size / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatTitle = (title: string): string => {
    let formattedTitle = title.replace(/\./g, ' ');
    
    const technicalInfo = [
      /\b\d{4}\b/,  
      /FRENCH|MULTI|TRUEFRENCH|VF2|VFF|VFQ|VOF/i,
      /1080p|2160p|HDR|DV|HDR10P/i,
      /WEB|WEBRip|WEB-DL|BluRay|HDLight/i,
      /H264|H265|x264|x265|HEVC/i,
      /\bFW\b|\bSlay3R\b|\bFERVEX\b|\bESPER\b|\bSUPPLY\b/i,
      /DTS|DDP5\.1|Atmos|AC3/i,
      /REPACK|PROPER/i,
      /\bx64\b|\bWin\b/i,
      /-\w+$/  
    ];

    technicalInfo.forEach(pattern => {
      formattedTitle = formattedTitle.replace(new RegExp(pattern, 'gi'), '');
    });

    formattedTitle = formattedTitle.replace(/\s+/g, ' ').trim();
    formattedTitle = formattedTitle.replace(/\s*-\s*$/, '');

    const frenchTitleMatch = title.match(/\((.*?)\)$/);
    if (frenchTitleMatch) {
      return frenchTitleMatch[1].trim();
    }

    return formattedTitle;
  };

  const handleDownload = (item: RssFeedItem) => {
    onDownload({
      name: item.title,
      link: item.torrent || item.link,
      size: formatSize(item.size),
      seeders: item.torznab_attr?.seeders || 0,
      category: detectCategory(item.category)
    });
  };

  const getFilteredItems = () => {
    let allItems: RssFeedItem[] = [];
    
    if (selectedFeed !== 'all') {
      allItems = feedItems[selectedFeed] || [];
    } else {
      allItems = Object.values(feedItems).flat();
    }

    const filteredItems = currentCategory === 'all'
      ? allItems.filter(item => {
          const category = detectCategory(item.category);
          return category !== null;
        })
      : allItems.filter(item => detectCategory(item.category) === currentCategory);

    return filteredItems;
  };

  const getCurrentPageItems = () => {
    const items = getFilteredItems();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(getFilteredItems().length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getItemClassName = () => {
    return "transition-all duration-200 bg-gray-800 rounded p-2 hover:bg-gray-700/70 flex items-center";
  };

  const getContainerClassName = () => {
    return "flex flex-col gap-2";
  };

  const TitleWithPoster = ({ title, poster }: { title: string; poster: string | null | undefined }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <div 
        className="relative inline-block"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="cursor-help text-white">{title}</span>
        {showTooltip && poster && (
          <div className="absolute z-50 right-0 top-0 transform translate-x-full ml-2">
            <div className="bg-gray-900 p-2 rounded-lg shadow-lg">
              <img 
                src={poster} 
                alt={title}
                className="w-32 h-48 object-cover rounded"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-400">Chargement des flux RSS...</div>
      </div>
    );
  }

  if (feeds.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        Aucun flux RSS configuré
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Flux RSS:</label>
          <select
            value={selectedFeed}
            onChange={(e) => setSelectedFeed(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1 rounded-md border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tous les flux</option>
            {feeds.map(feed => (
              <option key={feed.id} value={feed.id}>
                {feed.feed_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Catégorie:</label>
          <select
            value={currentCategory}
            onChange={(e) => setCurrentCategory(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1 rounded-md border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Toutes</option>
            <option value="Films">Films</option>
            <option value="Séries TV">Séries TV</option>
            <option value="Animation">Animation</option>
            <option value="Animation Séries">Animation Séries</option>
          </select>
        </div>

        <button
          onClick={handleRefresh}
          className="ml-auto flex items-center gap-2 px-3 py-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
          title="Rafraîchir les flux"
        >
          <RefreshCw size={20} />
          <span>Rafraîchir</span>
        </button>
      </div>

      <div className={getContainerClassName()}>
        {getCurrentPageItems().map((item, index) => (
          <div key={index} className={getItemClassName()}>
            <div className="flex-1 min-w-0">
              <TitleWithPoster 
                title={item.title}
                poster={item.tmdbPoster}
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400 mt-1">
                <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                <span>•</span>
                <span className="text-red-500">{formatSize(item.size)}</span>
                <span>•</span>
                <span>{item.feedName}</span>
                {item.torznab_attr?.seeders && (
                  <>
                    <span>•</span>
                    <span className="text-green-500">{item.torznab_attr.seeders} seeders</span>
                  </>
                )}
                {item.torznab_attr?.peers && item.torznab_attr.peers > item.torznab_attr.seeders && (
                  <>
                    <span>•</span>
                    <span className="text-blue-500">
                      {item.torznab_attr.peers - item.torznab_attr.seeders} leechers
                    </span>
                  </>
                )}
                {item.torznab_attr?.downloadvolumefactor === 0 && (
                  <>
                    <span>•</span>
                    <span className="text-purple-400">FreeLeech</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {item.tmdbId && item.tmdbType && (
                <a
                  href={tmdbAPI.getTmdbUrl(item.tmdbId, item.tmdbType)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors shrink-0"
                  title="Voir sur TMDB"
                >
                  <span>TMDB</span>
                </a>
              )}
              <button
                onClick={() => handleDownload(item)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors shrink-0"
                title="Télécharger le torrent"
              >
                <Download size={16} />
                <span>Télécharger</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4 bg-gray-800 p-2 rounded">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            «
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            ‹
          </button>

          <span className="px-4 py-1 text-gray-300">
            Page {currentPage} sur {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            ›
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
