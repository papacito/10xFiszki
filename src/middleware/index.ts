import { createClient } from '@supabase/supabase-js';
import { defineMiddleware } from 'astro:middleware';

import type { Database } from '../db/database.types.ts';

export const onRequest = defineMiddleware((context, next) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
  const authHeader = context.request.headers.get('Authorization') ?? '';

  context.locals.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  return next();
});
