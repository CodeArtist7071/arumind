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
  ArrowDown,
  Menu
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
  autoHeight?: boolean;
  wrapText?: boolean;
  comparator?: (valueA: any, valueB: any) => number;
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
  searchPlaceholder?: string;
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

  const onMenuClicked = (event: React.MouseEvent) => {
    event.stopPropagation();
    props.showColumnMenu(event.currentTarget);
  };

  return (
    <div className="flex items-center justify-between w-full h-full group">
      <button
        type="button"
        aria-label={`Sort by ${props.displayName}`}
        className="flex items-center gap-2 cursor-pointer select-none py-1 h-full flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"
        onClick={onSortRequested}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          {props.displayName}
        </span>
        <div className="text-slate-400 group-hover:text-[#16a34a] transition-all">
          {sort === 'asc' ? <ArrowUp size={12} /> : sort === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-40" />}
        </div>
      </button>
      <button 
        onClick={onMenuClicked}
        aria-label={`Column options for ${props.displayName}`}
        className="p-1 text-slate-400 hover:text-[#16a34a] hover:bg-[#16a34a]/10 rounded transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"
        title="Column Options"
      >
        <Menu size={14} />
      </button>
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
      aria-label="Edit record"
      className="p-2 text-slate-500 hover:text-[#16a34a] hover:bg-[#16a34a]/10 rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"
      title="Edit"
    >
      <Edit3 size={15} />
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete(data.id);
      }}
      aria-label="Delete record"
      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
      title="Delete"
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
  totalCount,
  page = 0,
  pageSize = 10,
  onPageChange,
  onRefresh,
  searchPlaceholder = "Search records...",
  enableCellSpan,
  isFullWidthRow,
  fullWidthCellRenderer,
  getRowHeight,
  autoGroupColumnDef,
  groupDisplayType,
  groupDefaultExpanded
}) => {
  const [quickFilterText, setQuickFilterText] = useState("");
  const recordCount = totalCount ?? data?.length ?? 0;

  const columnDefs = useMemo(() => {
    const defs: any[] = columns.map((col) => {
      const isTechnical = col.key === "id" || col.key.includes("_id") || col.key === "display_order";
      
      return {
        headerName: col.header,
        field: col.key,
        sortable: true,
        comparator: col.comparator,
        filter: true,
        headerComponent: CleanHeader,
        flex: col.width ? col.flex : (col.flex ?? 1),
        minWidth: col.minWidth ?? 160,
        width: col.width,
        pinned: col.pinned,
        rowGroup: col.rowGroup,
        hide: col.hide,
        autoHeight: col.autoHeight,
        wrapText: col.wrapText,
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
      width: 90,
      minWidth: 100,
      hide:false,
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

  const totalPages = Math.ceil(recordCount / pageSize);

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center p-32 text-slate-300">
        <Loader2 className="animate-spin text-[#16a34a] mb-4" size={32} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
      </div>
    );
  }

  return (
      <div className="w-full overflow-hidden rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] p-4 dark:border-white/10 dark:bg-[#171e17] sm:p-5">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="group relative w-full sm:max-w-sm">
          <Search 
            size={16} 
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#879181] transition-colors group-focus-within:text-[#315f29]" 
          />
          <input
            type="text"
            aria-label="Search records in table"
            placeholder={searchPlaceholder}
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#e2e8dc] bg-white pl-10 pr-4 text-sm text-[#263b22] outline-none transition placeholder:text-[#9aa493] focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 dark:border-white/10 dark:bg-[#111711] dark:text-[#e8eee4]"
          />
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <button 
            onClick={onRefresh}
            aria-label="Refresh table"
            disabled={!onRefresh}
            className="grid size-10 place-items-center rounded-xl text-[#73806e] transition hover:bg-[#edf3e9] hover:text-[#315f29] disabled:cursor-default disabled:opacity-40 dark:hover:bg-white/[0.06]"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <div className="rounded-lg bg-[#f0f4ec] px-3 py-2 text-xs text-[#687565] dark:bg-white/[0.06] dark:text-[#aeb9aa]">
            <span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{recordCount}</span> {recordCount === 1 ? "record" : "records"}
          </div>
        </div>
      </div>

      {/* High-Fidelity Grid Container */}
      <div className="ag-theme-alpine w-full overflow-hidden rounded-xl border border-[#e6eae2] dark:border-white/10" style={{ height: 520 }}>
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
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            resizable: true,
          }}
          onGridReady={(params: any) => {
            params.api.sizeColumnsToFit();
          }}
          overlayNoRowsTemplate='<span class="text-sm text-slate-500">No matching records found</span>'
        />
      </div>

      {/* SaaS Pagination Orchestration */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col gap-3 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[#778171] dark:text-[#a6b09f]">
             Showing <span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{Math.min(page * pageSize + 1, recordCount)}</span>–<span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{Math.min((page + 1) * pageSize, recordCount)}</span> of <span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{recordCount}</span>
          </div>
          
          <div className="flex items-center gap-1 rounded-xl border border-[#e5e9e0] bg-white p-1 dark:border-white/10 dark:bg-[#111711]">
            <button
               onClick={() => onPageChange(page - 1)}
               aria-label="Previous page"
               disabled={page === 0}
               className="p-2 text-slate-500 hover:text-[#16a34a] hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"
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
               aria-label="Next page"
               disabled={page >= totalPages - 1}
               className="p-2 text-slate-500 hover:text-[#16a34a] hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"
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
