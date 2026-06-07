import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './login-form';
import { GoogleAuthButton } from '@/components/google-auth-button';

export const metadata = { title: 'Anmelden' };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
        <CardDescription>Melde dich mit Google oder per E-Mail an.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <GoogleAuthButton label="Mit Google anmelden" />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-card px-3 text-muted-foreground">oder</span>
          </div>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded bg-muted" />}>
          <LoginForm />
        </Suspense>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-primary hover:underline">
            Passwort vergessen?
          </Link>
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Konto erstellen
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
