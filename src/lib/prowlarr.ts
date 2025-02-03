import { globalSettings } from './settings';
import type { SearchResult, CategoryType } from '../types';
import { CATEGORY_MAPPING } from '../types';

class ProwlarrAPI {
  private readonly DEBUG = true;

  private getHeaders(apiKey: string) {
    return {
      'X-Api-Key': apiKey,
      'Accept': 'application/json'
    };
  }

  async search(query: string, category: CategoryType = 'all'): Promise<SearchResult[]> {
    const settings = globalSettings.getProwlarrSettings();
    const minSeeds = globalSettings.getMinSeeds();
    
    if (!settings.url || !settings.apiKey) {
      throw new Error('Prowlarr settings not configured');
    }

    try {
      const url = new URL('/api/v1/search', settings.url);
      url.searchParams.append('query', query);

      // Gestion des catégories
      if (category !== 'all' && CATEGORY_MAPPING[category]) {
        const categoryId = CATEGORY_MAPPING[category][0];
        if (categoryId) {
          url.searchParams.append('categories', categoryId.toString());
        }
      }

      if (this.DEBUG) {
        console.log('🏷️ Selected category:', category);
        console.log('📊 Category ID:', CATEGORY_MAPPING[category]?.[0]);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(settings.apiKey)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Prowlarr API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Prowlarr API error: ${errorText}`);
      }

      const data = await response.json();

      if (this.DEBUG) {
        console.log('📦 Raw results:', data);
      }

      const results = data
        .map((item: any) => ({
          name: item.title,
          link: item.downloadUrl || item.guid,
          size: item.size,
          seeds: item.seeders || 0,
          leech: item.peers || 0,
          engine_url: item.indexer,
          desc_link: item.infoUrl || '',
          category: this.getCategoryName(item.categories?.[0]?.id)
        }))
        .filter((item: SearchResult) => item.seeds >= minSeeds);

      return results;
    } catch (error) {
      console.error('🚨 Prowlarr search error:', error);
      throw error;
    }
  }

  private getCategoryName(categoryId: number): string {
    if (!categoryId) return 'Unknown';
    
    // Movies: 2000-2999
    if (categoryId >= 2000 && categoryId < 3000) return 'Movies';
    
    // TV: 5000-5999 (excluding 5070)
    if ((categoryId >= 5000 && categoryId < 5070) || (categoryId > 5070 && categoryId < 6000)) return 'TV';
    
    // Anime: 5070
    if (categoryId === 5070) return 'Anime';
    
    // Music: 3000-3999
    if (categoryId >= 3000 && categoryId < 4000) return 'Music';
    
    // Software: 4000-4999
    if (categoryId >= 4000 && categoryId < 5000) return 'Software';
    
    // Books: 7000-7999
    if (categoryId >= 7000 && categoryId < 8000) return 'Books';
    
    return 'Other';
  }
}

export const prowlarrAPI = new ProwlarrAPI();