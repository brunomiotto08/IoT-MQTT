// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (temporariamente hardcoded)
const supabaseUrl = 'https://nwifacoufwbjltsmpxdf.supabase.co';
const supabaseAnonKey = 'sb_publishable_myZ-OwQZD_pyFEaL1wB87Q_d--wO7vp';

// Cria e exporta o cliente Supabase.
// Este cliente será o nosso ponto de acesso único para todas as interações com o Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);