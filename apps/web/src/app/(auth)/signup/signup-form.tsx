'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput } from '@mieterplus/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function SignupForm({ initialRole }: { initialRole: 'tenant' | 'landlord' }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { role: initialRole },
  });

  const role = watch('role');

  const onSubmit = async (values: SignUpInput) => {
    setServerError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: values.full_name, role: values.role },
        },
      });
      if (error) {
        setServerError(error.message);
        return;
      }
      if (data.user && !data.session) {
        setConfirmationSent(true);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      // Vorher: throw verschwand im React-Hook-Form-Handler → "nichts passiert".
      // Jetzt: Fehler wird sichtbar angezeigt.
      const msg =
        err instanceof Error ? err.message : 'Unbekannter Fehler bei der Registrierung.';
      setServerError(`${msg} — Falls dieser Fehler bleibt, ist das Backend (Supabase) nicht erreichbar.`);
      console.error('[signup]', err);
    }
  };

  if (confirmationSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
          Bitte bestätige deine E-Mail-Adresse. Wir haben dir einen Link zugeschickt.
        </div>
        <Button asChild variant="outline">
          <a href="/login">Zur Anmeldung</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Ich bin…</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue('role', 'tenant')}
            className={`rounded-md border p-3 text-sm font-medium transition ${
              role === 'tenant'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-input hover:bg-accent'
            }`}
          >
            Mieter
          </button>
          <button
            type="button"
            onClick={() => setValue('role', 'landlord')}
            className={`rounded-md border p-3 text-sm font-medium transition ${
              role === 'landlord'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-input hover:bg-accent'
            }`}
          >
            Vermieter
          </button>
        </div>
        <input type="hidden" {...register('role')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">Vollständiger Name</Label>
        <Input id="full_name" autoComplete="name" {...register('full_name')} />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
        />
        <p className="text-xs text-muted-foreground">
          Min. 10 Zeichen, mit Groß-/Kleinbuchstaben und Ziffer.
        </p>
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Wird erstellt…' : 'Konto erstellen'}
      </Button>
    </form>
  );
}
