import { supabase } from "../utils/supabase";

export const getExams = async () => {
  const { data, error } = await supabase.from("exams").select("*");
  if (error) throw error;
  // console.log("is examsss coming....", data);
  return data;
};

export const getExamsById = async (exam_id:string[]) => {
  const { data, error } = await supabase.from("exams").select("*").eq("id",exam_id);
  if (error) throw error;
  console.log("is examss list coming....",data)
  return data;
};

export const getExamSubjects = async (exam_id: string) => {
  const { data, error } = await supabase
    .from("exam_subjects")
    .select(
      ` exam_id,
      subject_id,
      subjects (*)
      
    `,
    )
    .eq("exam_id", exam_id);

  if (error) throw error;

  return data;
};

// Function to fetch chapters for a given exam_id
export const getChaptersByExamID = async (examId: string) => {
  const { data, error } = await supabase
    .from("chapters")
    .select(
      `
      id,
      name,
      subjects (
        id,
        name,
        exam_subjects (
          exam_id
        )
      )
    `,
    )
    .eq("subjects.exam_subjects.exam_id", examId)
    .order("name", { foreignTable: "subjects" }) // optional: order by subject
    .order("display_order"); // optional: order by chapter display_order

  if (error) {
    console.error("Error fetching chapters:", error);
    return [];
  }

  return data;
};

export const getChapters = async (subject_id: string) => {
  const { data, error } = await supabase
    .from("chapters")
    .select(`subject_id,chapters(*)`)
    .eq("subject_id", subject_id);
  if (error) throw error;
  console.log("checking...", data);
  return data;
};


export const getExamBoards = async()=>{
  const {data,error}  = await supabase.from("exam_boards").select("*").single()
  if(error) throw error;
  return data;
}