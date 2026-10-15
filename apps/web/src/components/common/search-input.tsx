"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

// Waits for a pause in typing before searching, so each keystroke isn't a request.
export function SearchInput({
  value,
  onSearch,
  placeholder,
}: {
  value: string;
  onSearch: (q: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    if (text.trim() === value) return;
    const timer = setTimeout(() => onSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, value, onSearch]);

  return (
    <div className="relative max-w-sm">
      <SearchIcon aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        className="h-10 pl-9"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}
