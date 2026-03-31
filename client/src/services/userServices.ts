import { supabase } from "../utils/supabase";

export const getUserProfile = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("No Session");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  if (error) throw error;
  //  console.log("session check",data);
  return { user: session.user, profile: data };
};

export const updateUserProfile = async (updates: any, id: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  return data;
};
