
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://vqrkyepybgcieeypqimh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxcmt5ZXB5YmdjaWVleXBxaW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTQ0MDIsImV4cCI6MjA4NzkzMDQwMn0.-rdvKiZR-UEi2snIYBcKrrLgI5ZO5c41o51sgNWUYXw";

const supabase = createClient(supabaseUrl, supabaseKey);

async function update() {
  console.log("Updating record be187c61-2d8c-4a9b-a671-b9fab5825b72 to COMPLETED...");
  const { data, error } = await supabase
    .from('test_attempts')
    .update({ status: 'COMPLETED', submitted_at: new Date().toISOString() })
    .eq('id', 'be187c61-2d8c-4a9b-a671-b9fab5825b72')
    .select();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

update();
