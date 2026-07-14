import {Search} from 'lucide-react';

export function SearchBar({className = ''}: {className?: string}) {
  return (
    <label
      className={`flex h-12 w-full max-w-[650px] items-center gap-3 rounded-full border border-black/[0.04] bg-white px-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition focus-within:ring-2 focus-within:ring-[#2563EB]/20 ${className}`}
    >
      <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
      <input
        type="search"
        placeholder="Search for services, events, artists..."
        className="w-full border-0 bg-transparent text-[14px] text-[#111111] outline-none placeholder:text-[#9CA3AF]"
        aria-label="Search"
      />
    </label>
  );
}
