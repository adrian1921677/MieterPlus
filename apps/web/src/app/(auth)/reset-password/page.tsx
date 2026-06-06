import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResetPasswordForm } from './reset-password-form';

export const metadata = { title: 'Neues Passwort' };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Neues Passwort festlegen</CardTitle>
        <CardDescription>
          Wähle ein neues, sicheres Passwort für dein Konto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
