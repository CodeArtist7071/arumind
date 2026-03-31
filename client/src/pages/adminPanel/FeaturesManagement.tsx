import React, { useState } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus, Activity } from "lucide-react";

/**
 * Platform Features Management Page.
 * Handles CRUD manifestations for the 'features' table (for controlling UI flags, etc.).
 */
const FeaturesManagement: React.FC = () => {
  const { data, loading, addItem, updateItem, deleteItem, error } = useTableData("features");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    { header: "Feature Name", key: "name" },
    { 
      header: "Status", 
      key: "is_enabled",
      render: (val: boolean) => (
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${val ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
            <span className="text-[10px] font-black uppercase tracking-widest">{val ? 'Active' : 'Inactive'}</span>
        </div>
      )
    },
    { 
      header: "Description", 
      key: "description",
      render: (val: string) => <span className="text-xs opacity-60 truncate block max-w-xs">{val}</span>
    },
  ];

  const fields: any[] = [
    { name: "name", label: "Feature Name (Technical Key)", type: "text", required: true },
    { name: "description", label: "Purpose / Description", type: "textarea" },
    { name: "is_enabled", label: "Global Enable Status", type: "checkbox" },
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

  // Handle case where table doesn't exist yet
  if (error && error.includes("does not exist")) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
        <Activity size={48} className="text-slate-200" />
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic">Table Manifestation Missing</h2>
          <p className="text-sm text-slate-500 mt-2">
            The <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">features</code> table was not found in Supabase. 
            Please run the required SQL migration to enable platform feature management.
          </p>
        </div>
        <pre className="bg-slate-900 text-emerald-400 p-6 rounded-xl text-left text-xs font-mono overflow-auto max-w-lg">
          {`CREATE TABLE public.features (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);`}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Platform Features
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.3em] mt-2">
            Controlling Global Functional Manifestations
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
          Manifest New Feature
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
          if (window.confirm("Verify: Remove this feature manifestation?"))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Alter Feature" : "Manifest New Feature"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default FeaturesManagement;
