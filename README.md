# Prowlarr qBittorrent Web Interface v4.1.0

![Interface Screenshot](https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1200&auto=format&fit=crop)

Une interface web moderne et élégante pour gérer vos recherches Prowlarr et téléchargements qBittorrent.

## 🚀 Fonctionnalités

- 🔍 Recherche unifiée dans tous vos indexers Prowlarr
  - Filtrage par catégorie (Films, Séries, Anime, etc.)
  - Tri avancé par nom, taille, sources ou pairs
- 🎬 Intégration TMDB
  - Affichage des posters de films et séries
  - Lien direct vers la page TMDB
  - Recherche automatique des métadonnées
- 📥 Intégration qBittorrent
  - Téléchargement direct vers qBittorrent
  - Configuration par utilisateur
  - Support de l'authentification qBittorrent
- 🎨 Interface moderne
  - Design responsive et adaptatif
  - Thème sombre élégant
  - Composants réutilisables avec Tailwind CSS
  - Gestion d'état avancée avec Zustand
  - Cache intelligent avec React Query
- 🔄 Gestion des flux RSS
  - Cache optimisé des flux RSS
  - Rafraîchissement manuel via bouton dédié
  - Mise à jour intelligente des données
  - Performance optimisée pour grands volumes
- 👥 Gestion multi-utilisateurs
  - Rôles admin/utilisateur
  - Configuration personnalisée par utilisateur
  - Paramètres qBittorrent individuels
- 🔒 Sécurité
  - Authentification JWT
  - Mots de passe hashés avec bcrypt
  - Protection des routes par rôle
- 🗃️ Base de données
  - SQLite persistante
  - Migrations automatiques
  - Sauvegarde des configurations

## 📋 Installation avec Docker

### Prérequis
- **Prowlarr** doit être installé pour que cette application fonctionne correctement.
- Docker et Docker Compose installés sur votre système
- Un serveur Linux (recommandé) ou Windows avec Docker
- Minimum 1GB de RAM recommandé
- 1 CPU core minimum
- Il est nécessaire d'avoir Prowlarr installé pour que l'application fonctionne.

### Installation rapide

1. Créez un nouveau dossier pour le projet :
```bash
mkdir prowlarr-search && cd prowlarr-search
```

2. Créez le fichier `docker-compose.yml` :
```yaml
version: '3'
services:
  prowlarr-search:
    image: ppo852/prowlarr-search:v4.1
    container_name: prowlarr-search
    ports:
      - "80:80"  # L'application sera accessible sur le port 80
    volumes:
      - ./data:/app/data  # Stockage persistant pour la base SQLite
    environment:
      - PUID=1000  # Remplacez par votre User ID
      - PGID=1000  # Remplacez par votre Group ID
      - JWT_SECRET=votre_secret_jwt  # Changez ceci !
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

3. Créez le dossier pour les données persistantes :
```bash
mkdir data
chmod 777 data  # Assurez-vous que Docker peut écrire dans ce dossier
```

4. Lancez l'application :
```bash
docker-compose up -d
```

### 🔐 Première connexion

1. Accédez à `http://votre-ip`
2. Connectez-vous avec les identifiants par défaut :
   - Utilisateur : `admin`
   - Mot de passe : `admin`
3. **IMPORTANT** : Changez immédiatement le mot de passe administrateur !

## ⚙️ Configuration

### Configuration initiale (Admin)

Dans les paramètres d'administration, configurez :
1. L'URL et la clé API Prowlarr
2. Le token d'accès TMDB (pour les métadonnées)
3. Le nombre minimum de sources
4. Ajoutez vos flux RSS Prowlarr
   - Nom du flux
   - URL du flux RSS
   - Catégorie (Films, Séries, etc.)
5. Créez les comptes utilisateurs

### Configuration utilisateur

Chaque utilisateur peut configurer :
- Son URL qBittorrent
- Ses identifiants qBittorrent
- Ses préférences d'affichage

## 🔄 Gestion du Cache

L'application utilise un système de cache intelligent pour optimiser les performances :
- Cache permanent des configurations utilisateur
- Cache intelligent des flux RSS avec rafraîchissement manuel
- Nettoyage automatique à la déconnexion
- Optimisation de la mémoire pour les grands volumes de données

## ⚡ Performance

L'application est optimisée pour les performances :
- Gestion d'état centralisée avec Zustand
- Mise en cache intelligente avec React Query
- Chargement à la demande des données
- Rafraîchissement contrôlé des flux RSS
- Optimisation des requêtes API

## 🛠️ Technologies utilisées

- [Prowlarr](https://github.com/Prowlarr/Prowlarr) pour la gestion des indexers
- [qBittorrent](https://github.com/qbittorrent/qBittorrent)
- [TMDB](https://www.themoviedb.org/) pour leur API
- [React](https://reactjs.org/) pour le framework frontend
- [Tailwind CSS](https://tailwindcss.com/) pour le système de design
- [Lucide Icons](https://lucide.dev/) pour les icônes
- [Zustand](https://zustand-demo.pmnd.rs/) pour la gestion d'état
- [React Query](https://tanstack.com/query/latest) pour la gestion du cache

## 📝 Notes de version v4.1.0

### Nouvelles fonctionnalités
- Ajout du bouton de rafraîchissement manuel des flux RSS
- Amélioration de la gestion du cache
- Nouvelle gestion d'état avec Zustand
- Optimisation des performances avec React Query

### Corrections
- Amélioration de la stabilité du cache RSS
- Optimisation de la consommation mémoire
- Meilleure gestion des erreurs de chargement
