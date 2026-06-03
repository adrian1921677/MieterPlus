import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './login-form';

export const metadata = { title: 'Anmelden' };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
        <CardDescription>Melde dich mit deiner E-Mail und deinem Passwort an.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-64 animate-pulse rounded bg-muted" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Noch kein Konto?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
