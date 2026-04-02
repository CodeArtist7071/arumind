import React, { useState } from "react";
import { useTableData } from "../../hooks/useTableData";
import { AdminTable } from "../../components/admin/AdminTable";
import { AdminFormModal } from "../../components/admin/AdminFormModal";
import { Plus, UserPlus } from "lucide-react";

/**
 * User Management Manifestation.
 * Synchronized with the 'profiles' table to manage student registrations.
 */
const UserManagement: React.FC = () => {
  const { data, loading, addItem, updateItem, deleteItem } = useTableData("profiles");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    { 
        header: "Portal ID", 
        key: "id",
        render: (val: string) => (
            <span className="text-[10px] font-mono font-black text-primary opacity-40 hover:opacity-100 transition-opacity cursor-copy" title="Click to manifest UUID">
                {val}
            </span>
        ),
        width: 140
    },
    { 
      header: "Aspirant Identity", 
      key: "full_name",
      render: (val: string, item: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-slate-100">{val || "Anonymous Student"}</span>
          <span className="text-[10px] opacity-60 font-mono italic">{item.phone || "No Comm Link"}</span>
        </div>
      )
    },
    { 
      header: "Location Node", 
      key: "district",
      render: (_: string, item: any) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
           {item.district && item.state ? `${item.district}, ${item.state}` : "Unspecified"}
        </span>
      )
    },
    { 
        header: "Manifest Plan", 
        key: "subscription_plan",
        render: (val: string) => (
          <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded border ${
              val === 'pro' ? 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20' : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}>
            {(val || 'FREE').toUpperCase()}
          </span>
        )
    },
    { 
      header: "Manifest Role", 
      key: "role",
      render: (val: string) => (
        <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded ${
            val === 'admin' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
        }`}>
          {(val || 'STUDENT').toUpperCase()}
        </span>
      )
    },
    { 
        header: "Status", 
        key: "role_status", // Changed from 'role' to avoid collision manifestation
        render: () => (
            <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a]">Active Portal</span>
        )
    },
    { 
        header: "Reg Date", 
        key: "created_at",
        render: (val: string) => <span className="text-[10px] opacity-60 font-mono italic">{new Date(val).toLocaleDateString()}</span>
    },
  ];

  const fields: any[] = [
    { name: "full_name", label: "Full Name", type: "text", required: true },
    { name: "phone", label: "Comm Link (Phone)", type: "text" },
    { name: "state", label: "State Manifestation", type: "text" },
    { name: "district", label: "District Node", type: "text" },
    { 
      name: "role", 
      label: "Platform Role", 
      type: "select", 
      options: [
        { label: "Student", value: "student" },
        { label: "Admin", value: "admin" }
      ]
    },
    { 
      name: "subscription_plan", 
      label: "Manifest Plan", 
      type: "select", 
      options: [
        { label: "Free Manifestation", value: "free" },
        { label: "Pro Manifestation", value: "pro" }
      ]
    }
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
            User Manifestations
          </h2>
          <p className="text-[10px] text-[#16a34a] uppercase font-black tracking-[0.3em] mt-2">
            Managing Student Registrations and Permissions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="group flex items-center gap-3 px-8 py-4 bg-[#16a34a] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-2xl hover:shadow-[#16a34a]/30 hover:-translate-y-1 transition-all duration-300"
        >
          <UserPlus size={18} className="group-hover:scale-110 transition-transform duration-300" />
          Add New User
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
          if (window.confirm("Verify: Terminate this user profile?"))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Alter Profile" : "Manifest New User"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default UserManagement;
