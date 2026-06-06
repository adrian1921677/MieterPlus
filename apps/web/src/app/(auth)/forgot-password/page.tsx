import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = { title: 'Passwort vergessen' };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Passwort vergessen?</CardTitle>
        <CardDescription>
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          Doch wieder eingefallen?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Zur Anmeldung
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
