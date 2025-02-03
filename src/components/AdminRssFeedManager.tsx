import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface RssFeed {
  id: string;
  feed_name: string;
  feed_url: string;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  is_admin: boolean;
}

interface AdminRssFeedManagerProps {
  user: User;
}

export function AdminRssFeedManager({ user }: AdminRssFeedManagerProps) {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [newFeed, setNewFeed] = useState({ feed_name: '', feed_url: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      const response = await fetch('/api/rss-feeds', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des flux RSS');
      }

      const data = await response.json();
      setFeeds(data);
    } catch (err) {
      console.error('Error loading RSS feeds:', err);
      setError('Erreur lors du chargement des flux RSS');
    }
  };

  const handleAddFeed = async () => {
    if (!newFeed.feed_name || !newFeed.feed_url) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await fetch('/api/rss-feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newFeed),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du flux RSS');
      }

      setNewFeed({ feed_name: '', feed_url: '' });
      setSuccess('Flux RSS ajouté avec succès');
      loadFeeds();
    } catch (err) {
      console.error('Error adding RSS feed:', err);
      setError('Erreur lors de l\'ajout du flux RSS');
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    try {
      const response = await fetch(`/api/rss-feeds/${feedId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du flux RSS');
      }

      setSuccess('Flux RSS supprimé avec succès');
      loadFeeds();
    } catch (err) {
      console.error('Error deleting RSS feed:', err);
      setError('Erreur lors de la suppression du flux RSS');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500 text-white p-2 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500 text-white p-2 rounded">
          {success}
        </div>
      )}

      {user.is_admin && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-white">Ajouter un flux RSS</h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Nom du flux"
              value={newFeed.feed_name}
              onChange={(e) => setNewFeed({ ...newFeed, feed_name: e.target.value })}
              className="flex-1 bg-gray-700 text-white p-2 rounded"
            />
            <input
              type="text"
              placeholder="URL du flux"
              value={newFeed.feed_url}
              onChange={(e) => setNewFeed({ ...newFeed, feed_url: e.target.value })}
              className="flex-1 bg-gray-700 text-white p-2 rounded"
            />
            <button
              onClick={handleAddFeed}
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
            >
              <Plus size={20} />
              Ajouter
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="bg-gray-800 p-4 rounded-lg flex items-center justify-between"
          >
            <div>
              <h4 className="text-lg font-medium text-white">{feed.feed_name}</h4>
              <p className="text-gray-400">{feed.feed_url}</p>
            </div>
            {user.is_admin && (
              <button
                onClick={() => handleDeleteFeed(feed.id)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
