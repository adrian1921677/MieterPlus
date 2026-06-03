import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Profile = {
  id: string;
  role: 'tenant' | 'landlord' | 'admin';
  full_name: string;
};

type Tenancy = {
  id: string;
  unit_id: string;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  tenancy: Tenancy | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', userId)
      .single();
    setProfile(p as Profile | null);

    if (p?.role === 'tenant') {
      const { data: t } = await supabase
        .from('tenancies')
        .select('id, unit_id')
        .eq('tenant_id', userId)
        .is('ended_at', null)
        .maybeSingle();
      setTenancy(t as Tenancy | null);
    } else {
      setTenancy(null);
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
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setTenancy(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, tenancy, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
