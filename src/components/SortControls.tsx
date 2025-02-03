import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { SortOption } from '../types';

interface SortControlsProps {
  sortOption: SortOption;
  sortDirection: 'asc' | 'desc';
  onSortOptionChange: (option: SortOption) => void;
  onSortDirectionChange: (direction: 'asc' | 'desc') => void;
}

export function SortControls({
  sortOption,
  sortDirection,
  onSortOptionChange,
  onSortDirectionChange,
}: SortControlsProps) {
  const sortButtons = [
    { value: 'name' as SortOption, label: 'Nom' },
    { value: 'size' as SortOption, label: 'Taille' },
    { value: 'seeds' as SortOption, label: 'Sources' },
    { value: 'leech' as SortOption, label: 'Pairs' }
  ];

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-400 mr-2">Trier par:</span>
      <div className="flex flex-wrap gap-2">
        {sortButtons.map((button) => (
          <button
            key={button.value}
            onClick={() => onSortOptionChange(button.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              sortOption === button.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {button.label}
          </button>
        ))}
        <button
          onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
          className="p-1.5 bg-gray-800 rounded-md text-gray-400 hover:text-blue-400 transition-colors"
          title={sortDirection === 'asc' ? 'Tri croissant' : 'Tri décroissant'}
        >
          <ArrowUpDown 
            size={20} 
            className={`transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>
    </div>
  );
}