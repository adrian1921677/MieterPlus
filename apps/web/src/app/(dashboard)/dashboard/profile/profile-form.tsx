'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateProfile } from '@/app/actions/profile';

type Props = {
  initial: {
    full_name: string;
    phone: string;
    contact_street: string;
    contact_house_number: string;
    contact_postal_code: string;
    contact_city: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="full_name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input id="full_name" name="full_name" defaultValue={initial.full_name} required maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          placeholder="z. B. 0151 23456789"
          maxLength={40}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
        <div className="text-sm font-semibold text-foreground">Kontakt-/Postanschrift</div>
        <p className="-mt-1 text-xs text-muted-foreground">
          Optional — z. B. für Schriftverkehr. Nur du und berechtigte Personen sehen diese Angaben.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,7rem]">
          <div className="space-y-2">
            <Label htmlFor="contact_street">Straße</Label>
            <Input
              id="contact_street"
              name="contact_street"
              defaultValue={initial.contact_street}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_house_number">Nr.</Label>
            <Input
              id="contact_house_number"
              name="contact_house_number"
              defaultValue={initial.contact_house_number}
              maxLength={20}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7rem,1fr]">
          <div className="space-y-2">
            <Label htmlFor="contact_postal_code">PLZ</Label>
            <Input
              id="contact_postal_code"
              name="contact_postal_code"
              inputMode="numeric"
              defaultValue={initial.contact_postal_code}
              placeholder="42103"
              maxLength={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_city">Ort</Label>
            <Input
              id="contact_city"
              name="contact_city"
              defaultValue={initial.contact_city}
              maxLength={80}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Wird gespeichert…' : 'Änderungen speichern'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Gespeichert
          </span>
        )}
      </div>
    </form>
  );
}
