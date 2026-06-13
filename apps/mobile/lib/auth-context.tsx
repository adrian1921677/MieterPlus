import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Profile = {
  id: string;
  role: 'tenant' | 'landlord' | 'admin';
  full_name: string;
  subscription_plan?: 'trial' | 'plus' | 'pro' | 'payg' | null;
  subscription_valid_until?: string | null;
};

type Tenancy = {
  id: string;
  unit_id: string;
};

type Home = {
  unit_label: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  landlord_name: string | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  tenancy: Tenancy | null;
  home: Home | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, role, full_name, subscription_plan, subscription_valid_until')
      .eq('id', userId)
      .single();
    setProfile(p as Profile | null);

    if (p?.role === 'tenant') {
      const { data: t } = await supabase
        .from('tenancies')
        .select(
          'id, unit_id, units(unit_label, properties(street, house_number, postal_code, city, profiles:owner_id(full_name)))',
        )
        .eq('tenant_id', userId)
        .is('ended_at', null)
        .maybeSingle();
      if (t) {
        setTenancy({ id: t.id, unit_id: t.unit_id });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u: any = (t as any).units;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prop: any = u?.properties;
        if (u && prop) {
          setHome({
            unit_label: u.unit_label,
            street: prop.street,
            house_number: prop.house_number,
            postal_code: prop.postal_code,
            city: prop.city,
            landlord_name: prop.profiles?.full_name ?? null,
          });
        } else {
          setHome(null);
        }
      } else {
        setTenancy(null);
        setHome(null);
      }
    } else {
      setTenancy(null);
      setHome(null);
    }
  };

  const refresh = async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  };

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user?.id) await loadProfile(data.session.user.id);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setTenancy(null);
        setHome(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setTenancy(null);
    setHome(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, tenancy, home, loading, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
