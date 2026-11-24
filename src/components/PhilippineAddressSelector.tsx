import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import {
  fetchPhilatlasBarangays,
  fetchPhilatlasMunicipalities,
  fetchPhilatlasProvinces,
  getCachedPhilatlasProvinces,
  normalizePhilatlasKey,
  PhilatlasBarangay,
  PhilatlasMunicipality,
  PhilatlasProvince,
} from '../services/philatlasService';

export type AddressFormVariant = 'colb' | 'com';

export interface DropdownOption {
  value: string;
  label: string;
  path?: string;
  badge?: string;
}

interface SearchableLocationDropdownProps {
  label: string;
  required?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  value: string;
  options: DropdownOption[];
  loading?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  errorText?: string | null;
  variant: AddressFormVariant;
  onSelect: (value: string, option?: DropdownOption) => void;
  onClear?: () => void;
  allowCustom?: boolean;
}

const MAX_RENDERED_OPTIONS = 160;

export const SearchableLocationDropdown: React.FC<SearchableLocationDropdownProps> = ({
  label,
  required = false,
  placeholder,
  searchPlaceholder,
  value,
  options,
  loading = false,
  disabled = false,
  disabledHint,
  errorText,
  variant,
  onSelect,
  onClear,
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const theme =
    variant === 'colb'
      ? {
          border: 'border-[#348e38]',
          focusRing: 'focus:border-[#1f6123] focus:ring-2 focus:ring-[#348e38]/20',
          activeItem: 'bg-emerald-50 text-[#1f6123] font-semibold',
          hoverItem: 'hover:bg-emerald-50/70',
          badge: 'bg-emerald-50 text-[#246b27] border-[#348e38]/30',
          spinner: 'text-[#348e38]',
        }
      : {
          border: 'border-purple-700',
          focusRing: 'focus:border-purple-900 focus:ring-2 focus:ring-purple-700/20',
          activeItem: 'bg-purple-50 text-purple-900 font-semibold',
          hoverItem: 'hover:bg-purple-50/70',
          badge: 'bg-purple-50 text-purple-800 border-purple-700/30',
          spinner: 'text-purple-700',
        };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const qNorm = normalizePhilatlasKey(query);
    if (!qNorm) return options;
    const startsWith: DropdownOption[] = [];
    const contains: DropdownOption[] = [];
    for (const opt of options) {
      const optNorm = normalizePhilatlasKey(opt.label);
      if (optNorm.startsWith(qNorm)) {
        startsWith.push(opt);
      } else if (optNorm.includes(qNorm)) {
        contains.push(opt);
      }
    }
    return [...startsWith, ...contains];
  }, [options, query]);

  const visibleOptions = filtered.slice(0, MAX_RENDERED_OPTIONS);
  const hasExactMatch = useMemo(() => {
    const qNorm = normalizePhilatlasKey(query);
    if (!qNorm) return true;
    return options.some((o) => normalizePhilatlasKey(o.label) === qNorm);
  }, [options, query]);

  const trimmedQuery = query.trim();

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between gap-1 mb-1">
        <label className="block text-[12px] font-medium text-slate-800">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        {options.length > 0 && !disabled && (
          <span className="text-[10px] text-slate-400 tabular-nums">{options.length}</span>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className={`w-full px-3 py-2 pr-14 text-left text-sm bg-white border ${theme.border} rounded-lg transition-colors flex items-center justify-between gap-2 ${
            disabled
              ? 'bg-slate-50 text-slate-400 border-slate-300 cursor-not-allowed'
              : `text-slate-900 cursor-pointer ${theme.focusRing}`
          }`}
        >
          <span className={`truncate ${value ? 'uppercase font-medium text-slate-900' : 'text-slate-400'}`}>
            {value || (disabled && disabledHint ? disabledHint : placeholder)}
          </span>
        </button>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {loading ? (
            <Loader2 className={`w-4 h-4 animate-spin ${theme.spinner}`} />
          ) : (
            <>
              {value && !disabled && onClear && (
                <button
                  type="button"
                  title={`Clear ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="pointer-events-auto p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div
          className={`absolute left-0 right-0 z-50 mt-1 bg-white border ${theme.border} rounded-lg shadow-xl overflow-hidden`}
        >
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (visibleOptions.length > 0) {
                      const picked = visibleOptions[0];
                      onSelect(picked.value, picked);
                      setIsOpen(false);
                    } else if (allowCustom && trimmedQuery) {
                      onSelect(trimmedQuery);
                      setIsOpen(false);
                    }
                  }
                }}
                placeholder={searchPlaceholder}
                className={`w-full pl-8 pr-2.5 py-1.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none ${theme.focusRing}`}
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {loading && options.length === 0 && (
              <div className="py-5 px-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className={`w-3.5 h-3.5 animate-spin ${theme.spinner}`} />
                <span>Loading locations...</span>
              </div>
            )}

            {!loading && errorText && options.length === 0 && (
              <div className="py-3 px-3 text-xs text-amber-700 bg-amber-50/60">
                {errorText}
              </div>
            )}

            {!loading && visibleOptions.length === 0 && !trimmedQuery && !errorText && (
              <div className="py-4 px-3 text-center text-xs text-slate-400">
                No entries available. Type above to enter manually.
              </div>
            )}

            {visibleOptions.map((opt) => {
              const isSelected =
                value && normalizePhilatlasKey(value) === normalizePhilatlasKey(opt.label);
              return (
                <button
                  key={`${opt.path || opt.value}-${opt.label}`}
                  type="button"
                  onClick={() => {
                    onSelect(opt.value, opt);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected ? theme.activeItem : `text-slate-700 ${theme.hoverItem}`
                  }`}
                >
                  <span className="truncate uppercase">{opt.label}</span>
                  {opt.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${theme.badge}`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {filtered.length > MAX_RENDERED_OPTIONS && (
              <div className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-50 text-center">
                Showing first {MAX_RENDERED_OPTIONS} of {filtered.length} matches &mdash; type to narrow
              </div>
            )}

            {allowCustom && trimmedQuery && !hasExactMatch && (
              <button
                type="button"
                onClick={() => {
                  onSelect(trimmedQuery);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border-t border-slate-200 cursor-pointer"
              >
                Use custom: <span className="uppercase font-bold">&ldquo;{trimmedQuery}&rdquo;</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HIGH-LEVEL CASCADING ADDRESS SELECTOR
// ============================================================================

export interface PhilippineAddressValue {
  province: string;
  cityMunicipality: string;
  barangay: string;
  street: string;
  country: string;
}

interface PhilippineAddressSelectorProps {
  variant: AddressFormVariant;
  province: string;
  cityMunicipality: string;
  barangay?: string;
  street?: string;
  country?: string;
  showBarangay?: boolean;
  showStreet?: boolean;
  showCountry?: boolean;
  streetLabel?: string;
  streetPlaceholder?: string;
  streetInputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  provinceRequired?: boolean;
  cityRequired?: boolean;
  barangayRequired?: boolean;
  onChange: (next: PhilippineAddressValue) => void;
}

export const PhilippineAddressSelector: React.FC<PhilippineAddressSelectorProps> = ({
  variant,
  province,
  cityMunicipality,
  barangay = '',
  street = '',
  country = '',
  showBarangay = true,
  showStreet = false,
  showCountry = false,
  streetLabel = 'House No. / Street / Institution',
  streetPlaceholder = 'House No., Street, Purok / Subdivision (optional)',
  streetInputProps,
  provinceRequired = false,
  cityRequired = false,
  barangayRequired = false,
  onChange,
}) => {
  const [provinces, setProvinces] = useState<PhilatlasProvince[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);

  const [municipalities, setMunicipalities] = useState<PhilatlasMunicipality[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [municipalitiesError, setMunicipalitiesError] = useState<string | null>(null);

  const [barangays, setBarangays] = useState<PhilatlasBarangay[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [barangaysError, setBarangaysError] = useState<string | null>(null);

  const [selectedProvincePath, setSelectedProvincePath] = useState<string>('');
  const [selectedMunicipalityPath, setSelectedMunicipalityPath] = useState<string>('');
  const [lastSelectedBarangay, setLastSelectedBarangay] = useState<string>('');

  const inputClass =
    variant === 'colb'
      ? 'w-full px-3 py-2 text-sm text-slate-900 bg-white border border-[#348e38] rounded-lg focus:outline-none focus:border-[#1f6123] focus:ring-2 focus:ring-[#348e38]/20 transition-colors placeholder:text-slate-400'
      : 'w-full px-3 py-2 text-sm text-slate-900 bg-white border border-purple-700 rounded-lg focus:outline-none focus:border-purple-900 focus:ring-2 focus:ring-purple-700/20 transition-colors placeholder:text-slate-400';

  // 1. Load provinces once
  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    setProvincesError(null);
    fetchPhilatlasProvinces()
      .then((list) => {
        if (!cancelled) setProvinces(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setProvincesError(err instanceof Error ? err.message : 'Failed to load provinces.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const autoCountrySyncedRef = useRef<string>('');

  const matchedProvince = useMemo(() => {
    const provTrim = (province || '').trim();
    if (!provTrim || provinces.length === 0) return null;
    const norm = normalizePhilatlasKey(provTrim);
    return (
      provinces.find((p) => normalizePhilatlasKey(p.name) === norm) ||
      provinces.find(
        (p) =>
          normalizePhilatlasKey(p.name).includes(norm) ||
          norm.includes(normalizePhilatlasKey(p.name))
      ) ||
      null
    );
  }, [province, provinces]);

  // 2. Match province name -> provincePath & load municipalities
  useEffect(() => {
    const provTrim = (province || '').trim();
    if (!provTrim) {
      setSelectedProvincePath('');
      setMunicipalities([]);
      setSelectedMunicipalityPath('');
      setBarangays([]);
      return;
    }

    if (!matchedProvince && provinces.length === 0) {
      return;
    }

    const pathToUse = matchedProvince?.path || '';
    if (!pathToUse && provinces.length > 0) {
      setSelectedProvincePath('');
      setMunicipalities([]);
      return;
    }

    setSelectedProvincePath(pathToUse);
    let cancelled = false;
    setLoadingMunicipalities(true);
    setMunicipalitiesError(null);
    fetchPhilatlasMunicipalities({
      provincePath: pathToUse,
      province: matchedProvince?.name || provTrim,
    })
      .then((list) => {
        if (!cancelled) setMunicipalities(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setMunicipalitiesError(
            err instanceof Error ? err.message : 'Failed to load municipalities.'
          );
          setMunicipalities([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMunicipalities(false);
      });

    return () => {
      cancelled = true;
    };
  }, [province, provinces, matchedProvince]);

  // 3. Match municipality name -> municipalityPath & load barangays
  useEffect(() => {
    if (!showBarangay) return;
    const cityTrim = (cityMunicipality || '').trim();
    if (!cityTrim || !province.trim()) {
      setSelectedMunicipalityPath('');
      setBarangays([]);
      return;
    }

    const norm = normalizePhilatlasKey(cityTrim);
    const matched =
      municipalities.find((m) => normalizePhilatlasKey(m.name) === norm) ||
      municipalities.find(
        (m) =>
          normalizePhilatlasKey(m.name).includes(norm) ||
          norm.includes(normalizePhilatlasKey(m.name))
      );

    if (!matched) {
      if (municipalities.length > 0) {
        setSelectedMunicipalityPath('');
        setBarangays([]);
      }
      return;
    }

    setSelectedMunicipalityPath(matched.path);
    let cancelled = false;
    setLoadingBarangays(true);
    setBarangaysError(null);
    fetchPhilatlasBarangays({
      municipalityPath: matched.path,
      provincePath: selectedProvincePath || undefined,
      province,
      municipality: matched.name,
    })
      .then((list) => {
        if (!cancelled) setBarangays(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setBarangaysError(err instanceof Error ? err.message : 'Failed to load barangays.');
          setBarangays([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBarangays(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showBarangay, province, cityMunicipality, municipalities, selectedProvincePath]);

  const provinceOptions: DropdownOption[] = useMemo(
    () =>
      provinces.map((p) => ({
        value: p.name,
        label: p.name,
        path: p.path,
        badge: p.region ? 'NCR' : undefined,
      })),
    [provinces]
  );

  const municipalityOptions: DropdownOption[] = useMemo(
    () =>
      municipalities.map((m) => ({
        value: m.name,
        label: m.name,
        path: m.path,
        badge: m.isCity ? 'City' : undefined,
      })),
    [municipalities]
  );

  const barangayOptions: DropdownOption[] = useMemo(
    () =>
      barangays.map((b) => ({
        value: b.name,
        label: b.name,
        path: b.path,
      })),
    [barangays]
  );

  // Also try auto-detecting barangay inside `street` when `barangay` wasn't passed explicitly
  const detectedBarangay = useMemo(() => {
    if (barangay) return barangay;
    if (lastSelectedBarangay && !street) return lastSelectedBarangay;
    if (!street) return '';
    const parts = street
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const lastPart = parts[parts.length - 1] || '';
    const lastNorm = normalizePhilatlasKey(lastPart);
    if (barangays.length > 0) {
      const matched = barangays.find((b) => normalizePhilatlasKey(b.name) === lastNorm);
      if (matched) return matched.name;
    }
    if (lastSelectedBarangay && normalizePhilatlasKey(lastSelectedBarangay) === lastNorm) {
      return lastSelectedBarangay;
    }
    return '';
  }, [barangay, street, barangays, lastSelectedBarangay]);

  // Auto-label Country as Philippines when detected province is part of the Philippines
  useEffect(() => {
    if (!matchedProvince) {
      autoCountrySyncedRef.current = '';
      return;
    }
    if ((country || '').trim()) return;
    const syncKey = `${matchedProvince.path}::${cityMunicipality}`;
    if (autoCountrySyncedRef.current === syncKey) return;
    autoCountrySyncedRef.current = syncKey;
    onChange({
      province,
      cityMunicipality,
      barangay: detectedBarangay,
      street,
      country: 'Philippines',
    });
  }, [matchedProvince, country, province, cityMunicipality, detectedBarangay, street, onChange]);

  const emitChange = (partial: Partial<PhilippineAddressValue>) => {
    onChange({
      province: partial.province ?? province,
      cityMunicipality: partial.cityMunicipality ?? cityMunicipality,
      barangay: partial.barangay ?? detectedBarangay,
      street: partial.street ?? street,
      country: partial.country ?? country,
    });
  };

  return (
    <div className="space-y-2.5">
      <div
        className={`grid grid-cols-1 gap-2.5 ${
          showBarangay
            ? showCountry
              ? 'sm:grid-cols-2 lg:grid-cols-4'
              : 'sm:grid-cols-3'
            : showCountry
            ? 'sm:grid-cols-3'
            : 'sm:grid-cols-2'
        }`}
      >
        <SearchableLocationDropdown
          label="Province"
          required={provinceRequired}
          placeholder="Select province"
          searchPlaceholder="Search province (e.g. Bohol, Cebu)..."
          value={province}
          options={provinceOptions}
          loading={loadingProvinces}
          errorText={provincesError}
          variant={variant}
          onSelect={(val, opt) => {
            const changed = normalizePhilatlasKey(val) !== normalizePhilatlasKey(province);
            if (changed) setLastSelectedBarangay('');
            emitChange({
              province: val,
              cityMunicipality: changed ? '' : cityMunicipality,
              barangay: changed ? '' : detectedBarangay,
              country: opt?.path ? 'Philippines' : country,
            });
          }}
          onClear={() => {
            setLastSelectedBarangay('');
            emitChange({
              province: '',
              cityMunicipality: '',
              barangay: '',
              country: /^philippines$/i.test((country || '').trim()) ? '' : country,
            });
          }}
        />

        <SearchableLocationDropdown
          label="City / Municipality"
          required={cityRequired}
          placeholder="Select city / municipality"
          searchPlaceholder="Search municipality or city..."
          value={cityMunicipality}
          options={municipalityOptions}
          loading={loadingMunicipalities}
          disabled={!province.trim()}
          disabledHint="Select province first"
          errorText={municipalitiesError}
          variant={variant}
          onSelect={(val, opt) => {
            const changed = normalizePhilatlasKey(val) !== normalizePhilatlasKey(cityMunicipality);
            if (changed) setLastSelectedBarangay('');
            emitChange({
              cityMunicipality: val,
              barangay: changed ? '' : detectedBarangay,
              country: opt?.path || matchedProvince ? 'Philippines' : country,
            });
          }}
          onClear={() => {
            setLastSelectedBarangay('');
            emitChange({
              cityMunicipality: '',
              barangay: '',
            });
          }}
        />

        {showBarangay && (
          <SearchableLocationDropdown
            label="Barangay"
            required={barangayRequired}
            placeholder="Select barangay"
            searchPlaceholder="Search barangay..."
            value={detectedBarangay}
            options={barangayOptions}
            loading={loadingBarangays}
            disabled={!cityMunicipality.trim()}
            disabledHint="Select municipality first"
            errorText={barangaysError}
            variant={variant}
            onSelect={(val, opt) => {
              setLastSelectedBarangay(val);
              emitChange({
                barangay: val,
                country: opt?.path || matchedProvince ? 'Philippines' : country,
              });
            }}
            onClear={() => {
              setLastSelectedBarangay('');
              emitChange({
                barangay: '',
              });
            }}
          />
        )}

        {showCountry && (
          <div>
            <label className="block text-[12px] font-medium text-slate-800 mb-1">Country</label>
            <input
              type="text"
              placeholder="Philippines"
              value={country || (matchedProvince ? 'Philippines' : '')}
              onChange={(e) => emitChange({ country: e.target.value })}
              className={`${inputClass} uppercase`}
            />
          </div>
        )}
      </div>

      {showStreet && (
        <div>
          <label className="block text-[12px] font-medium text-slate-800 mb-1">
            {streetLabel}
          </label>
          <input
            type="text"
            {...streetInputProps}
            placeholder={streetPlaceholder}
            value={street}
            onChange={(e) => emitChange({ street: e.target.value })}
            className={`${inputClass} uppercase`}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ADDRESS COMPOSITION HELPERS FOR EXISTING STRING-BASED FIELDS
// ============================================================================

/**
 * Strips any matching trailing barangay suffix from an existing street line
 * before appending the newly selected barangay, keeping Hospital / House No. / Street intact.
 */
export function mergeStreetWithBarangay(
  currentStreetLine: string,
  newBarangay: string,
  knownBarangays?: string[]
): string {
  const parts = (currentStreetLine || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 0 && knownBarangays && knownBarangays.length > 0) {
    const lastNorm = normalizePhilatlasKey(parts[parts.length - 1]);
    const isLastKnownBrgy = knownBarangays.some((b) => normalizePhilatlasKey(b) === lastNorm);
    if (isLastKnownBrgy) {
      parts.pop();
    }
  } else if (parts.length === 1 && !newBarangay) {
    return currentStreetLine;
  }

  if (newBarangay.trim()) {
    return [...parts, newBarangay.trim()].join(', ');
  }
  return parts.join(', ');
}

/**
 * Composes a single-line Philippine address string cleanly:
 * "[Street], [Barangay], [City/Municipality], [Province], Philippines"
 */
export function formatComposedPhilippineAddress(
  parts: PhilippineAddressValue,
  includeCountry = true
): string {
  const segments: string[] = [];
  const cleanStreet = (parts.street || '').trim();
  const cleanBrgy = (parts.barangay || '').trim();

  if (cleanStreet) {
    // Avoid duplicating barangay if user typed it in street
    if (
      cleanBrgy &&
      normalizePhilatlasKey(cleanStreet.split(',').pop() || '') === normalizePhilatlasKey(cleanBrgy)
    ) {
      segments.push(cleanStreet);
    } else {
      segments.push(cleanStreet);
      if (cleanBrgy) segments.push(cleanBrgy);
    }
  } else if (cleanBrgy) {
    segments.push(cleanBrgy);
  }

  if (parts.cityMunicipality.trim()) segments.push(parts.cityMunicipality.trim());
  if (parts.province.trim()) segments.push(parts.province.trim());
  if (includeCountry && parts.country.trim() && (parts.province.trim() || parts.cityMunicipality.trim())) {
    segments.push(parts.country.trim());
  }
  return segments.join(', ');
}

/**
 * Best-effort parser for single-line addresses like
 * "Purok 1, Poblacion, Sagbayan, Bohol, Philippines" -> { street, barangay, cityMunicipality, province, country }
 */
export function parseComposedPhilippineAddress(
  raw: string | undefined,
  hasBarangay = true
): PhilippineAddressValue {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed.toUpperCase() === 'N/A') {
    return {
      province: '',
      cityMunicipality: '',
      barangay: '',
      street: trimmed.toUpperCase() === 'N/A' ? 'N/A' : '',
      country: '',
    };
  }

  const rawParts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  let country = '';
  if (rawParts.length >= 2 && /^philippines$/i.test(rawParts[rawParts.length - 1])) {
    country = rawParts.pop() || 'Philippines';
  }

  const cachedProvinces = getCachedPhilatlasProvinces() || [];
  const matchesKnownProvince = (candidate: string): string | null => {
    const norm = normalizePhilatlasKey(candidate);
    if (!norm || cachedProvinces.length === 0) return null;
    const hit = cachedProvinces.find((p) => normalizePhilatlasKey(p.name) === norm);
    return hit ? hit.name : null;
  };

  if (!hasBarangay) {
    if (rawParts.length === 1) {
      const asProv = matchesKnownProvince(rawParts[0]);
      if (asProv) {
        return {
          province: asProv,
          cityMunicipality: '',
          barangay: '',
          street: '',
          country: country || 'Philippines',
        };
      }
      return {
        cityMunicipality: rawParts[0],
        province: '',
        barangay: '',
        street: '',
        country,
      };
    }
    const prov = rawParts.pop() || '';
    const city = rawParts.pop() || '';
    const street = rawParts.join(', ');
    return {
      province: prov,
      cityMunicipality: city,
      barangay: '',
      street,
      country,
    };
  }

  if (rawParts.length === 1) {
    const asProv = matchesKnownProvince(rawParts[0]);
    if (asProv) {
      return {
        province: asProv,
        cityMunicipality: '',
        barangay: '',
        street: '',
        country: country || 'Philippines',
      };
    }
    return {
      province: '',
      cityMunicipality: '',
      barangay: rawParts[0],
      street: '',
      country,
    };
  }
  if (rawParts.length === 2) {
    return {
      cityMunicipality: rawParts[0],
      province: rawParts[1],
      barangay: '',
      street: '',
      country,
    };
  }
  const prov = rawParts.pop() || '';
  const city = rawParts.pop() || '';
  const brgy = rawParts.pop() || '';
  const street = rawParts.join(', ');
  return {
    province: prov,
    cityMunicipality: city,
    barangay: brgy,
    street,
    country,
  };
}

// ============================================================================
// STRUCTURED WRAPPER FOR COLB (ITEM 4, 13, 19: STREET+BARANGAY / CITY / PROV)
// ============================================================================

export interface ColbStreetBarangayValue {
  province: string;
  cityMunicipality: string;
  streetLine: string;
  country: string;
}

interface ColbStreetBarangayAddressInputProps {
  province: string;
  cityMunicipality: string;
  streetLine: string;
  country?: string;
  showCountry?: boolean;
  required?: boolean;
  streetLabel?: string;
  streetPlaceholder?: string;
  streetInputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  cityPlaceholder?: string;
  provincePlaceholder?: string;
  countryPlaceholder?: string;
  onChange: (next: ColbStreetBarangayValue) => void;
}

export const ColbStreetBarangayAddressInput: React.FC<ColbStreetBarangayAddressInputProps> = ({
  province,
  cityMunicipality,
  streetLine,
  country = '',
  showCountry = true,
  required = false,
  streetLabel = 'House No. / Street / Subdivision (Optional)',
  streetPlaceholder = 'e.g. Purok 2, Rizal St. or Rural Health Unit',
  streetInputProps,
  onChange,
}) => {
  const [provinces, setProvinces] = useState<PhilatlasProvince[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);

  const [municipalities, setMunicipalities] = useState<PhilatlasMunicipality[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [municipalitiesError, setMunicipalitiesError] = useState<string | null>(null);

  const [barangays, setBarangays] = useState<PhilatlasBarangay[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [barangaysError, setBarangaysError] = useState<string | null>(null);

  const [selectedProvincePath, setSelectedProvincePath] = useState('');
  const [lastSelectedBarangay, setLastSelectedBarangay] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    fetchPhilatlasProvinces()
      .then((list) => {
        if (!cancelled) setProvinces(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setProvincesError(err instanceof Error ? err.message : 'Failed to load provinces.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const autoCountrySyncedRef = useRef<string>('');

  const matchedProvince = useMemo(() => {
    const provTrim = (province || '').trim();
    if (!provTrim || provinces.length === 0) return null;
    const norm = normalizePhilatlasKey(provTrim);
    return (
      provinces.find((p) => normalizePhilatlasKey(p.name) === norm) ||
      provinces.find(
        (p) =>
          normalizePhilatlasKey(p.name).includes(norm) ||
          norm.includes(normalizePhilatlasKey(p.name))
      ) ||
      null
    );
  }, [province, provinces]);

  // Auto-label Country as Philippines when detected province is part of the Philippines
  useEffect(() => {
    if (!matchedProvince) {
      autoCountrySyncedRef.current = '';
      return;
    }
    if ((country || '').trim()) return;
    const syncKey = `${matchedProvince.path}::${cityMunicipality}`;
    if (autoCountrySyncedRef.current === syncKey) return;
    autoCountrySyncedRef.current = syncKey;
    onChange({
      province,
      cityMunicipality,
      streetLine,
      country: 'Philippines',
    });
  }, [matchedProvince, country, province, cityMunicipality, streetLine, onChange]);

  useEffect(() => {
    const provTrim = (province || '').trim();
    if (!provTrim) {
      setSelectedProvincePath('');
      setMunicipalities([]);
      setBarangays([]);
      return;
    }

    if (!matchedProvince && provinces.length === 0) return;
    if (!matchedProvince) {
      setSelectedProvincePath('');
      setMunicipalities([]);
      return;
    }

    setSelectedProvincePath(matchedProvince.path);
    let cancelled = false;
    setLoadingMunicipalities(true);
    setMunicipalitiesError(null);
    fetchPhilatlasMunicipalities({
      provincePath: matchedProvince.path,
      province: matchedProvince.name,
    })
      .then((list) => {
        if (!cancelled) setMunicipalities(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setMunicipalitiesError(
            err instanceof Error ? err.message : 'Failed to load municipalities.'
          );
          setMunicipalities([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMunicipalities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [province, provinces, matchedProvince]);

  useEffect(() => {
    const cityTrim = (cityMunicipality || '').trim();
    if (!cityTrim || !province.trim()) {
      setBarangays([]);
      return;
    }
    const norm = normalizePhilatlasKey(cityTrim);
    const matched =
      municipalities.find((m) => normalizePhilatlasKey(m.name) === norm) ||
      municipalities.find(
        (m) =>
          normalizePhilatlasKey(m.name).includes(norm) ||
          norm.includes(normalizePhilatlasKey(m.name))
      );
    if (!matched) {
      if (municipalities.length > 0) setBarangays([]);
      return;
    }
    let cancelled = false;
    setLoadingBarangays(true);
    setBarangaysError(null);
    fetchPhilatlasBarangays({
      municipalityPath: matched.path,
      provincePath: selectedProvincePath || undefined,
      province,
      municipality: matched.name,
    })
      .then((list) => {
        if (!cancelled) setBarangays(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setBarangaysError(err instanceof Error ? err.message : 'Failed to load barangays.');
          setBarangays([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBarangays(false);
      });
    return () => {
      cancelled = true;
    };
  }, [province, cityMunicipality, municipalities, selectedProvincePath]);

  // Split existing streetLine into streetPrefix + currentBarangay using known PhilAtlas barangays (or lastSelectedBarangay)
  const { streetPrefix, currentBarangay } = useMemo(() => {
    const parts = (streetLine || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      return { streetPrefix: '', currentBarangay: '' };
    }
    const lastPart = parts[parts.length - 1];
    const lastNorm = normalizePhilatlasKey(lastPart);

    const matchedKnown = barangays.find((b) => normalizePhilatlasKey(b.name) === lastNorm);
    if (matchedKnown) {
      return {
        streetPrefix: parts.slice(0, -1).join(', '),
        currentBarangay: matchedKnown.name,
      };
    }

    if (
      lastSelectedBarangay &&
      normalizePhilatlasKey(lastSelectedBarangay) === lastNorm
    ) {
      return {
        streetPrefix: parts.slice(0, -1).join(', '),
        currentBarangay: lastSelectedBarangay,
      };
    }

    return { streetPrefix: streetLine, currentBarangay: '' };
  }, [streetLine, barangays, lastSelectedBarangay]);

  // Preserve exact typed characters & spaces while typing in the Hospital/Street input even when a Barangay is selected
  const [streetPrefixDraft, setStreetPrefixDraft] = useState(streetPrefix);
  const lastEmittedStreetLineRef = useRef<string>(streetLine);
  const prevDetectedBarangayRef = useRef<string>(currentBarangay);

  useEffect(() => {
    const barangayJustDetected = !prevDetectedBarangayRef.current && Boolean(currentBarangay);
    prevDetectedBarangayRef.current = currentBarangay;

    if (streetLine !== lastEmittedStreetLineRef.current || barangayJustDetected) {
      lastEmittedStreetLineRef.current = streetLine;
      setStreetPrefixDraft(streetPrefix);
    }
  }, [streetLine, streetPrefix, currentBarangay]);

  const provinceOptions: DropdownOption[] = useMemo(
    () =>
      provinces.map((p) => ({
        value: p.name,
        label: p.name,
        path: p.path,
        badge: p.region ? 'NCR' : undefined,
      })),
    [provinces]
  );

  const municipalityOptions: DropdownOption[] = useMemo(
    () =>
      municipalities.map((m) => ({
        value: m.name,
        label: m.name,
        path: m.path,
        badge: m.isCity ? 'City' : undefined,
      })),
    [municipalities]
  );

  const barangayOptions: DropdownOption[] = useMemo(
    () =>
      barangays.map((b) => ({
        value: b.name,
        label: b.name,
        path: b.path,
      })),
    [barangays]
  );

  const colbInputClass =
    'w-full px-3 py-2 text-sm text-slate-900 bg-white border border-[#348e38] rounded-lg focus:outline-none focus:border-[#1f6123] focus:ring-2 focus:ring-[#348e38]/20 transition-colors placeholder:text-slate-400';

  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-[12px] font-medium text-slate-800 mb-1">
          {streetLabel}
        </label>
        <input
          type="text"
          {...streetInputProps}
          placeholder={streetPlaceholder}
          value={streetPrefixDraft}
          onChange={(e) => {
            const nextPrefix = e.target.value;
            setStreetPrefixDraft(nextPrefix);
            const composed = currentBarangay
              ? [nextPrefix.trimEnd(), currentBarangay].filter((s) => s.trim().length > 0).join(', ')
              : nextPrefix;
            lastEmittedStreetLineRef.current = composed;
            onChange({
              province,
              cityMunicipality,
              streetLine: composed,
              country,
            });
          }}
          className={`${colbInputClass} uppercase`}
        />
      </div>

      <div className={`grid grid-cols-1 gap-2.5 ${showCountry ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <SearchableLocationDropdown
          label="Province"
          required={required}
          placeholder="Select province"
          searchPlaceholder="Search province (e.g. Bohol)..."
          value={province}
          options={provinceOptions}
          loading={loadingProvinces}
          errorText={provincesError}
          variant="colb"
          onSelect={(val, opt) => {
            const changed = normalizePhilatlasKey(val) !== normalizePhilatlasKey(province);
            if (changed) setLastSelectedBarangay('');
            onChange({
              province: val,
              cityMunicipality: changed ? '' : cityMunicipality,
              streetLine: changed ? streetPrefix : streetLine,
              country: opt?.path ? 'Philippines' : country,
            });
          }}
          onClear={() => {
            setLastSelectedBarangay('');
            onChange({
              province: '',
              cityMunicipality: '',
              streetLine: streetPrefix,
              country: /^philippines$/i.test((country || '').trim()) ? '' : country,
            });
          }}
        />

        <SearchableLocationDropdown
          label="City / Municipality"
          required={required}
          placeholder="Select city / municipality"
          searchPlaceholder="Search municipality or city..."
          value={cityMunicipality}
          options={municipalityOptions}
          loading={loadingMunicipalities}
          disabled={!province.trim()}
          disabledHint="Select province first"
          errorText={municipalitiesError}
          variant="colb"
          onSelect={(val, opt) => {
            const changed = normalizePhilatlasKey(val) !== normalizePhilatlasKey(cityMunicipality);
            if (changed) setLastSelectedBarangay('');
            onChange({
              province,
              cityMunicipality: val,
              streetLine: changed ? streetPrefix : streetLine,
              country: opt?.path || matchedProvince ? 'Philippines' : country,
            });
          }}
          onClear={() => {
            setLastSelectedBarangay('');
            onChange({
              province,
              cityMunicipality: '',
              streetLine: streetPrefix,
              country,
            });
          }}
        />

        <SearchableLocationDropdown
          label="Barangay"
          placeholder="Select barangay"
          searchPlaceholder="Search barangay..."
          value={currentBarangay}
          options={barangayOptions}
          loading={loadingBarangays}
          disabled={!cityMunicipality.trim()}
          disabledHint="Select municipality first"
          errorText={barangaysError}
          variant="colb"
          onSelect={(val, opt) => {
            setLastSelectedBarangay(val);
            const cleanPrefix = streetPrefix.trim();
            const composed = cleanPrefix ? `${cleanPrefix}, ${val}` : val;
            onChange({
              province,
              cityMunicipality,
              streetLine: composed,
              country: opt?.path || matchedProvince ? 'Philippines' : country,
            });
          }}
          onClear={() => {
            setLastSelectedBarangay('');
            onChange({
              province,
              cityMunicipality,
              streetLine: streetPrefix,
              country,
            });
          }}
        />

        {showCountry && (
          <div>
            <label className="block text-[12px] font-medium text-slate-800 mb-1">Country</label>
            <input
              type="text"
              placeholder="Philippines"
              value={country || (matchedProvince ? 'Philippines' : '')}
              onChange={(e) =>
                onChange({
                  province,
                  cityMunicipality,
                  streetLine,
                  country: e.target.value,
                })
              }
              className={`${colbInputClass} uppercase`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SINGLE-STRING ADDRESS SELECTOR (COM RESIDENCES / CONSENT / INFORMANT / P2)
// ============================================================================

interface SingleLinePhilippineAddressInputProps {
  variant: AddressFormVariant;
  value: string;
  showBarangay?: boolean;
  showStreet?: boolean;
  showCountry?: boolean;
  includeCountry?: boolean;
  streetLabel?: string;
  streetPlaceholder?: string;
  summaryLabel?: string;
  summaryPlaceholder?: string;
  summaryInputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  onChange: (nextComposedValue: string) => void;
}

export const SingleLinePhilippineAddressInput: React.FC<
  SingleLinePhilippineAddressInputProps
> = ({
  variant,
  value,
  showBarangay = true,
  showStreet = true,
  showCountry = false,
  includeCountry = true,
  streetLabel = 'House No. / Street / Purok (Optional)',
  streetPlaceholder = 'e.g. House No. 12, Rizal St.',
  summaryInputProps,
  onChange,
}) => {
  const isNA = (value || '').trim().toUpperCase() === 'N/A';
  const [partsState, setPartsState] = useState<PhilippineAddressValue>(() =>
    parseComposedPhilippineAddress(value, showBarangay)
  );
  const lastEmittedRef = useRef<string>(value || '');

  useEffect(() => {
    if ((value || '') !== lastEmittedRef.current) {
      lastEmittedRef.current = value || '';
      setPartsState(parseComposedPhilippineAddress(value, showBarangay));
    }
  }, [value, showBarangay]);

  return (
    <div className="space-y-2">
      {isNA ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700">
          <span className="font-semibold uppercase">N/A</span>
          <button
            type="button"
            onClick={() => {
              lastEmittedRef.current = '';
              setPartsState({ province: '', cityMunicipality: '', barangay: '', street: '', country: '' });
              onChange('');
            }}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 underline cursor-pointer"
          >
            Enter Address
          </button>
        </div>
      ) : (
        <PhilippineAddressSelector
          variant={variant}
          province={partsState.province}
          cityMunicipality={partsState.cityMunicipality}
          barangay={partsState.barangay}
          street={partsState.street}
          country={partsState.country}
          showBarangay={showBarangay}
          showStreet={showStreet}
          showCountry={showCountry}
          streetLabel={streetLabel}
          streetPlaceholder={streetPlaceholder}
          streetInputProps={summaryInputProps}
          onChange={(nextParts) => {
            setPartsState(nextParts);
            const composed = formatComposedPhilippineAddress(nextParts, includeCountry);
            lastEmittedRef.current = composed;
            onChange(composed);
          }}
        />
      )}
    </div>
  );
};

