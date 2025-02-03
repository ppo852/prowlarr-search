export interface SearchResult {
  name: string;
  link: string;
  size: number;
  seeds: number;
  leech: number;
  engine_url: string;
  desc_link: string;
  category: string;
}

export interface Config {
  prowlarr: {
    apiKey: string;
    url: string;
  };
  qbittorrent: {
    url: string;
    username?: string;
    password?: string;
  };
  user: {
    id: string;
    name: string;
  };
}

export type SortOption = 'name' | 'size' | 'seeds' | 'leech';

export type CategoryType = 'all' | 'movies' | 'tv' | 'anime' | 'music' | 'software' | 'books';

export type SubCategoryType = 'all' | 'sd' | 'hd' | 'uhd' | 'bluray';

// Mapping des catégories principales
export const CATEGORY_MAPPING: Record<CategoryType, number[]> = {
  all: [],
  movies: [2000],
  tv: [5000],
  anime: [5070],
  music: [3000],
  software: [4000],
  books: [7000]
};

// Mapping des sous-catégories
export const SUBCATEGORY_MAPPING: Record<CategoryType, Record<SubCategoryType, number[]>> = {
  movies: {
    all: [2030, 2040, 2045, 2050],
    sd: [2030],
    hd: [2040],
    uhd: [2045],
    bluray: [2050]
  },
  tv: {
    all: [5030, 5040, 5045],
    sd: [5030],
    hd: [5040],
    uhd: [5045],
    bluray: []
  },
  anime: {
    all: [5070],
    sd: [],
    hd: [],
    uhd: [],
    bluray: []
  },
  music: {
    all: [3000],
    sd: [],
    hd: [],
    uhd: [],
    bluray: []
  },
  software: {
    all: [4000],
    sd: [],
    hd: [],
    uhd: [],
    bluray: []
  },
  books: {
    all: [7000],
    sd: [],
    hd: [],
    uhd: [],
    bluray: []
  },
  all: {
    all: [],
    sd: [],
    hd: [],
    uhd: [],
    bluray: []
  }
};