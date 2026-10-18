import { StateCreator } from 'zustand';
import { AppState, AuthSlice } from '../types';
import { supabase } from '../../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

const AUTHORIZED_IDENTIFIERS = ['pond40744', 'owner', 'admin', 'mellowoven'];

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, _get) => ({
    user: null,
    session: null,
    userRole: null,

    signIn: async (identifier: string, _password?: string) => {
        const clean = identifier.trim().toLowerCase();
        if (!clean) {
            throw new Error('กรุณาระบุชื่อผู้ใช้หรืออีเมล');
        }

        const username = clean.includes('@') ? clean.split('@')[0] : clean;
        const isAuthorized =
            AUTHORIZED_IDENTIFIERS.includes(clean) ||
            AUTHORIZED_IDENTIFIERS.includes(username) ||
            clean.endsWith('@mellowoven.com');

        if (!isAuthorized) {
            throw new Error('ชื่อผู้ใช้หรืออีเมลนี้ไม่ได้รับอนุญาตให้เข้าถึงระบบ');
        }

        const email = clean.includes('@') ? clean : `${clean}@mellowoven.com`;

        const activeUser: User = {
            id: 'mellow-owner-001',
            app_metadata: { provider: 'passwordless', providers: ['passwordless'] },
            user_metadata: { name: clean, role: 'owner' },
            aud: 'authenticated',
            email: email,
            created_at: new Date().toISOString(),
            role: 'authenticated'
        };

        const activeSession: Session = {
            access_token: 'mellow-passwordless-token',
            refresh_token: 'mellow-passwordless-refresh',
            expires_in: 3600 * 24 * 30,
            expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
            token_type: 'bearer',
            user: activeUser
        };

        localStorage.setItem('mellow-auth-session', JSON.stringify(activeSession));

        set({
            user: activeUser,
            session: activeSession,
            userRole: 'owner'
        });
    },

    signOut: async () => {
        localStorage.removeItem('mellow-auth-session');
        await supabase.auth.signOut().catch(() => {});
        set({ user: null, session: null, userRole: null });
    },

    checkSession: async () => {
        const cachedSessionStr = localStorage.getItem('mellow-auth-session');
        if (cachedSessionStr) {
            try {
                const cachedSession = JSON.parse(cachedSessionStr) as Session;
                if (cachedSession && cachedSession.user) {
                    set({
                        user: cachedSession.user,
                        session: cachedSession,
                        userRole: 'owner'
                    });
                    return;
                }
            } catch (e) {
                console.error('[AuthSlice] Failed to parse cached session:', e);
                localStorage.removeItem('mellow-auth-session');
            }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            set({
                user: session.user,
                session: session,
                userRole: (profile?.role as 'owner' | 'staff') || 'staff'
            });
        }
    },
});
