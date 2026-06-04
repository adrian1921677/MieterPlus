'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { searchAddress, type GeocodingFeature, MAPBOX_ENABLED } from '@/lib/mapbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type AddressSelection = {
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country_code: string;
  longitude: number;
  latitude: number;
  place_name: string;
};

type Props = {
  /** Vorausgefüllter Such-Text (z. B. wenn man eine bestehende Adresse editiert). */
  initialValue?: string;
  /** Callback wenn der User eine Adresse aus der Liste wählt. */
  onSelect: (sel: AddressSelection) => void;
  /** Label über dem Input. Default „Adresse suchen". */
  label?: string;
  /** Placeholder im Input. */
  placeholder?: string;
};

/**
 * Single-Field Adress-Suche mit Mapbox Geocoding Autocomplete.
 * User tippt „Musterstr. 12 Wuppertal" → Vorschläge → bei Auswahl
 * werden Straße/Hausnummer/PLZ/Stadt/Lat/Lng zurückgegeben.
 */
export function AddressAutocomplete({
  initialValue = '',
  onSelect,
  label = 'Adresse suchen',
  placeholder = 'z. B. Musterstraße 12, Wuppertal',
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<GeocodingFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced Geocoding-Suche
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await searchAddress(query, { signal: controller.signal });
        setSuggestions(res);
        setOpen(true);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Schließe Dropdown bei Klick außerhalb
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handlePick = (feature: GeocodingFeature) => {
    const a = feature.address ?? {};
    const sel: AddressSelection = {
      street: a.street ?? '',
      house_number: a.house_number ?? '',
      postal_code: a.postal_code ?? '',
      city: a.city ?? '',
      country_code: a.country_code ?? 'DE',
      longitude: feature.center[0],
      latitude: feature.center[1],
      place_name: feature.place_name,
    };
    setQuery(feature.place_name);
    setOpen(false);
    onSelect(sel);
  };

  if (!MAPBOX_ENABLED) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      <Label htmlFor="address-search">{label}</Label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="address-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.place_name}-${i}`}>
              <button
                type="button"
                onClick={() => handlePick(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563a8]" />
                <span>{s.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Tippe mindestens 3 Zeichen, dann erscheinen Vorschläge. Bei Auswahl werden die Felder
        unten automatisch ausgefüllt.
      </p>
    </div>
  );
}
