"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { Search, X, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface HeaderProps {
  onSearchSelect?: (lat: number, lng: number, address: string) => void;
}

export function Header({ onSearchSelect }: HeaderProps) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const search = useDebouncedCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(searchQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setIsOpen(data.length > 0);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      search(value);
    },
    [search]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery(result.display_name);
      setResults([]);
      setIsOpen(false);
      onSearchSelect?.(
        parseFloat(result.lat),
        parseFloat(result.lon),
        result.display_name
      );
    },
    [onSearchSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  return (
    <header className="h-14 bg-background border-b border-border shadow-sm flex items-center px-4 gap-4 z-20 relative">
      {/* Logo and tagline */}
      <div className="flex items-center gap-2 shrink-0">
        <MapPin className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm hidden sm:inline">
          {t("common.appName")}
        </span>
      </div>

      {/* Tagline - hidden on mobile */}
      <span className="text-sm text-muted-foreground hidden md:inline">
        {t("header.tagline")}
      </span>

      {/* Search box - centered */}
      <div className="flex-1 max-w-md mx-auto relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("map.searchPlaceholder")}
            value={query}
            onChange={handleInputChange}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            className="pl-9 pr-9 h-9 bg-muted/50"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {!isLoading && query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search results dropdown */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-background shadow-lg z-50">
            {results.map((result, index) => (
              <button
                key={`${result.lat}-${result.lon}-${index}`}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-muted",
                  index === 0 && "rounded-t-lg",
                  index === results.length - 1 && "rounded-b-lg"
                )}
                onClick={() => handleSelect(result)}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer for balance */}
      <div className="w-24 shrink-0 hidden md:block" />
    </header>
  );
}
