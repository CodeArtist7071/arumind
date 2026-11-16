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
  const { 
    data, 
    loading, 
    totalCount, 
    page, 
    setPage, 
    refresh, 
    addItem, 
    updateItem, 
    deleteItem 
  } = useTableData("profiles", { pageSize: 20 }); // established a larger default viewport manifestation
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  console.log("deloooo", data)
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
      header: "Full Name", 
      key: "full_name",
      render: (val: string, item: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-slate-100">{val || "Anonymous Student"}</span>
          <span className="text-[10px] opacity-60 font-mono italic">{item.phone || "No Phone Number"}</span>
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
        header: "Subscription Plan", 
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
      header: "Role", 
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
            <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a]">Account Active</span>
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
    { name: "state", label: "State", type: "text" },
    { name: "district", label: "District", type: "text" },
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
      label: "Subscription Plan", 
      type: "select", 
      options: [
        { label: "Free Plan", value: "free" },
        { label: "Pro Plan", value: "pro" }
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
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">
            User Management
          </h2>
          <p className="mt-1.5 text-sm text-[#778171] dark:text-[#a6b09f]">
            Review learner accounts and manage platform access.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="group flex min-h-11 items-center gap-2 rounded-xl bg-[#24551e] px-4 text-sm font-semibold text-white transition hover:bg-[#173f19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e]"
        >
          <UserPlus size={18} />
          Add user
        </button>
      </header>

      <AdminTable
        columns={columns}
        data={data}
        totalCount={totalCount}
        page={page}
        onPageChange={setPage}
        onRefresh={refresh}
        onEdit={(item) => {
          setEditingItem(item);
          setIsModalOpen(true);
        }}
        onDelete={(id) => {
          if (window.confirm("Verify: Delete this user profile?"))
            deleteItem(id);
        }}
        loading={loading}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        title={editingItem ? "Edit Profile" : "Create New User"}
        fields={fields}
        initialData={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleApply}
      />
    </div>
  );
};

export default UserManagement;
