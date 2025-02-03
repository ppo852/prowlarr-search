import { globalSettings } from './settings';

class TmdbAPI {
  private readonly BASE_URL = 'https://api.themoviedb.org/3';
  private readonly DEBUG = true;

  private getHeaders() {
    const token = globalSettings.getTmdbAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private cleanTitle(title: string): string {
    if (this.DEBUG) {
      console.log('🔍 Original title:', title);
    }

    // First, split on common delimiters
    const parts = title.split(/[.\s]+/);
    if (this.DEBUG) {
      console.log('📑 Parts après split:', parts);
    }
    
    // Find the year if present
    const yearMatch = title.match(/(?:19|20)\d{2}/);
    const year = yearMatch ? yearMatch[0] : '';
    if (this.DEBUG) {
      console.log('📅 Année trouvée:', year);
    }

    // Build clean title by taking everything before the first format indicator
    let cleanedTitle = '';
    const formatIndicators = [
      'MULTI', 'FRENCH', 'TRUEFRENCH', 'VOSTFR', 'VFF', '2160P', '1080P', '720P',
      '480P', '4K', 'UHD', 'HDR', 'BLURAY', 'WEB-DL', 'WEBRIP', 'HDTV', 'X264',
      'X265', 'HEVC', 'AAC', 'AC3', 'DTS', 'AMZN', 'NF', 'E-AC3', 'H264', 'H265',
      'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9' // Ignore season indicators
    ];

    for (const part of parts) {
      if (formatIndicators.some(indicator => 
        part.toUpperCase().includes(indicator) || 
        part.match(/^[A-Z0-9]{2,}$/) || // Skip likely release group names
        part.match(/S\d{1,2}/) // Skip season indicators
      )) {
        if (this.DEBUG) {
          console.log('⛔ Stop au mot:', part);
        }
        break;
      }
      cleanedTitle += part + ' ';
      if (this.DEBUG) {
        console.log('✅ Ajout du mot:', part);
      }
    }

    // Clean up the title
    cleanedTitle = cleanedTitle
      .replace(/\.(mkv|avi|mp4|wmv|divx)$/i, '')
      .replace(/[\[\]{}]/g, ' ')  
      .replace(/\s+/g, ' ')
      .trim();

    // Extraire le texte entre parenthèses à la fin
    const parenthesesMatch = title.match(/\(([^)]+)\)$/);
    if (parenthesesMatch) {
      const titleInParentheses = parenthesesMatch[1].trim();
      if (this.DEBUG) {
        console.log('🎯 Titre trouvé entre parenthèses:', titleInParentheses);
      }
      // Si le titre entre parenthèses est plus court, on l'utilise
      if (titleInParentheses.length < cleanedTitle.length) {
        cleanedTitle = titleInParentheses;
        if (this.DEBUG) {
          console.log('✨ Utilisation du titre entre parenthèses car plus court');
        }
      }
    }

    // Add back year if present (without parentheses)
    if (year && !cleanedTitle.includes(year)) {
      cleanedTitle = `${cleanedTitle} ${year}`;
    }

    if (this.DEBUG) {
      console.log('✨ Titre final:', cleanedTitle);
    }

    return cleanedTitle;
  }

  async searchTitle(query: string): Promise<{ id: number; type: 'movie' | 'tv'; posterUrl: string | null } | null> {
    if (this.DEBUG) {
      console.log('🔍 Searching TMDB for:', query);
    }

    const token = globalSettings.getTmdbAccessToken();
    if (!token) {
      throw new Error('TMDB access token not configured');
    }

    // Premier essai avec le titre complet
    let cleanedTitle = this.cleanTitle(query);
    let result = await this.searchWithTitle(cleanedTitle, query);
    
    if (!result) {
      // Deuxième essai sans l'année
      const titleWithoutYear = cleanedTitle.replace(/\s+\d{4}$/, '');
      if (titleWithoutYear !== cleanedTitle) {
        if (this.DEBUG) {
          console.log('🔄 Retrying without year:', titleWithoutYear);
        }
        result = await this.searchWithTitle(titleWithoutYear, query);
      }
    }

    if (!result && this.DEBUG) {
      console.log('❌ No results found on TMDB');
    }

    return result;
  }

  private async searchWithTitle(cleanedTitle: string, originalQuery: string): Promise<{ id: number; type: 'movie' | 'tv'; posterUrl: string | null } | null> {
    try {
      const isTvShow = /S\d{1,2}/i.test(originalQuery) || 
                      /INTEGRAL/i.test(originalQuery) ||
                      /INTEGRALE/i.test(originalQuery) ||
                      /COMPLETE/i.test(originalQuery) ||
                      /COLLECTION/i.test(originalQuery) ||
                      /COFFRET/i.test(originalQuery);

      const searchOrder = isTvShow ? ['tv', 'movie'] : ['movie', 'tv'];

      for (const mediaType of searchOrder) {
        const url = new URL(`${this.BASE_URL}/search/${mediaType}`);
        url.searchParams.append('query', cleanedTitle);
        url.searchParams.append('language', 'fr-FR');

        const response = await fetch(url.toString(), { headers: this.getHeaders() });
        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const posterPath = data.results[0].poster_path;
          return {
            id: data.results[0].id,
            type: mediaType as 'movie' | 'tv',
            posterUrl: posterPath ? `https://image.tmdb.org/t/p/w185${posterPath}` : null
          };
        }
      }
    } catch (error) {
      console.error('TMDB search error:', error);
    }
    return null;
  }

  getTmdbUrl(id: number, type: 'movie' | 'tv'): string {
    return `https://www.themoviedb.org/${type}/${id}`;
  }
}

export const tmdbAPI = new TmdbAPI();