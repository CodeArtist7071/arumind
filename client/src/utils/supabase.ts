import { createClient } from "@supabase/supabase-js";

const VITE_SUPABASE_URL = "https://vqrkyepybgcieeypqimh.supabase.co";
const supabase_annon_key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcmt5ZXB5YmdjaWVleXBxaW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MDIsImV4cCI6MjA4NzkzMDQwMn0.-rdvKiZR-UEi2snIYBcKrrLgI5ZO5c41o51sgNWUYXw";

const supabaseUrl = VITE_SUPABASE_URL;
const supabaseKey = supabase_annon_key;

const supabase = createClient(supabaseUrl, supabaseKey);
const adminSupabase = createClient(supabaseUrl, supabase_annon_key);
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}
console.log(supabase);
export { supabase, adminSupabase };
