import React, { useMemo, useState, memo } from "react";
import { AgGridReact } from "ag-grid-react";
import { 
  Search, 
  Edit3, 
  Trash2, 
  Loader2, 
  Database,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface Column {
  header: string;
  key: string;
  render?: (val: any, row: any) => React.ReactNode;
  rowGroup?: boolean;
  hide?: boolean;
  pinned?: "left" | "right" | boolean;
  width?: number;
  minWidth?: number;
  flex?: number;
}

interface AdminTableProps {
  columns: Column[];
  data: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onRefresh?: () => void;
  enableCellSpan?: boolean;
  isFullWidthRow?: (params: any) => boolean;
  fullWidthCellRenderer?: any;
  getRowHeight?: (params: any) => number | undefined;
  autoGroupColumnDef?: any;
  groupDisplayType?: "singleColumn" | "multipleColumns" | "groupRows" | "custom";
  groupDefaultExpanded?: number;
}

/**
 * Clean Professional Header.
 * Subtle, high-contrast, and intuitive sorting manifestation.
 */
const CleanHeader = memo((props: any) => {
  const [sort, setSort] = useState(props.column.getSort());

  React.useEffect(() => {
    const updateSort = () => setSort(props.column.getSort());
    props.column.addEventListener('sortChanged', updateSort);
    return () => props.column.removeEventListener('sortChanged', updateSort);
  }, [props.column]);

  const onSortRequested = (event: React.MouseEvent) => {
    props.progressSort(event.shiftKey);
  };

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer group select-none py-1 h-full"
      onClick={onSortRequested}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
        {props.displayName}
      </span>
      <div className="text-slate-400 group-hover:text-[#16a34a] transition-all">
        {sort === 'asc' ? <ArrowUp size={12} /> : sort === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40" />}
      </div>
    </div>
  );
});

/**
 * Modern SaaS Action Cell.
 * Minimalist, high-performance orchestration controls.
 */
const ActionCell = memo(({ data, onEdit, onDelete }: any) => (
  <div className="flex items-center gap-4 h-full">
    <button
      onClick={(e) => {
        e.stopPropagation();
        onEdit(data);
      }}
      className="p-1.5 text-slate-400 hover:text-[#16a34a] hover:bg-[#16a34a]/5 rounded-lg transition-all"
      title="Edit Resource"
    >
      <Edit3 size={15} />
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete(data.id);
      }}
      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
      title="Vaporize Resource"
    >
      <Trash2 size={15} />
    </button>
  </div>
));

/**
 * Professional Admin Lattice Table.
 * Optimized for React 19 with the legacy ag-theme-alpine manifestation.
 */
export const AdminTable: React.FC<AdminTableProps> = memo(({
  columns,
  data,
  onEdit,
  onDelete,
  loading = false,
  totalCount = 0,
  page = 0,
  pageSize = 10,
  onPageChange,
  onRefresh,
  enableCellSpan,
  isFullWidthRow,
  fullWidthCellRenderer,
  getRowHeight,
  autoGroupColumnDef,
  groupDisplayType,
  groupDefaultExpanded
}) => {
  const [quickFilterText, setQuickFilterText] = useState("");

  const columnDefs = useMemo(() => {
    const defs: any[] = columns.map((col) => {
      const isTechnical = col.key === "id" || col.key.includes("_id") || col.key === "display_order";
      
      return {
        headerName: col.header,
        field: col.key,
        sortable: true,
        filter: true,
        headerComponent: CleanHeader,
        flex: col.flex ?? 1,
        minWidth: col.minWidth ?? 160,
        width: col.width,
        pinned: col.pinned,
        rowGroup: col.rowGroup,
        hide: col.hide,
        cellRenderer: (params: any) => {
          if (col.render) {
            try {
              return col.render(params.value, params.data);
            } catch (e) {
              return <span className="text-[10px] uppercase font-bold text-red-400">Render Error</span>;
            }
          }
          return (
            <span className={`text-[13px] font-medium ${isTechnical ? "font-mono opacity-40 text-[10px] tabular-nums" : "text-slate-800 dark:text-slate-100"}`}>
              {params.value ?? "—"}
            </span>
          );
        },
      };
    });

    defs.push({
      headerName: "Actions",
      field: "id",
      pinned: "right",
      width: 140,
      minWidth: 140,
      sortable: false,
      filter: false,
      headerComponent: CleanHeader,
      cellRenderer: (params: any) => (
        <ActionCell 
          data={params.data} 
          onEdit={onEdit} 
          onDelete={onDelete} 
        />
      ),
    });

    return defs;
  }, [columns, onEdit, onDelete]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center p-32 text-slate-300">
        <Loader2 className="animate-spin text-[#16a34a] mb-4" size={32} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Sychronizing Sector...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* SaaS Professional Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1">
        <div className="relative w-full max-md:max-w-md group">
          <Search 
            size={14} 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#16a34a] transition-all" 
          />
          <input
            type="text"
            placeholder="Quick search repository..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#16a34a]/20 focus:border-[#16a34a]/30 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={onRefresh}
            className="group p-2 text-slate-500 hover:text-[#16a34a] hover:bg-[#16a34a]/5 rounded-lg transition-all"
            title="Reload Ecosystem"
          >
            <RefreshCw size={16} className="group-active:rotate-180 transition-transform duration-500" />
          </button>
          
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entities:</span>
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 tabular-nums">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* High-Fidelity Grid Container */}
      <div className="ag-theme-alpine w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm" style={{ height: 550 }}>
        <AgGridReact
          rowData={data || []}
          columnDefs={columnDefs}
          theme="legacy"
          enableCellSpan={enableCellSpan}
          isFullWidthRow={isFullWidthRow}
          fullWidthCellRenderer={fullWidthCellRenderer}
          getRowHeight={getRowHeight}
          autoGroupColumnDef={autoGroupColumnDef}
          groupDisplayType={groupDisplayType}
          groupDefaultExpanded={groupDefaultExpanded}
          quickFilterText={quickFilterText}
          getRowId={(params: any) => params.data?.id}
          animateRows={true}
          suppressCellFocus={true}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            resizable: true,
          }}
          onGridReady={(params: any) => {
            params.api.sizeColumnsToFit();
          }}
          overlayNoRowsTemplate='<span class="text-[11px] font-bold uppercase tracking-widest opacity-20 italic">No Repository Manifested</span>'
        />
      </div>

      {/* SaaS Pagination Orchestration */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-2 gap-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
             Showing <span className="text-[#16a34a] font-black">{Math.min(page * pageSize + 1, totalCount)}</span> - <span className="text-[#16a34a] font-black">{Math.min((page + 1) * pageSize, totalCount)}</span> of <span className="text-slate-900 dark:text-slate-100 font-extrabold">{totalCount}</span>
          </div>
          
          <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <button
               onClick={() => onPageChange(page - 1)}
               disabled={page === 0}
               className="p-2 text-slate-500 hover:text-[#16a34a] hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center gap-2 px-3">
               <span className="text-[10px] font-black text-[#16a34a]">PAGE</span>
               <span className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded text-[10px] font-black min-w-[28px] text-center shadow-xs">
                  {page + 1}
               </span>
               <span className="text-[10px] font-bold text-slate-400">OF {totalPages}</span>
            </div>

            <button
               onClick={() => onPageChange(page + 1)}
               disabled={page >= totalPages - 1}
               className="p-2 text-slate-500 hover:text-[#16a34a] hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

AdminTable.displayName = "AdminTable";
