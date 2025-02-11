import { create } from 'zustand';
import { db } from '../lib/db';
import { QueryClient } from '@tanstack/react-query';

// Créer une instance de QueryClient pour l'utiliser dans le store
const queryClient = new QueryClient();

interface User {
  id: string;
  username: string;
  is_admin: boolean;
  qbit_url?: string;
  qbit_username?: string;
  qbit_password?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Récupérer l'utilisateur du localStorage au démarrage
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('auth_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,

  login: async (username: string, password: string) => {
    try {
      const response = await db.verifyUser(username, password);
      
      if (!response) {
        return false;
      }

      const { token, user } = response;
      
      // Invalider le cache avant la connexion
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rss-feeds'] }),
        queryClient.invalidateQueries({ queryKey: ['rss-items'] })
      ]);
      
      // Sauvegarder dans le localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Mettre à jour le store
      set({
        token,
        user: {
          id: user.id,
          username: user.username,
          is_admin: user.is_admin,
          qbit_url: user.qbit_url,
          qbit_username: user.qbit_username,
          qbit_password: user.qbit_password
        }
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return false;
    }
  },

  logout: () => {
    // Invalider le cache
    queryClient.invalidateQueries({ queryKey: ['rss-feeds'] });
    queryClient.invalidateQueries({ queryKey: ['rss-items'] });
    
    // Nettoyer le localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Réinitialiser le store
    set({ user: null, token: null });
  }
}));