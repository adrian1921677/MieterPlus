import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Konto erstellen' };

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Konto erstellen</CardTitle>
        <CardDescription>
          Wähle deine Rolle und lege los. Du bestätigst deine E-Mail-Adresse nach der Registrierung.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupFormWrapper searchParams={searchParams} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Schon ein Konto?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Anmelden
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

async function SignupFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const sp = await searchParams;
  const initialRole = sp.role === 'landlord' ? 'landlord' : 'tenant';
  return <SignupForm initialRole={initialRole} />;
}
