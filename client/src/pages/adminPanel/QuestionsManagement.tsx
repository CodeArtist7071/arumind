import React, { useState } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus } from "lucide-react";

/**
 * Question Repository Management Page.
 * Handles CRUD manifestations for the 'questions' table.
 */
const QuestionsManagement: React.FC = () => {
  const { data, loading, addItem, updateItem, deleteItem } = useTableData("questions");
  const { data: exams } = useTableData("exams");
  const { data: subjects } = useTableData("subjects");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns: any[] = [
    { 
      header: "Question Manifestation", 
      key: "question",
      render: (val: string) => (
        <span className="font-medium text-xs line-clamp-2 max-w-sm" title={val}>{val}</span>
      )
    },
    { 
      header: "Context", 
      key: "subject_id",
      render: (_: any, item: any) => (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase font-black text-[#16a34a] opacity-70">
            {subjects.find(s => s.id === item.subject_id)?.name || "Loading..."}
          </span>
          <span className="text-[9px] uppercase font-black text-blue-500 opacity-70">
            {exams.find(e => e.id === item.exam_id)?.name || "Loading..."}
          </span>
        </div>
      )
    },
    { 
      header: "Ans", 
      key: "correct_answer",
      render: (val: string) => (
        <span className="font-black text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded">
          {val}
        </span>
      )
    },
  ];

  const fields: any[] = [
    { name: "question", label: "Question Content (HTML Supported)", type: "textarea", required: true },
    { name: "options", label: "Options (Odia/English Mapping)", type: "textarea", required: true },
    { name: "correct_answer", label: "Primary Correct Key (A/B/C/D)", type: "text", required: true },
    { name: "explanation", label: "Editorial Explanation", type: "textarea" },
    { 
      name: "exam_id", 
      label: "Associated Examination", 
      type: "select", 
      options: exams.map(e => ({ label: e.name, value: e.id })),
      required: true 
    },
    { 
      name: "subject_id", 
      label: "Subject Classification", 
      type: "select", 
      options: subjects.map(s => ({ label: s.name, value: s.id })),
      required: true 
    },
  ];

  const handleApply = async (formData: any) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, formData);
      } else {
        await addItem(formData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      alert("Synchronization Error: " + err.message);
    }
  };

  return (
    <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Question Repository
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.3em] mt-2">
            Managing Verified Assessment Entities
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="group flex items-center gap-3 px-8 py-4 bg-[#16a34a] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-2xl hover:shadow-[#16a34a]/30 hover:-translate-y-1 transition-all duration-300"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          Manifest New Question
        </button>
      </header>

      <AdminTable
        columns={columns}
        data={data}
        onEdit={(item) => {
          setEditingItem(item);
          setIsModalOpen(true);
        }}
        onDelete={(id) => {
          if (window.confirm("Verify: Remove this question manifestation?"))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Alter Question" : "Manifest New Question"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default QuestionsManagement;
