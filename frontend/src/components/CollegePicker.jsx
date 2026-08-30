import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Search,
  X,
  Check,
  MapPin,
  Building2,
  ChevronDown,
  ArrowLeft,
  Pencil,
  CircleHelp,
  Loader2,
} from 'lucide-react';
import apiClient from '../services/apiClient.js';
import { cx, inputClass } from './shared.jsx';

async function fetchCollegeStates() {
  const { data } = await apiClient.get('/colleges/states');
  return data?.data || [];
}

async function fetchColleges({ search = '', state = '', limit = 30 }) {
  const params = {};
  if (state.trim()) params.state = state.trim();
  if (search.trim()) params.search = search.trim();
  params.limit = limit;
  const { data } = await apiClient.get('/colleges', { params });
  return data || { success: false, data: [], pagination: {} };
}

function getTypeBadge(type) {
  switch (type) {
    case 'Institute of National Importance':
      return { cls: 'bg-accent/15 text-accent', label: 'National Institute' };
    case 'University':
    case 'Deemed University':
      return { cls: 'bg-primary/15 text-primary', label: 'University' };
    default:
      return { cls: 'bg-muted text-muted-foreground', label: 'College' };
  }
}

export function CollegePicker({
  collegeId = null,
  collegeName = '',
  onSelect,
  disabled = false,
  placeholder = 'Search your college or university',
}) {
  const [open, setOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [statesList, setStatesList] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  // Load states once when modal opens
  useEffect(() => {
    if (open && statesList.length === 0) {
      fetchCollegeStates()
        .then(setStatesList)
        .catch(() => {});
    }
  }, [open, statesList.length]);

  const doFetch = useCallback(async (search, state) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchColleges({ search: search.trim(), state: state.trim(), limit: 30 });
      setColleges(res.data || []);
    } catch {
      setError('Unable to load colleges. Please check your connection.');
      setColleges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch on search/state change
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doFetch(searchQuery, selectedState), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [open, searchQuery, selectedState, doFetch]);

  // Focus search input when modal opens
  useEffect(() => {
    if (open && !isManual) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open, isManual]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    setIsManual(false);
    setSearchQuery('');
    setManualInput(collegeName && !collegeId ? collegeName : '');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setIsManual(false);
  };

  const handleSelect = (item) => {
    onSelect?.({ collegeId: item.id, collegeName: item.name });
    handleClose();
  };

  const handleSaveManual = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    onSelect?.({ collegeId: null, collegeName: trimmed });
    handleClose();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect?.({ collegeId: null, collegeName: '' });
  };

  const hasSelection = Boolean(collegeName && collegeName.trim());

  const modal = open ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex h-[85vh] max-h-[620px] w-full max-w-[560px] flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          {isManual ? (
            <button
              type="button"
              onClick={() => setIsManual(false)}
              className="rounded-lg p-1.5 text-foreground hover:bg-muted"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <GraduationCap size={16} className="text-primary" />
            </div>
          )}
          <h2 className="flex-1 pl-3 font-display text-lg">
            {isManual ? 'Enter College Name' : 'Select College / University'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {isManual ? (
          /* ── Manual Entry ─────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              If your institution isn't listed in our curated database, you can enter its full name manually below.
            </p>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">College / University Name</span>
              <input
                type="text"
                className={inputClass}
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="Enter your college name"
                autoFocus
              />
            </label>
            <button
              type="button"
              className={cx(
                'focus-ring w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
                manualInput.trim()
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
              )}
              onClick={handleSaveManual}
              disabled={!manualInput.trim()}
            >
              Confirm College
            </button>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setIsManual(false)}
            >
              Back to Search
            </button>
          </div>
        ) : (
          /* ── Search & Filter List ─────────────────────────────────── */
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {/* Search Bar */}
            <div className="shrink-0 px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 min-h-[44px]">
                <Search size={16} className="shrink-0 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search college name, short code, or city…"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* State Pills Bar - Horizontal scroll container */}
            <div className="shrink-0 px-5 py-2 overflow-hidden">
              <div
                className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <button
                  type="button"
                  className={cx(
                    'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    !selectedState
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => setSelectedState('')}
                >
                  All States &amp; UTs
                </button>
                {statesList.map(st => (
                  <button
                    key={st}
                    type="button"
                    className={cx(
                      'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                      selectedState === st
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    )}
                    onClick={() => setSelectedState(selectedState === st ? '' : st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* College Results - Vertical scroll container */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-3 pt-1 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 size={20} className="animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Searching institutions…</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-sm text-destructive">{error}</p>
                  <button
                    type="button"
                    className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-foreground"
                    onClick={() => doFetch(searchQuery, selectedState)}
                  >
                    Retry
                  </button>
                </div>
              ) : colleges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Building2 size={28} className="text-muted-foreground" />
                  <p className="font-display text-lg">No matching institutions</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    We couldn't find a matching college in this state or query.
                  </p>
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-primary/15 px-3.5 py-2 text-sm font-bold text-primary"
                    onClick={() => setIsManual(true)}
                  >
                    <Pencil size={14} /> Enter My College Manually
                  </button>
                </div>
              ) : (
                colleges.map(item => {
                  const isSelected = item.id === collegeId;
                  const badge = getTypeBadge(item.type);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={cx(
                        'w-full rounded-xl border p-3 text-left transition-colors',
                        isSelected
                          ? 'border-accent bg-accent/5'
                          : 'border-border bg-background hover:bg-muted/50'
                      )}
                      onClick={() => handleSelect(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cx('text-sm font-bold leading-snug', isSelected ? 'text-accent' : 'text-foreground')}>
                          {item.name}
                        </span>
                        {isSelected && <Check size={16} className="shrink-0 text-accent mt-0.5" />}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className={cx('rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', badge.cls)}>
                          {badge.label}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <MapPin size={11} />
                          {item.city ? `${item.city}, ` : ''}{item.state}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom: "My college isn't listed" */}
            <div className="shrink-0 border-t border-border bg-card px-5 py-3">
              <button
                type="button"
                className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                onClick={() => setIsManual(true)}
              >
                <CircleHelp size={14} /> My college isn't listed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        className={cx(
          inputClass,
          'flex items-center gap-2.5 text-left cursor-pointer',
          hasSelection && 'border-primary/40 bg-card',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={handleOpen}
        disabled={disabled}
      >
        <GraduationCap size={16} className={cx('shrink-0', hasSelection ? 'text-primary' : 'text-muted-foreground')} />
        <span className="flex-1 min-w-0">
          {hasSelection ? (
            <span className="block">
              <span className="block text-sm font-bold text-foreground truncate">{collegeName}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                {collegeId ? 'Listed Institution' : 'Custom / Unlisted Institution'}
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {hasSelection && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
              onKeyDown={e => { if (e.key === 'Enter') handleClear(e); }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className="text-muted-foreground" />
        </span>
      </button>

      {modal}
    </>
  );
}

