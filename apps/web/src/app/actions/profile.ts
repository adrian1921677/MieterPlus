'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ProfileActionResult = { error?: string; success?: boolean };

/** Leeren String → null, sonst getrimmter Wert. */
function nullable(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}

export async function updateProfile(formData: FormData): Promise<ProfileActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Nicht angemeldet.' };

  const fullName = nullable(formData, 'full_name');
  if (!fullName || fullName.length < 2) {
    return { error: 'Bitte gib deinen vollständigen Namen an.' };
  }
  if (fullName.length > 120) {
    return { error: 'Der Name darf höchstens 120 Zeichen lang sein.' };
  }

  const phone = nullable(formData, 'phone');
  if (phone && phone.length > 40) {
    return { error: 'Die Telefonnummer ist zu lang (max. 40 Zeichen).' };
  }

  const postalCode = nullable(formData, 'contact_postal_code');
  if (postalCode && !/^\d{5}$/.test(postalCode)) {
    return { error: 'Die Postleitzahl muss aus genau 5 Ziffern bestehen.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      contact_street: nullable(formData, 'contact_street'),
      contact_house_number: nullable(formData, 'contact_house_number'),
      contact_postal_code: postalCode,
      contact_city: nullable(formData, 'contact_city'),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/profile');
  revalidatePath('/dashboard');
  return { success: true };
}
