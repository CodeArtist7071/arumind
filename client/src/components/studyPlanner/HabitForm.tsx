import { useForm } from "react-hook-form";
import { useEffect } from "react";

type FormValues = {
  habit: string;
};

type Props = {
  onSubmitHabit: (habit: string) => void;
  editValue?: string | null;
};

export default function HabitForm({ onSubmitHabit, editValue }: Props) {
  const { register, handleSubmit, reset, setValue } = useForm<FormValues>();

  useEffect(() => {
    if (editValue) {
      setValue("habit", editValue);
    }
  }, [editValue]);

  function submit(data: FormValues) {
    if (!data.habit.trim()) return;

    onSubmitHabit(data.habit);
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex gap-3 mb-6"
    >
      <input
        {...register("habit")}
        placeholder="Enter task"
        className="border px-3 py-2 rounded w-full"
      />

      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded"
      >
        {editValue ? "Update" : "Add"}
      </button>
    </form>
  );
}