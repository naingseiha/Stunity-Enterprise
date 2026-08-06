'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  Clock3,
  Compass,
  FileText,
  Loader2,
  Search,
  TrendingUp,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { TokenManager } from '@/lib/api/auth';
import {
  fetchUnifiedSearch,
  formatRole,
  getInitials,
  type SearchClub,
  type SearchCourse,
  type SearchUser,
} from '@/lib/search/api';
import { SEARCH_DEBOUNCE_MS, TRENDING_TOPICS } from '@/lib/search/constants';
import {
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
} from '@/lib/search/recentSearches';

type SuggestionKind = 'people' | 'posts' | 'clubs' | 'courses' | 'recent' | 'topic' | 'seeAll';

type SuggestionItem = {
  id: string;
  kind: SuggestionKind;
  label: string;
  sublabel?: string;
  href?: string;
  query?: string;
  avatarUrl?: string | null;
  initials?: string;
};

interface GlobalSearchProps {
  className?: string;
  compact?: boolean;
}

export default function GlobalSearch({ className = '', compact = false }: GlobalSearchProps) {
  const t = useTranslations('common.search');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split('/')[1] || 'en';
  const [, startTransition] = useTransition();
  const listboxId = useId();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [clubs, setClubs] = useState<SearchClub[]>([]);
  const [courses, setCourses] = useState<SearchCourse[]>([]);

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const q = searchParams?.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        setFocused(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    const controller = new AbortController();
    const token = TokenManager.getAccessToken();
    const trimmed = debouncedQuery.trim();

    if (!trimmed || !token || !open) {
      setUsers([]);
      setPosts([]);
      setClubs([]);
      setCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchUnifiedSearch({
      query: trimmed,
      token,
      userLimit: 5,
      postLimit: 4,
      clubLimit: 3,
      courseLimit: 3,
      signal: controller.signal,
    })
      .then((result) => {
        setUsers(result.users);
        setPosts(result.posts);
        setClubs(result.clubs);
        setCourses(result.courses);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('Typeahead search failed:', error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, open]);

  const goToSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const next = saveRecentSearch(trimmed);
      setRecent(next);
      setOpen(false);
      setFocused(false);
      startTransition(() => {
        router.push(`/${locale}/search?q=${encodeURIComponent(trimmed)}`);
      });
    },
    [locale, router, startTransition],
  );

  const suggestions = useMemo(() => {
    const items: SuggestionItem[] = [];
    const trimmed = query.trim();

    if (!trimmed) {
      recent.forEach((term) => {
        items.push({
          id: `recent-${term}`,
          kind: 'recent',
          label: term,
          query: term,
        });
      });
      TRENDING_TOPICS.slice(0, 6).forEach((topic) => {
        items.push({
          id: `topic-${topic}`,
          kind: 'topic',
          label: topic,
          query: topic,
        });
      });
      return items;
    }

    users.forEach((user) => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      items.push({
        id: `user-${user.id}`,
        kind: 'people',
        label: name || t('people'),
        sublabel: user.headline || user.professionalTitle || formatRole(user.role),
        href: `/${locale}/profile/${user.id}`,
        avatarUrl: user.profilePictureUrl,
        initials: getInitials(user.firstName, user.lastName),
      });
    });

    posts.forEach((post) => {
      const title =
        post.title ||
        post.content?.slice(0, 72) ||
        t('posts');
      items.push({
        id: `post-${post.id}`,
        kind: 'posts',
        label: title,
        sublabel:
          `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim() ||
          post.author?.name,
        href: `/${locale}/feed/post/${post.id}`,
      });
    });

    clubs.forEach((club) => {
      items.push({
        id: `club-${club.id}`,
        kind: 'clubs',
        label: club.name,
        sublabel: club.category || t('clubs'),
        href: `/${locale}/clubs/${club.id}`,
        avatarUrl: club.avatarUrl || club.coverImageUrl,
        initials: club.name.slice(0, 2).toUpperCase(),
      });
    });

    courses.forEach((course) => {
      items.push({
        id: `course-${course.id}`,
        kind: 'courses',
        label: course.title,
        sublabel: course.category || course.level || t('courses'),
        href: `/${locale}/learn/course/${course.id}`,
        avatarUrl: course.thumbnailUrl,
        initials: course.title.slice(0, 2).toUpperCase(),
      });
    });

    items.push({
      id: 'see-all',
      kind: 'seeAll',
      label: t('seeAllResults', { query: trimmed }),
      query: trimmed,
    });

    return items;
  }, [clubs, courses, locale, posts, query, recent, t, users]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length, debouncedQuery, open]);

  const activateSuggestion = useCallback(
    (item: SuggestionItem) => {
      if (item.href) {
        if (query.trim()) {
          setRecent(saveRecentSearch(query.trim()));
        }
        setOpen(false);
        setFocused(false);
        startTransition(() => router.push(item.href!));
        return;
      }
      if (item.query) {
        setQuery(item.query);
        goToSearch(item.query);
      }
    },
    [goToSearch, query, router, startTransition],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true);
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      if (selected) {
        activateSuggestion(selected);
      } else if (query.trim()) {
        goToSearch(query);
      }
    }
  };

  const showIdlePanel = open && !query.trim();
  const showResultsPanel = open && Boolean(query.trim());

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="group relative w-full">
        <Search
          className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
            focused ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={suggestions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          placeholder={t('placeholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            setRecent(getRecentSearches());
          }}
          onKeyDown={onKeyDown}
          className={`
            w-full rounded-xl border border-transparent bg-transparent py-2 pl-9 pr-16 text-[13px] transition-all duration-200
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            hover:bg-slate-100/80 dark:hover:bg-slate-900
            focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200/70
            dark:focus:border-slate-700 dark:focus:bg-slate-950 dark:focus:ring-slate-800
            ${compact ? 'text-[12px]' : ''}
          `}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query ? (
            <button
              type="button"
              aria-label={tCommon('clearSearch')}
              onClick={() => {
                setQuery('');
                setUsers([]);
                setPosts([]);
                setClubs([]);
                setCourses([]);
                inputRef.current?.focus();
              }}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 xl:inline">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {(showIdlePanel || showResultsPanel) && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950"
        >
          {showIdlePanel && (
            <div className="max-h-[28rem] overflow-y-auto p-3">
              {recent.length > 0 && (
                <section className="mb-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t('recent')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecentSearches();
                        setRecent([]);
                      }}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {t('clearAll')}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recent.map((term, index) => (
                      <div
                        key={term}
                        id={`${listboxId}-${index}`}
                        role="option"
                        aria-selected={activeIndex === index}
                        className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                          activeIndex === index
                            ? 'bg-slate-100 dark:bg-slate-900'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'
                        }`}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => goToSearch(term)}
                        >
                          <Clock3 className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate text-sm text-slate-800 dark:text-slate-100">
                            {term}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={t('removeRecent')}
                          onClick={() => setRecent(removeRecentSearch(term))}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-2 flex items-center gap-1.5 px-1">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t('trending')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 px-1 pb-1">
                  {TRENDING_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => goToSearch(topic)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </section>

              <div className="mt-3 border-t border-slate-100 px-1 pt-3 dark:border-slate-800">
                <Link
                  href={`/${locale}/search`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <Compass className="h-4 w-4" />
                  {t('openSearch')}
                </Link>
              </div>
            </div>
          )}

          {showResultsPanel && (
            <div className="max-h-[28rem] overflow-y-auto p-2">
              {loading && suggestions.length <= 1 && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('searching')}
                </div>
              )}

              {!loading && suggestions.length === 1 && (
                <div className="px-3 py-6 text-center">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {t('noResults')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{t('noResultsSub')}</p>
                </div>
              )}

              <div className="space-y-0.5">
                {suggestions.map((item, index) => {
                  const Icon =
                    item.kind === 'people'
                      ? Users
                      : item.kind === 'posts'
                        ? FileText
                        : item.kind === 'clubs'
                          ? UsersRound
                          : item.kind === 'courses'
                            ? BookOpen
                            : Search;

                  return (
                    <button
                      key={item.id}
                      id={`${listboxId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => activateSuggestion(item)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                        activeIndex === index
                          ? 'bg-slate-100 dark:bg-slate-900'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'
                      } ${item.kind === 'seeAll' ? 'mt-1 border-t border-slate-100 pt-3 dark:border-slate-800' : ''}`}
                    >
                      {item.kind === 'people' || item.kind === 'clubs' || item.kind === 'courses' ? (
                        item.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.avatarUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[11px] font-semibold text-white">
                            {item.initials}
                          </div>
                        )
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                          <Icon className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {item.label}
                        </p>
                        {item.sublabel && (
                          <p className="truncate text-xs capitalize text-slate-500">{item.sublabel}</p>
                        )}
                      </div>
                      {item.kind !== 'seeAll' && (
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {item.kind === 'people'
                            ? t('people')
                            : item.kind === 'posts'
                              ? t('posts')
                              : item.kind === 'clubs'
                                ? t('clubs')
                                : t('courses')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
