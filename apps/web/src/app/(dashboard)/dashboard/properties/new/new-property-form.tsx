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

export function NewPropertyForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertyInputSchema),
    defaultValues: { country: 'DE' },
  });

  const onSubmit = async (values: CreatePropertyInput) => {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setServerError('Bitte erneut anmelden.');
      return;
    }
    const { data, error } = await supabase
      .from('properties')
      .insert({ ...values, owner_id: userData.user.id })
      .select('id')
      .single();
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push(`/dashboard/properties/${data.id}?just_created=1`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
