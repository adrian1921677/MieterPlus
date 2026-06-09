# Supabase Auth — E-Mail-Vorlagen (Deutsch)

Einzufügen in **Supabase → Authentication → Emails → Templates**.
Jeweils **Subject heading** + **Message body (HTML)** in die passende Vorlage kopieren.
Die `{{ .Variable }}`-Platzhalter **unverändert** lassen — Supabase ersetzt sie automatisch.

Gemeinsamer Stil: ADB/Mieter +-Branding, Akzentfarbe `#2563a8`.

---

## 1) Confirm signup — Registrierung bestätigen

**Betreff:**
```
Bestätige deine E-Mail-Adresse für Mieter +
```

**HTML:**
```html
<div style="background:#fafafa;padding:32px 0;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eee;border-radius:12px;overflow:hidden;">
    <div style="border-bottom:3px solid #2563a8;padding:24px 28px 16px;">
      <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;">ADB · Mieter +</span>
      <h1 style="font-size:20px;margin:8px 0 0;color:#09090b;">Willkommen bei Mieter +!</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 16px;">
        Schön, dass du dabei bist. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren und loszulegen.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563a8;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">E-Mail-Adresse bestätigen</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#71717a;margin:16px 0 0;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
      <p style="font-size:12px;line-height:1.5;color:#2563a8;word-break:break-all;margin:6px 0 0;">{{ .ConfirmationURL }}</p>
      <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:24px 0 0;">Du hast dich nicht bei Mieter + registriert? Dann ignoriere diese E-Mail einfach – es passiert nichts weiter.</p>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 28px;background:#fafafa;">
      <p style="font-size:11px;color:#a1a1aa;margin:0;">Mieter + · Eine App von ADB Dienstleistungen · Wuppertal<br>Diese E-Mail wurde automatisch versendet.</p>
    </div>
  </div>
</div>
```

---

## 2) Reset Password — Passwort zurücksetzen

**Betreff:**
```
Passwort zurücksetzen für Mieter +
```

**HTML:**
```html
<div style="background:#fafafa;padding:32px 0;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eee;border-radius:12px;overflow:hidden;">
    <div style="border-bottom:3px solid #2563a8;padding:24px 28px 16px;">
      <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;">ADB · Mieter +</span>
      <h1 style="font-size:20px;margin:8px 0 0;color:#09090b;">Passwort zurücksetzen</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 16px;">
        Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf den Button, um ein neues Passwort zu vergeben. Aus Sicherheitsgründen ist der Link nur begrenzt gültig.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563a8;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">Neues Passwort vergeben</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#71717a;margin:16px 0 0;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
      <p style="font-size:12px;line-height:1.5;color:#2563a8;word-break:break-all;margin:6px 0 0;">{{ .ConfirmationURL }}</p>
      <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:24px 0 0;">Du hast das nicht angefordert? Dann ignoriere diese E-Mail – dein Passwort bleibt unverändert.</p>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 28px;background:#fafafa;">
      <p style="font-size:11px;color:#a1a1aa;margin:0;">Mieter + · Eine App von ADB Dienstleistungen · Wuppertal<br>Diese E-Mail wurde automatisch versendet.</p>
    </div>
  </div>
</div>
```

---

## 3) Magic Link — Login per Link

**Betreff:**
```
Dein Login-Link für Mieter +
```

**HTML:**
```html
<div style="background:#fafafa;padding:32px 0;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eee;border-radius:12px;overflow:hidden;">
    <div style="border-bottom:3px solid #2563a8;padding:24px 28px 16px;">
      <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;">ADB · Mieter +</span>
      <h1 style="font-size:20px;margin:8px 0 0;color:#09090b;">Mit einem Klick anmelden</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 16px;">
        Klicke auf den Button, um dich bei Mieter + anzumelden. Der Link ist nur kurze Zeit gültig und kann nur einmal verwendet werden.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563a8;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">Jetzt anmelden</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#71717a;margin:16px 0 0;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
      <p style="font-size:12px;line-height:1.5;color:#2563a8;word-break:break-all;margin:6px 0 0;">{{ .ConfirmationURL }}</p>
      <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:24px 0 0;">Du hast keinen Login angefordert? Dann ignoriere diese E-Mail einfach.</p>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 28px;background:#fafafa;">
      <p style="font-size:11px;color:#a1a1aa;margin:0;">Mieter + · Eine App von ADB Dienstleistungen · Wuppertal<br>Diese E-Mail wurde automatisch versendet.</p>
    </div>
  </div>
</div>
```

---

## 4) Invite user — Einladung

**Betreff:**
```
Du wurdest zu Mieter + eingeladen
```

**HTML:**
```html
<div style="background:#fafafa;padding:32px 0;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eee;border-radius:12px;overflow:hidden;">
    <div style="border-bottom:3px solid #2563a8;padding:24px 28px 16px;">
      <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;">ADB · Mieter +</span>
      <h1 style="font-size:20px;margin:8px 0 0;color:#09090b;">Du bist eingeladen!</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 16px;">
        Du wurdest eingeladen, Mieter + zu nutzen – die einfache Plattform für die Kommunikation zwischen Mieter und Vermieter. Klicke auf den Button, um dein Konto einzurichten.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563a8;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">Einladung annehmen</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#71717a;margin:16px 0 0;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
      <p style="font-size:12px;line-height:1.5;color:#2563a8;word-break:break-all;margin:6px 0 0;">{{ .ConfirmationURL }}</p>
      <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:24px 0 0;">Du kennst den Absender nicht oder hast keine Einladung erwartet? Dann kannst du diese E-Mail ignorieren.</p>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 28px;background:#fafafa;">
      <p style="font-size:11px;color:#a1a1aa;margin:0;">Mieter + · Eine App von ADB Dienstleistungen · Wuppertal<br>Diese E-Mail wurde automatisch versendet.</p>
    </div>
  </div>
</div>
```

---

## 5) Change Email Address — E-Mail-Adresse ändern

**Betreff:**
```
Bestätige deine neue E-Mail-Adresse
```

**HTML:**
```html
<div style="background:#fafafa;padding:32px 0;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eee;border-radius:12px;overflow:hidden;">
    <div style="border-bottom:3px solid #2563a8;padding:24px 28px 16px;">
      <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;">ADB · Mieter +</span>
      <h1 style="font-size:20px;margin:8px 0 0;color:#09090b;">Neue E-Mail-Adresse bestätigen</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 16px;">
        Du möchtest die E-Mail-Adresse deines Mieter +-Kontos ändern – von <strong>{{ .Email }}</strong> zu <strong>{{ .NewEmail }}</strong>. Bitte bestätige die neue Adresse über den Button.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2563a8;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;">Neue Adresse bestätigen</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#71717a;margin:16px 0 0;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
      <p style="font-size:12px;line-height:1.5;color:#2563a8;word-break:break-all;margin:6px 0 0;">{{ .ConfirmationURL }}</p>
      <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:24px 0 0;">Du hast keine Änderung angefordert? Dann wende dich bitte umgehend an den Support – dein Konto könnte gefährdet sein.</p>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 28px;background:#fafafa;">
      <p style="font-size:11px;color:#a1a1aa;margin:0;">Mieter + · Eine App von ADB Dienstleistungen · Wuppertal<br>Diese E-Mail wurde automatisch versendet.</p>
    </div>
  </div>
</div>
```

---

## 6) Reauthentication — Bestätigungscode (OTP)

> Diese Vorlage nutzt **keinen Link**, sondern einen Code `{{ .Token }}`.

**Betreff:**
```
Dein Bestätigungscode für Mieter +
```

**HTML:**
```html
<div style="background:#fafafa;padding:32px 0;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eee;border-radius:12px;overflow:hidden;">
    <div style="border-bottom:3px solid #2563a8;padding:24px 28px 16px;">
      <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;">ADB · Mieter +</span>
      <h1 style="font-size:20px;margin:8px 0 0;color:#09090b;">Dein Bestätigungscode</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 8px;">Gib den folgenden Code ein, um die Aktion zu bestätigen:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;background:#eff6ff;color:#1d4f8c;font-size:32px;font-weight:800;letter-spacing:8px;padding:14px 24px;border-radius:10px;">{{ .Token }}</span>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#a1a1aa;margin:16px 0 0;">Der Code ist nur wenige Minuten gültig. Du hast das nicht angefordert? Dann ignoriere diese E-Mail.</p>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 28px;background:#fafafa;">
      <p style="font-size:11px;color:#a1a1aa;margin:0;">Mieter + · Eine App von ADB Dienstleistungen · Wuppertal<br>Diese E-Mail wurde automatisch versendet.</p>
    </div>
  </div>
</div>
```
