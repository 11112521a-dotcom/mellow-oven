import { StateCreator } from 'zustand';
import { AppState, AuthSlice } from '../types';
import { supabase } from '../../lib/supabase';

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
    user: null,
    session: null,
    userRole: null,

    signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (data.session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            set({
                user: data.user,
                session: data.session,
                userRole: (profile?.role as 'owner' | 'staff') || 'staff'
            });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, userRole: null });
    },

    checkSession: async () => {
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
