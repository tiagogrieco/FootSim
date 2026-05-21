import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createNoOpClient() {
  const noOp = () => Promise.resolve({ data: null, error: null } as never);
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: (event: string, session: null) => void) => {
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    from: () => ({ select: () => ({ eq: () => ({ single: noOp, order: () => ({ limit: () => ({ data: [] }) }) }) }), insert: noOp, upsert: noOp, delete: () => ({ eq: () => noOp }) }),
    storage: { from: () => ({ upload: noOp, download: noOp }) },
  } as unknown as ReturnType<typeof createClient>;
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createNoOpClient();
