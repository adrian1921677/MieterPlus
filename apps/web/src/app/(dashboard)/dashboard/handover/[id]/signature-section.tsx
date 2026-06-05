'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SignaturePad from 'signature_pad';
import { CheckCircle2, Eraser, FileDown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/loading';

type Props = {
  protocolId: string;
  status: string;
  isLandlord: boolean;
  isTenant: boolean;
  tenantSignedAt: string | null;
  landlordSignedAt: string | null;
  tenantName: string;
  landlordName: string;
  pdfUrl: string | null;
};

export function HandoverSignatures(props: Props) {
  const router = useRouter();
  const { protocolId, status } = props;
  const completed = status === 'completed';
  const myRole: 'tenant' | 'landlord' | null = props.isTenant
    ? 'tenant'
    : props.isLandlord
      ? 'landlord'
      : null;
  const mySigned =
    myRole === 'tenant' ? Boolean(props.tenantSignedAt) : Boolean(props.landlordSignedAt);

  const bothSigned = Boolean(props.tenantSignedAt && props.landlordSignedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Unterschriften</CardTitle>
        <CardDescription>
          {completed
            ? 'Dieses Protokoll ist vollständig signiert und abgeschlossen.'
            : 'Mieter und Vermieter unterschreiben digital. Danach wird das PDF erstellt.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SignatureSlot
            label="Mieter"
            name={props.tenantName}
            signedAt={props.tenantSignedAt}
            canSign={!completed && myRole === 'tenant' && !mySigned}
            protocolId={protocolId}
            onSigned={() => router.refresh()}
          />
          <SignatureSlot
            label="Vermieter"
            name={props.landlordName}
            signedAt={props.landlordSignedAt}
            canSign={!completed && myRole === 'landlord' && !mySigned}
            protocolId={protocolId}
            onSigned={() => router.refresh()}
          />
        </div>

        {/* Abschluss / PDF */}
        {completed ? (
          props.pdfUrl ? (
            <Button asChild className="w-full">
              <a href={props.pdfUrl} target="_blank" rel="noopener noreferrer">
                <FileDown className="h-4 w-4" />
                PDF herunterladen
              </a>
            </Button>
          ) : null
        ) : props.isLandlord ? (
          <CompleteButton protocolId={protocolId} disabled={!bothSigned} onDone={() => router.refresh()} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {bothSigned
              ? 'Beide haben unterschrieben — der Vermieter schließt das Protokoll ab.'
              : 'Sobald beide unterschrieben haben, wird das PDF vom Vermieter erstellt.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SignatureSlot({
  label,
  name,
  signedAt,
  canSign,
  protocolId,
  onSigned,
}: {
  label: string;
  name: string;
  signedAt: string | null;
  canSign: boolean;
  protocolId: string;
  onSigned: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canSign || !canvasRef.current) return;
    const canvas = canvasRef.current;
    // Canvas an Devicepixelratio anpassen für scharfe Linien
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    padRef.current = new SignaturePad(canvas, { penColor: '#09090b', backgroundColor: '#ffffff' });
    return () => padRef.current?.off();
  }, [canSign]);

  const clear = () => padRef.current?.clear();

  const submit = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError('Bitte zuerst unterschreiben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const dataUrl = padRef.current.toDataURL('image/png');
      const res = await fetch(`/api/handover/${protocolId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: dataUrl }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Unterschrift fehlgeschlagen.');
        return;
      }
      onSigned();
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {signedAt ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Signiert
          </span>
        ) : null}
      </div>

      {signedAt ? (
        <div className="rounded bg-emerald-50 p-3 text-center text-xs text-emerald-800">
          {name} hat am {new Date(signedAt).toLocaleString('de-DE')} unterschrieben.
        </div>
      ) : canSign ? (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            className="h-32 w-full touch-none rounded border border-dashed border-zinc-300 bg-white"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={clear} disabled={saving}>
              <Eraser className="h-3 w-3" /> Löschen
            </Button>
            <Button type="button" size="sm" className="flex-1" onClick={submit} disabled={saving}>
              {saving ? <Spinner className="h-3 w-3" /> : null}
              {saving ? 'Speichert …' : `Als ${name} unterschreiben`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded bg-zinc-50 p-3 text-center text-xs text-muted-foreground">
          Wartet auf Unterschrift von {name}.
        </div>
      )}
    </div>
  );
}

function CompleteButton({
  protocolId,
  disabled,
  onDone,
}: {
  protocolId: string;
  disabled: boolean;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/handover/${protocolId}/pdf`, { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? 'PDF konnte nicht erstellt werden.');
        return;
      }
      onDone();
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={complete} disabled={disabled || loading} className="w-full">
        {loading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'PDF wird erstellt …' : 'Protokoll abschließen & PDF erstellen'}
      </Button>
      {disabled && (
        <p className="text-center text-xs text-muted-foreground">
          Beide Parteien müssen zuerst unterschreiben.
        </p>
      )}
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
