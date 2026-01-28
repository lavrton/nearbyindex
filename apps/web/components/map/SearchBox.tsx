"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchBoxProps {
  onSelect: (lat: number, lng: number, address: string) => void;
}

export function SearchBox({ onSelect }: SearchBoxProps) {
  const t = useTranslations("map");
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
      onSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  return (
    <div className="absolute left-4 top-4 z-10 w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-9 pr-9 bg-background shadow-lg"
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

      {isOpen && results.length > 0 && (
        <div className="mt-1 rounded-lg border border-border bg-background shadow-lg">
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
  );
}
