import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchFilterProps {
  onSearch: (query: string) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSearch} className="mb-4 w-full max-w-md mx-auto">
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="Search tokens..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full py-2.5 pl-10 pr-24 text-[10px] sm:text-xs text-[#F9F9F9] bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:ring-1 focus:ring-[#5252FF] focus:border-[#5252FF] transition-colors duration-200"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <button
          type="submit"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 text-[10px] sm:text-xs font-medium bg-[#5252FF] text-[#F9F9F9] rounded-full hover:bg-[#333391] focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors duration-200"
        >
          Search
        </button>
      </div>
    </form>
  );
};

export default SearchFilter;