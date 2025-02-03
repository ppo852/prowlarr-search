import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSearchStore } from '../stores/searchStore';
import { Settings, LogOut, Home } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();
  const { resetSearch } = useSearchStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleHomeClick = () => {
    if (location.pathname === '/') {
      // Si nous sommes sur la page d'accueil, on réinitialise juste la recherche
      resetSearch();
    } else {
      // Sinon, on navigue vers l'accueil et on réinitialise la recherche
      resetSearch();
      navigate('/');
    }
  };

  return (
    <header className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-semibold text-white hover:text-gray-200 transition-colors">
              Prowlarr Search
            </Link>
            <button
              onClick={handleHomeClick}
              className="flex items-center gap-2 px-3 py-1 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              <Home size={20} />
              <span>Accueil</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-gray-300">
                  {user.username}
                  {user.is_admin && (
                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
                </span>

                {user.is_admin && (
                  <Link
                    to="/admin"
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                    title="Paramètres administrateur"
                  >
                    <Settings size={20} />
                  </Link>
                )}

                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  title="Déconnexion"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
