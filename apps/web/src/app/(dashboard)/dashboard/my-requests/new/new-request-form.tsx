'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createRequestInputSchema,
  REQUEST_CATEGORY_LABELS_DE,
  REQUEST_CATEGORIES,
  REQUEST_PRIORITY_LABELS_DE,
  REQUEST_PRIORITIES,
  type CreateRequestInput,
} from '@mieterplus/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type TenancyOption = { id: string; label: string };

export function NewRequestForm({ tenancyOptions }: { tenancyOptions: TenancyOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tenancyId, setTenancyId] = useState<string>(tenancyOptions[0]?.id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateRequestInput>({
    resolver: zodResolver(createRequestInputSchema),
    defaultValues: { priority: 'normal' },
  });

  const onSubmit = async (values: CreateRequestInput) => {
    setServerError(null);
    if (!tenancyId) {
      setServerError('Bitte eine Wohnung auswählen.');
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('requests')
        .insert({
          tenancy_id: tenancyId,
          title: values.title,
          description: values.description,
          category: values.category,
          priority: values.priority,
          status: 'open',
        })
        .select('id')
        .single();

      if (error) {
        setServerError(error.message);
        return;
      }
      router.push(`/dashboard/requests/${data.id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler.';
      setServerError(msg);
      console.error('[new-request]', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {tenancyOptions.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="tenancy">Wohnung</Label>
          <select
            id="tenancy"
            value={tenancyId}
            onChange={(e) => setTenancyId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {tenancyOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Titel</Label>
        <Input
          id="title"
          placeholder="z.B. Heizung im Wohnzimmer wird nicht warm"
          {...register('title')}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategorie</Label>
        <select
          id="category"
          {...register('category')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Bitte wählen …</option>
          {REQUEST_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {REQUEST_CATEGORY_LABELS_DE[cat]}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-sm text-destructive">Bitte eine Kategorie wählen.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Dringlichkeit</Label>
        <select
          id="priority"
          {...register('priority')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {REQUEST_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {REQUEST_PRIORITY_LABELS_DE[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          rows={5}
          placeholder="Beschreibe das Problem so genau wie möglich. Wann tritt es auf? Was hast du bereits versucht?"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Wird gesendet …' : 'Mangel melden'}
      </Button>
    </form>
  );
}
