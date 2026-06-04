import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignupForm } from './signup-form';
import { GoogleSignupSection } from './google-signup-section';

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
          Wähle deine Rolle und melde dich mit Google an — oder registriere dich klassisch
          per E-Mail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <GoogleSignupSection />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-card px-3 text-muted-foreground">oder per E-Mail</span>
          </div>
        </div>

        <SignupFormWrapper searchParams={searchParams} />

        <p className="text-center text-sm text-muted-foreground">
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
