import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { existsSync } from 'fs';
import { parseString } from 'xml2js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = join(__dirname, '../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Initializing database...');

db.serialize(() => {
  try {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER,
      created_at TEXT,
      qbit_url TEXT,
      qbit_username TEXT,
      qbit_password TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        throw err;
      }
    });

    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating settings table:', err);
        throw err;
      }
    });

    // Global RSS Feeds table
    db.run(`CREATE TABLE IF NOT EXISTS global_rss_feeds (
      id TEXT PRIMARY KEY,
      feed_name TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating global_rss_feeds table:', err);
        throw err;
      }
    });

    // RSS Feeds table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_rss_feeds (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        feed_name TEXT NOT NULL,
        feed_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Ajouter un index sur user_id pour de meilleures performances
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_rss_feeds_user_id 
      ON user_rss_feeds(user_id)
    `);

    // Create admin user if it doesn't exist
    db.get("SELECT * FROM users WHERE username = 'admin'", async (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
        return;
      }

      if (!row) {
        console.log('Creating admin user...');
        const hashedPassword = await bcrypt.hash('admin', 10);
        db.run(
          'INSERT INTO users (id, username, password, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
          [
            crypto.randomUUID(),
            'admin',
            hashedPassword,
            1,
            new Date().toISOString()
          ],
          (err) => {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log('Admin user created successfully');
            }
          }
        );
      }
    });

    // Initialize default settings if they don't exist
    db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
      if (err) {
        console.error('Error checking settings:', err);
        return;
      }

      if (row.count === 0) {
        console.log('Initializing default settings...');
        const defaultSettings = {
          prowlarr_url: '',
          prowlarr_api_key: '',
          tmdb_access_token: '',
          min_seeds: 3
        };

        const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        Object.entries(defaultSettings).forEach(([key, value]) => {
          stmt.run(key, JSON.stringify(value));
        });
        stmt.finalize();
        console.log('Default settings initialized');
      }
    });

  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
});

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Token manquant');
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Token invalide' });
    }

    console.log('Utilisateur authentifié:', user);
    req.user = user;
    next();
  });
};

// API Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur et le mot de passe sont requis' });
  }

  try {
    // Nettoyer le nom d'utilisateur
    const cleanUsername = String(username).trim();
    console.log('👤 Tentative de connexion pour:', cleanUsername);

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [cleanUsername], (err, row) => {
        if (err) {
          console.error('❌ Erreur base de données:', err);
          reject(err);
        } else {
          console.log('✅ Utilisateur trouvé:', {
            id: row?.id,
            username: row?.username,
            is_admin: Boolean(row?.is_admin),
            has_qbit_url: Boolean(row?.qbit_url),
            has_qbit_username: Boolean(row?.qbit_username),
            has_qbit_password: Boolean(row?.qbit_password),
            qbit_url: row?.qbit_url || 'non configuré'
          });
          resolve(row);
        }
      });
    });

    if (!user) {
      console.log('❌ Login failed: user not found -', cleanUsername);
      return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      console.log('❌ Login failed: invalid password -', cleanUsername);
      return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }

    // Créer un token JWT avec les informations de l'utilisateur
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        is_admin: Boolean(user.is_admin)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('🔑 Login successful:', {
      username: cleanUsername,
      is_admin: Boolean(user.is_admin),
      qbit_url: user.qbit_url || 'non configuré',
      qbit_username: user.qbit_username ? 'configuré' : 'non configuré',
      qbit_password: user.qbit_password ? 'configuré' : 'non configuré'
    });

    // Retourner le token et les informations de l'utilisateur
    const userResponse = {
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: Boolean(user.is_admin),
        qbit_url: user.qbit_url,
        qbit_username: user.qbit_username,
        qbit_password: user.qbit_password,
        created_at: user.created_at
      }
    };

    console.log('📤 Envoi des données au client:', {
      ...userResponse,
      user: {
        ...userResponse.user,
        qbit_password: userResponse.user.qbit_password ? '***' : 'non configuré'
      }
    });

    res.json(userResponse);
  } catch (err) {
    console.error('❌ Erreur lors de la connexion:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Settings routes
app.get('/api/settings', authenticateToken, (req, res) => {
  // Permettre la lecture des paramètres à tous les utilisateurs authentifiés
  db.all('SELECT key, value FROM settings', (err, settings) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const settingsObject = settings.reduce((acc, curr) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch (e) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});

    res.json(settingsObject);
  });
});

app.put('/api/settings', authenticateToken, (req, res) => {
  // Garder la restriction admin pour la modification
  if (!req.user.is_admin) {
    return res.sendStatus(403);
  }

  const settings = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  try {
    Object.entries(settings).forEach(([key, value]) => {
      stmt.run(key, JSON.stringify(value));
    });
    stmt.finalize();
    
    console.log('Settings updated successfully:', settings);
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Error updating settings' });
  }
});

// Route pour mettre à jour la configuration globale
app.put('/api/settings/global', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès non autorisé. Droits d\'administrateur requis.' });
  }

  const { prowlarr_url, prowlarr_api_key, tmdb_access_token } = req.body;

  try {
    // Mettre à jour prowlarrUrl
    await new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 
        ['prowlarr_url', prowlarr_url], 
        (err) => err ? reject(err) : resolve()
      );
    });

    // Mettre à jour prowlarrApiKey
    await new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 
        ['prowlarr_api_key', prowlarr_api_key], 
        (err) => err ? reject(err) : resolve()
      );
    });

    // Mettre à jour tmdbToken
    await new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 
        ['tmdb_access_token', tmdb_access_token], 
        (err) => err ? reject(err) : resolve()
      );
    });

    console.log('Configuration globale mise à jour avec succès');
    res.json({ message: 'Configuration mise à jour avec succès' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la configuration globale:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la configuration globale' });
  }
});

// Route pour récupérer la configuration globale
app.get('/api/settings/global', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès non autorisé. Droits d\'administrateur requis.' });
  }

  try {
    const settings = {};
    
    // Récupérer chaque paramètre
    await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', ['prowlarr_url'], (err, row) => {
          if (err) reject(err);
          settings.prowlarr_url = row ? row.value : '';
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', ['prowlarr_api_key'], (err, row) => {
          if (err) reject(err);
          settings.prowlarr_api_key = row ? row.value : '';
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', ['tmdb_access_token'], (err, row) => {
          if (err) reject(err);
          settings.tmdb_access_token = row ? row.value : '';
          resolve();
        });
      })
    ]);

    console.log('Configuration globale récupérée avec succès');
    res.json(settings);
  } catch (err) {
    console.error('Erreur lors de la récupération de la configuration globale:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration globale' });
  }
});

// Route pour récupérer les paramètres publics (accessible à tous les utilisateurs authentifiés)
app.get('/api/settings/public', authenticateToken, async (req, res) => {
  try {
    const settings = {};
    
    // Récupérer uniquement les paramètres nécessaires pour la recherche
    await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', ['prowlarr_url'], (err, row) => {
          if (err) reject(err);
          settings.prowlarr_url = row ? row.value : '';
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', ['prowlarr_api_key'], (err, row) => {
          if (err) reject(err);
          settings.prowlarr_api_key = row ? row.value : '';
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT value FROM settings WHERE key = ?', ['tmdb_access_token'], (err, row) => {
          if (err) reject(err);
          settings.tmdb_access_token = row ? row.value : '';
          resolve();
        });
      })
    ]);

    console.log('Paramètres publics récupérés pour:', req.user.username);
    res.json(settings);
  } catch (err) {
    console.error('Erreur lors de la récupération des paramètres publics:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

// Users routes
app.get('/api/users', authenticateToken, (req, res) => {
  if (!req.user.is_admin) {
    return res.sendStatus(403);
  }

  db.all('SELECT id, username, is_admin, created_at, qbit_url, qbit_username, qbit_password FROM users', (err, users) => {
    if (err) {
      console.error('Erreur lors de la récupération des utilisateurs:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    // Convertir is_admin en booléen avant d'envoyer
    const formattedUsers = users.map(user => ({
      ...user,
      is_admin: Boolean(user.is_admin), // Convertit 0/1 en false/true
      username: String(user.username) // S'assurer que le username est une chaîne
    }));
    res.json(formattedUsers);
  });
});

app.post('/api/users', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès non autorisé. Droits d\'administrateur requis.' });
  }

  const { username, password, is_admin } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur et le mot de passe sont requis' });
  }

  // S'assurer que le username est une chaîne et ne contient pas de valeur booléenne
  const cleanUsername = String(username).trim();

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT username FROM users WHERE username = ?', [cleanUsername], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (id, username, password, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, cleanUsername, hashedPassword, is_admin ? 1 : 0, new Date().toISOString()],
        (err) => {
          if (err) {
            console.error('Erreur lors de la création de l\'utilisateur:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    console.log(`Utilisateur créé avec succès: ${cleanUsername} (Admin: ${is_admin ? 'Oui' : 'Non'})`);
    res.status(201).json({
      id: userId,
      username: cleanUsername,
      is_admin: Boolean(is_admin),
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur lors de la création de l\'utilisateur:', err);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

app.put('/api/users/:userId', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès non autorisé. Droits d\'administrateur requis.' });
  }

  const { userId } = req.params;
  const updates = req.body;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const updateFields = [];
    const updateValues = [];

    // Construire la requête de mise à jour dynamiquement
    if (updates.username) {
      updateFields.push('username = ?');
      updateValues.push(updates.username);
    }
    if (updates.password) {
      updateFields.push('password = ?');
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      updateValues.push(hashedPassword);
    }
    if (typeof updates.is_admin !== 'undefined') {
      updateFields.push('is_admin = ?');
      updateValues.push(updates.is_admin ? 1 : 0);
    }
    if (updates.qbit_url !== undefined) {
      updateFields.push('qbit_url = ?');
      updateValues.push(updates.qbit_url);
    }
    if (updates.qbit_username !== undefined) {
      updateFields.push('qbit_username = ?');
      updateValues.push(updates.qbit_username);
    }
    if (updates.qbit_password !== undefined) {
      updateFields.push('qbit_password = ?');
      updateValues.push(updates.qbit_password);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    // Ajouter l'ID utilisateur aux valeurs
    updateValues.push(userId);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Utilisateur mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès non autorisé. Droits d\'administrateur requis.' });
  }
  
  const { id } = req.params;
  
  db.run('DELETE FROM users WHERE id = ? AND is_admin = 0', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error deleting user' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// Fonction pour parser le flux RSS
async function parseRSSFeed(url) {
  try {
    console.log('Tentative de récupération du flux RSS:', url);
    
    // Configuration des en-têtes
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
    };

    // Configuration du timeout et de l'IPv4
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 secondes de timeout

    const { Agent } = await import('https');
    const agent = new Agent({
      family: 4,  // Force IPv4
      timeout: 20000
    });

    const response = await fetch(url, { 
      headers,
      method: 'GET',
      signal: controller.signal,
      agent: agent
    });

    clearTimeout(timeoutId); // Nettoyer le timeout si la requête réussit
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP! status: ${response.status}`);
    }
    
    const xml = await response.text();
    console.log('Début du XML reçu:', xml.substring(0, 200));
    
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) {
          console.error('Erreur parsing XML:', err);
          reject(new Error('Erreur lors du parsing XML: ' + err.message));
          return;
        }
        
        try {
          if (!result || !result.rss || !result.rss.channel) {
            throw new Error('Format RSS invalide - Structure manquante');
          }

          const channel = result.rss.channel;
          if (!channel.item) {
            throw new Error('Aucun élément trouvé dans le flux RSS');
          }

          // Normaliser en tableau si un seul item
          const items = Array.isArray(channel.item) ? channel.item : [channel.item];
          
          // Traiter chaque item
          const processedItems = items.map(item => {
            // Récupérer les attributs torznab s'ils existent
            const torznabAttrs = {};
            if (item['torznab:attr']) {
              const attrs = Array.isArray(item['torznab:attr']) 
                ? item['torznab:attr'] 
                : [item['torznab:attr']];
              
              attrs.forEach(attr => {
                if (attr.$ && attr.$.name && attr.$.value) {
                  switch(attr.$.name) {
                    case 'seeders':
                      torznabAttrs.seeders = parseInt(attr.$.value, 10) || 0;
                      break;
                    case 'peers':
                      torznabAttrs.peers = parseInt(attr.$.value, 10) || 0;
                      break;
                    case 'grabs':
                      torznabAttrs.grabs = parseInt(attr.$.value, 10) || 0;
                      break;
                    case 'downloadvolumefactor':
                      torznabAttrs.downloadvolumefactor = parseFloat(attr.$.value) || 1;
                      break;
                    case 'uploadvolumefactor':
                      torznabAttrs.uploadvolumefactor = parseFloat(attr.$.value) || 1;
                      break;
                  }
                }
              });
            }

            return {
              title: item.title || '',
              description: item.description || '',
              pubDate: item.pubDate || '',
              link: item.link || '',
              size: parseInt(item.size || '0', 10),
              category: item.category || '',
              torrent: item.enclosure?.$.url || item.link || '',
              feedName: channel.title || '',
              torznab_attr: Object.keys(torznabAttrs).length > 0 ? torznabAttrs : undefined
            };
          });

          resolve(processedItems);
        } catch (error) {
          console.error('Erreur traitement RSS:', error);
          reject(new Error('Erreur lors du traitement des données RSS: ' + error.message));
        }
      });
    });
  } catch (error) {
    console.error('Erreur fetch RSS:', error);
    throw new Error(`Impossible de récupérer le flux RSS: ${error.message}`);
  }
}

// Route pour parser un flux RSS
app.get('/api/rss/parse', authenticateToken, async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const items = await parseRSSFeed(url);
    
    // Sort by date, most recent first
    items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Limit to 100 items per feed
    const limitedItems = items.slice(0, 100);

    res.json(limitedItems);
  } catch (err) {
    console.error('Error parsing RSS feed:', err);
    res.status(500).json({ 
      error: 'Error parsing RSS feed',
      details: err.message
    });
  }
});

// Route pour récupérer les flux RSS d'un utilisateur
app.get('/api/users/:userId/rss-feeds', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  // Vérifier que l'utilisateur est admin ou que c'est son propre compte
  if (!req.user.is_admin && req.user.id !== userId) {
    console.log('Accès non autorisé aux flux RSS:', { requestUser: req.user, targetUserId: userId });
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  try {
    const feeds = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM user_rss_feeds WHERE user_id = ?', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('Flux RSS récupérés:', feeds);
    res.json(feeds);
  } catch (err) {
    console.error('Erreur lors de la récupération des flux RSS:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des flux RSS' });
  }
});

// Route pour ajouter un flux RSS
app.post('/api/admin/users/:userId/rss-feeds', authenticateToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin
  if (!req.user.is_admin) {
    console.log('Tentative d\'accès non autorisé:', req.user);
    return res.status(403).json({ error: 'Accès non autorisé. Droits d\'administrateur requis.' });
  }

  const { userId } = req.params;
  const { feed_name, feed_url } = req.body;

  console.log('Tentative d\'ajout de flux RSS:', { userId, feed_name, feed_url });

  if (!feed_name || !feed_url) {
    console.log('Erreur: champs manquants');
    return res.status(400).json({ error: 'Les champs feed_name et feed_url sont requis' });
  }

  try {
    // Vérifier que l'utilisateur existe
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      console.log('Erreur: utilisateur non trouvé');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier que le flux fonctionne
    const testResponse = await fetch(feed_url);
    if (!testResponse.ok) {
      throw new Error('URL de flux RSS invalide');
    }

    const feed = {
      id: crypto.randomUUID(),
      user_id: userId,
      feed_name,
      feed_url,
      created_at: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_rss_feeds (id, user_id, feed_name, feed_url, created_at) VALUES (?, ?, ?, ?, ?)',
        [feed.id, feed.user_id, feed.feed_name, feed.feed_url, feed.created_at],
        (err) => {
          if (err) {
            console.log('Erreur lors de l\'insertion en base de données:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    console.log('Flux RSS ajouté avec succès:', feed);
    res.status(201).json(feed);
  } catch (err) {
    console.error('Erreur lors de l\'ajout du flux RSS:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du flux RSS: ' + err.message });
  }
});

// Route pour récupérer tous les flux RSS (accessible à tous les utilisateurs authentifiés)
app.get('/api/rss-feeds', authenticateToken, async (req, res) => {
  db.all('SELECT * FROM global_rss_feeds ORDER BY created_at DESC', (err, feeds) => {
    if (err) {
      console.error('Erreur lors de la récupération des flux RSS:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(feeds);
  });
});

// Route pour ajouter un flux RSS (admin uniquement)
app.post('/api/rss-feeds', authenticateToken, async (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  const { feed_name, feed_url } = req.body;
  
  if (!feed_name || !feed_url) {
    return res.status(400).json({ error: 'Le nom et l\'URL du flux sont requis' });
  }

  const id = crypto.randomUUID();

  db.run(
    'INSERT INTO global_rss_feeds (id, feed_name, feed_url, created_at) VALUES (?, ?, ?, ?)',
    [id, feed_name, feed_url, new Date().toISOString()],
    (err) => {
      if (err) {
        console.error('Erreur lors de l\'ajout du flux RSS:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.status(201).json({ id, feed_name, feed_url });
    }
  );
});

// Route pour supprimer un flux RSS (admin uniquement)
app.delete('/api/rss-feeds/:id', authenticateToken, async (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  db.run('DELETE FROM global_rss_feeds WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      console.error('Erreur lors de la suppression du flux RSS:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json({ message: 'Flux RSS supprimé avec succès' });
  });
});

// Fonction pour formater la taille
function formatSize(bytes) {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Serve static files only in production
if (!isDevelopment) {
  const distPath = join(__dirname, '../dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  }
}

// Start server
try {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}