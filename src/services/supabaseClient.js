require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL; // Reutilizando a variável do .env do frontend
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Você precisará adicionar esta chave ao .env

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabase };
