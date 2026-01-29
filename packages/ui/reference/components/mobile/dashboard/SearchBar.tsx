"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, Users, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  type: "student" | "teacher";
  name: string;
  secondaryInfo: string;
  imageUrl?: string;
}

interface SearchBarProps {
  onResultClick?: (result: SearchResult) => void;
}

export default function SearchBar({ onResultClick }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const [studentsResponse, teachersResponse] = await Promise.all([
        fetch(`/api/students/lightweight`, {
          signal: abortControllerRef.current.signal
        }).then((res) => res.json()),
        fetch(`/api/teachers`, {
          signal: abortControllerRef.current.signal
        }).then((res) => res.json()),
      ]);

        const students = studentsResponse.data || [];
        const teachers = teachersResponse.data || [];

        const searchTerm = query.toLowerCase();

        // Filter students
        const studentResults: SearchResult[] = students
          .filter(
            (student: any) =>
              student.khmerName?.toLowerCase().includes(searchTerm) ||
              student.studentId?.toLowerCase().includes(searchTerm) ||
              `${student.firstName} ${student.lastName}`
                .toLowerCase()
                .includes(searchTerm)
          )
          .slice(0, 5)
          .map((student: any) => ({
            id: student.id,
            type: "student" as const,
            name: student.khmerName || `${student.firstName} ${student.lastName}`,
            secondaryInfo: `${student.studentId} - ${student.className || "ថ្នាក់ទំនេរ"}`,
          }));

        // Filter teachers
        const teacherResults: SearchResult[] = teachers
          .filter(
            (teacher: any) =>
              teacher.khmerName?.toLowerCase().includes(searchTerm) ||
              `${teacher.firstName} ${teacher.lastName}`
                .toLowerCase()
                .includes(searchTerm)
          )
          .slice(0, 5)
          .map((teacher: any) => ({
            id: teacher.id,
            type: "teacher" as const,
            name: teacher.khmerName || `${teacher.firstName} ${teacher.lastName}`,
            secondaryInfo: teacher.homeroomClassName
              ? `គ្រូថ្នាក់ ${teacher.homeroomClassName}`
              : "គ្រូបង្រៀន",
          }));

      setResults([...studentResults, ...teacherResults]);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch();
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setQuery("");

    if (onResultClick) {
      onResultClick(result);
    } else {
      // Default navigation behavior
      if (result.type === "student") {
        router.push(`/students/${result.id}`);
      } else {
        router.push(`/teachers/${result.id}`);
      }
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ស្វែងរកសិស្ស ឬគ្រូបង្រៀន..."
          className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-khmer-body"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-khmer-body text-sm text-gray-500 mt-2">
                កំពុងស្វែងរក...
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      result.type === "student"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {result.type === "student" ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-khmer-body font-semibold text-gray-900 truncate">
                      {result.name}
                    </p>
                    <p className="font-khmer-body text-xs text-gray-500 truncate">
                      {result.secondaryInfo}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        result.type === "student"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {result.type === "student" ? "សិស្ស" : "គ្រូ"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-khmer-body text-gray-500 font-medium">
                មិនមានលទ្ធផល
              </p>
              <p className="font-khmer-body text-xs text-gray-400 mt-1">
                សូមសាកល្បងវាយបញ្ចូលឈ្មោះផ្សេង
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
