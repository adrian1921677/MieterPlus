import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { HANDOVER_TYPE_LABELS_DE, HANDOVER_METER_LABELS_DE } from '@mieterplus/shared';

export type HandoverPdfData = {
  type: 'move_in' | 'move_out';
  createdAt: string;
  address: string;
  unitLabel: string;
  tenantName: string;
  landlordName: string;
  meterReadings: Record<string, { value?: string; meter_no?: string }>;
  keys: { label: string; count: number }[];
  generalNotes: string;
  rooms: { label: string; notes: string; photoUrls: string[] }[];
  tenantSignatureUrl: string | null;
  landlordSignatureUrl: string | null;
  tenantSignedAt: string | null;
  landlordSignedAt: string | null;
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#18181b' },
  header: { borderBottom: '2 solid #2563a8', paddingBottom: 10, marginBottom: 16 },
  brand: { fontSize: 9, color: '#71717a', letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#09090b', marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaLabel: { fontSize: 8, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#2563a8',
    marginBottom: 8,
    borderBottom: '1 solid #e4e4e7',
    paddingBottom: 3,
  },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #f4f4f5', paddingVertical: 4 },
  cellLabel: { width: '40%', color: '#52525b' },
  cellValue: { width: '60%', fontFamily: 'Helvetica-Bold' },
  room: { marginBottom: 12, padding: 8, border: '1 solid #e4e4e7', borderRadius: 4 },
  roomTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  roomNotes: { color: '#52525b', marginBottom: 6 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photo: { width: 110, height: 80, objectFit: 'cover', borderRadius: 3, marginRight: 6, marginBottom: 6 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  signBox: { width: '45%' },
  signImage: { height: 60, marginBottom: 4, objectFit: 'contain' },
  signLine: { borderTop: '1 solid #18181b', paddingTop: 4 },
  signName: { fontFamily: 'Helvetica-Bold' },
  signMeta: { fontSize: 8, color: '#71717a' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#a1a1aa',
    textAlign: 'center',
    borderTop: '1 solid #e4e4e7',
    paddingTop: 6,
  },
});

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HandoverDocument({ data }: { data: HandoverPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>ADB · Mieter + · Übergabeprotokoll</Text>
          <Text style={styles.title}>Übergabeprotokoll — {HANDOVER_TYPE_LABELS_DE[data.type]}</Text>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Objekt</Text>
              <Text style={styles.metaValue}>{data.address}</Text>
              <Text style={styles.metaValue}>{data.unitLabel}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Erstellt</Text>
              <Text style={styles.metaValue}>{fmtDate(data.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Mieter</Text>
              <Text style={styles.metaValue}>{data.tenantName}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Vermieter</Text>
              <Text style={styles.metaValue}>{data.landlordName}</Text>
            </View>
          </View>
        </View>

        {/* Zählerstände */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zählerstände</Text>
          {(['electricity', 'water', 'gas'] as const).map((k) => {
            const r = data.meterReadings?.[k];
            return (
              <View style={styles.tableRow} key={k}>
                <Text style={styles.cellLabel}>{HANDOVER_METER_LABELS_DE[k]}</Text>
                <Text style={styles.cellValue}>
                  {r?.value ? r.value : '—'}
                  {r?.meter_no ? `  (Zähler-Nr. ${r.meter_no})` : ''}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Schlüssel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schlüssel</Text>
          {data.keys.length === 0 ? (
            <Text style={styles.cellLabel}>Keine Schlüssel erfasst.</Text>
          ) : (
            data.keys.map((key, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={styles.cellLabel}>{key.label}</Text>
                <Text style={styles.cellValue}>{key.count} Stück</Text>
              </View>
            ))
          )}
        </View>

        {/* Räume */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Räume &amp; Zustand</Text>
          {data.rooms.length === 0 ? (
            <Text style={styles.cellLabel}>Keine Räume dokumentiert.</Text>
          ) : (
            data.rooms.map((room, i) => (
              <View style={styles.room} key={i} wrap={false}>
                <Text style={styles.roomTitle}>{room.label}</Text>
                {room.notes ? <Text style={styles.roomNotes}>{room.notes}</Text> : null}
                {room.photoUrls.length > 0 && (
                  <View style={styles.photoRow}>
                    {room.photoUrls.map((url, j) => (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image key={j} src={url} style={styles.photo} />
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Allgemeine Notizen */}
        {data.generalNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allgemeine Anmerkungen</Text>
            <Text>{data.generalNotes}</Text>
          </View>
        ) : null}

        {/* Unterschriften */}
        <View style={styles.signRow}>
          <View style={styles.signBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {data.tenantSignatureUrl ? <Image src={data.tenantSignatureUrl} style={styles.signImage} /> : null}
            <View style={styles.signLine}>
              <Text style={styles.signName}>{data.tenantName}</Text>
              <Text style={styles.signMeta}>Mieter · {fmtDate(data.tenantSignedAt)}</Text>
            </View>
          </View>
          <View style={styles.signBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {data.landlordSignatureUrl ? <Image src={data.landlordSignatureUrl} style={styles.signImage} /> : null}
            <View style={styles.signLine}>
              <Text style={styles.signName}>{data.landlordName}</Text>
              <Text style={styles.signMeta}>Vermieter · {fmtDate(data.landlordSignedAt)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Erstellt mit Mieter + — eine App von ADB Dienstleistungen · Dieses Protokoll wurde
          digital von beiden Parteien signiert.
        </Text>
      </Page>
    </Document>
  );
}
