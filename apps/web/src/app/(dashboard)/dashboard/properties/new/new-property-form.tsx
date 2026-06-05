'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPropertyInputSchema,
  type CreatePropertyInput,
} from '@mieterplus/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AddressAutocomplete, type AddressSelection } from '@/components/address-autocomplete';
import { MAPBOX_ENABLED, staticMapUrl } from '@/lib/mapbox';

export function NewPropertyForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertyInputSchema),
    defaultValues: { country: 'DE' },
  });

  const onAddressPicked = (sel: AddressSelection) => {
    if (sel.street) setValue('street', sel.street, { shouldValidate: true });
    if (sel.house_number) setValue('house_number', sel.house_number, { shouldValidate: true });
    if (sel.postal_code) setValue('postal_code', sel.postal_code, { shouldValidate: true });
    if (sel.city) setValue('city', sel.city, { shouldValidate: true });
    if (sel.country_code) setValue('country', sel.country_code, { shouldValidate: true });
    setCoords({ lng: sel.longitude, lat: sel.latitude });
  };

  const onSubmit = async (values: CreatePropertyInput) => {
    setServerError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setServerError('Bitte erneut anmelden.');
        return;
      }

      // Duplikat-Check: gleiche Adresse darf es nur einmal geben
      const normalize = (s: string) => s.trim().toLowerCase();
      const { data: existing } = await supabase
        .from('properties')
        .select('id, owner_id')
        .eq('postal_code', values.postal_code.trim())
        .ilike('street', values.street.trim())
        .ilike('house_number', values.house_number.trim())
        .ilike('city', values.city.trim())
        .limit(1)
        .maybeSingle();

      if (existing) {
        const isMine = existing.owner_id === userData.user.id;
        setServerError(
          isMine
            ? `Diese Adresse hast du bereits angelegt. Bestehende Immobilie ansehen?`
            : 'Diese Adresse ist bereits im System hinterlegt. Wende dich an den Support, falls das ein Fehler ist.',
        );
        if (isMine) {
          // Direkt zur bestehenden Property weiterleiten
          setTimeout(() => {
            router.push(`/dashboard/properties/${existing.id}`);
          }, 1500);
        }
        return;
      }

      const { data, error } = await supabase
        .from('properties')
        .insert({ ...values, owner_id: userData.user.id })
        .select('id')
        .single();
      if (error) {
        // Datenbank-Level Unique-Constraint als Fallback
        if (/duplicate|unique/i.test(error.message)) {
          setServerError('Diese Adresse existiert bereits im System.');
        } else {
          setServerError(error.message);
        }
        return;
      }
      router.push(`/dashboard/properties/${data.id}?just_created=1`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler.';
      setServerError(msg);
      console.error('[new-property]', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {MAPBOX_ENABLED && (
        <AddressAutocomplete
          onSelect={onAddressPicked}
          label="Adresse suchen"
          placeholder="z. B. Friedrich-Ebert-Str. 12, Wuppertal"
        />
      )}

      {coords && (
        <div className="overflow-hidden rounded-md border border-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={staticMapUrl({ longitude: coords.lng, latitude: coords.lat, width: 700, height: 240, zoom: 16 })}
            alt="Karten-Vorschau der gewählten Adresse"
            className="block h-auto w-full"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="street">Straße</Label>
          <Input id="street" {...register('street')} placeholder="Musterstraße" />
          {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="house_number">Hausnummer</Label>
          <Input id="house_number" {...register('house_number')} placeholder="12a" />
          {errors.house_number && (
            <p className="text-sm text-destructive">{errors.house_number.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">PLZ</Label>
          <Input id="postal_code" inputMode="numeric" maxLength={5} {...register('postal_code')} />
          {errors.postal_code && (
            <p className="text-sm text-destructive">{errors.postal_code.message}</p>
          )}
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="city">Stadt</Label>
          <Input id="city" {...register('city')} placeholder="Berlin" />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Land</Label>
        <Input id="country" maxLength={2} {...register('country')} />
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Wird gespeichert…' : 'Weiter zu Dokumenten-Upload'}
      </Button>
    </form>
  );
}
