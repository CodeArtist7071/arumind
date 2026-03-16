import { supabase } from "../utils/supabase"

export async function createTask(task: {
  title: string
  task_type: string
  xp_reward: number
  estimated_minutes?: number
  subject_id?: string
  chapter_id?: string
  question_set_id?: string
}) {

  const { data, error } = await supabase
    .from("tasks")
    .insert([task])
    .select()
    .single()

  if (error) throw error

  return data
}

export async function addTaskToDay(programDayId: string, taskId: string) {

  const { data, error } = await supabase
    .from("day_tasks")
    .insert([
      {
        program_day_id: programDayId,
        task_id: taskId
      }
    ])

  if (error) throw error

  return data
}


export async function createDayTask(programDayId: string, taskData: any) {

  const { data: task } = await supabase
    .from("tasks")
    .insert([taskData])
    .select()
    .single()

  await supabase
    .from("day_tasks")
    .insert([
      {
        program_day_id: programDayId,
        task_id: task.id
      }
    ])

  return task
}


export async function enrollUser(programId: string, userId: string) {

  const { data, error } = await supabase
    .from("user_programs")
    .insert([
      {
        user_id: userId,
        program_id: programId
      }
    ])
    .select()
    .single()

  if (error) throw error

  return data
}

export const attachTaskToDay = async (
  programDayId: string,
  taskId: string
) => {

  const { data, error } = await supabase
    .from("day_tasks")
    .insert([
      {
        program_day_id: programDayId,
        task_id: taskId
      }
    ])

  if (error) throw error

  return data
}