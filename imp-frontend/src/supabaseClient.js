// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Lê as variáveis de ambiente que o Vite nos fornece
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria e exporta o cliente Supabase.
// Este cliente será o nosso ponto de acesso único para todas as interações com o Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);