import React, { memo, useMemo, useState } from "react";
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Search,
  Edit3,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Column {
  header: string;
  key: string;
  render?: (val: any, row: any) => React.ReactNode;
  hide?: boolean;
  width?: number;
  minWidth?: number;
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
}

const adminTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

const ActionCell = memo(({ data, onEdit, onDelete }: any) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => onEdit(data)}
      aria-label="Edit record"
      className="rounded-lg p-2 text-slate-500 transition hover:bg-[#16a34a]/10 hover:text-[#16a34a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"
      title="Edit"
    >
      <Edit3 size={15} />
    </button>
    <button
      type="button"
      onClick={() => onDelete(data.id)}
      aria-label="Delete record"
      className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"
      title="Delete"
    >
      <Trash2 size={15} />
    </button>
  </div>
));

/** Shared, accessible admin data table, powered by TanStack Table. */
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
}) => {
  const [quickFilterText, setQuickFilterText] = useState("");
  const recordCount = totalCount ?? data?.length ?? 0;
  const normalizedQuery = quickFilterText.trim().toLocaleLowerCase();

  const filteredData = useMemo(() => {
    const rows = data ?? [];
    if (!normalizedQuery) return rows;
    return rows.filter((row) =>
      columns.some((column) => String(row?.[column.key] ?? "").toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [columns, data, normalizedQuery]);

  const tableColumns = useMemo<ColumnDef<any, any>[]>(() => {
    const visibleColumns: ColumnDef<any, any>[] = columns.filter((column) => !column.hide).map((column) => ({
      id: column.key,
      accessorKey: column.key,
      header: column.header,
      enableSorting: true,
      sortFn: column.comparator
        ? (rowA: any, rowB: any, columnId: string) => column.comparator!(rowA.getValue(columnId), rowB.getValue(columnId))
        : "alphanumeric" as const,
      meta: { width: column.width, minWidth: column.minWidth },
      cell: (context: any) => {
        const value = context.getValue();
        if (column.render) {
          try {
            return column.render(value, context.row.original);
          } catch {
            return <span className="text-xs font-semibold text-red-500">Unable to render</span>;
          }
        }
        const technical = column.key === "id" || column.key.includes("_id") || column.key === "display_order";
        return (
          <span className={technical ? "font-mono text-xs text-slate-500" : "text-sm font-medium text-slate-800 dark:text-slate-100"}>
            {value ?? "—"}
          </span>
        );
      },
    }));

    visibleColumns.push({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => <ActionCell data={row.original} onEdit={onEdit} onDelete={onDelete} />,
    });
    return visibleColumns;
  }, [columns, onEdit, onDelete]);

  const table = useTable({
    features: adminTableFeatures,
    columns: tableColumns,
    data: filteredData,
    getRowId: (row: any, index: number) => String(row?.id ?? index),
  });

  const totalPages = Math.ceil(recordCount / pageSize);

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-300 sm:p-32" role="status" aria-live="polite">
        <Loader2 className="mb-4 animate-spin text-[#16a34a]" size={32} />
        <span className="text-xs font-bold uppercase tracking-widest">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] p-4 dark:border-white/10 dark:bg-[#171e17] sm:p-5">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="group relative w-full sm:max-w-sm">
          <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#879181] transition-colors group-focus-within:text-[#315f29]" />
          <input
            type="search"
            aria-label="Search records in table"
            placeholder={searchPlaceholder}
            value={quickFilterText}
            onChange={(event) => setQuickFilterText(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#e2e8dc] bg-white pl-10 pr-4 text-sm text-[#263b22] outline-none transition placeholder:text-[#9aa493] focus:border-[#7ba36e] focus:ring-4 focus:ring-[#7ba36e]/10 dark:border-white/10 dark:bg-[#111711] dark:text-[#e8eee4]"
          />
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <button type="button" onClick={onRefresh} aria-label="Refresh table" disabled={!onRefresh} className="grid size-10 place-items-center rounded-xl text-[#73806e] transition hover:bg-[#edf3e9] hover:text-[#315f29] disabled:cursor-default disabled:opacity-40 dark:hover:bg-white/[0.06]" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <div className="rounded-lg bg-[#f0f4ec] px-3 py-2 text-xs text-[#687565] dark:bg-white/[0.06] dark:text-[#aeb9aa]" aria-live="polite">
            <span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{normalizedQuery ? filteredData.length : recordCount}</span>{" "}
            {recordCount === 1 ? "record" : "records"}
          </div>
        </div>
      </div>

      <div className="hidden w-full overflow-x-auto rounded-xl border border-[#e6eae2] dark:border-white/10 md:block">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-[#f4f7f1] dark:bg-white/[0.04]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sort = header.column.getIsSorted();
                  const metadata = header.column.columnDef.meta as { width?: number; minWidth?: number } | undefined;
                  return (
                    <th key={header.id} scope="col" style={{ width: metadata?.width, minWidth: metadata?.minWidth ?? 120 }} className="border-b border-[#e6eae2] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:border-white/10 dark:text-slate-200">
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()} aria-label={`Sort by ${header.column.columnDef.header}`} className="inline-flex items-center gap-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]">
                          <table.FlexRender header={header} />
                          {sort === "asc" ? <ArrowUp size={13} aria-label="ascending" /> : sort === "desc" ? <ArrowDown size={13} aria-label="descending" /> : <ArrowUpDown size={13} className="opacity-40" aria-hidden="true" />}
                        </button>
                      ) : <table.FlexRender header={header} />}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#edf0e9] bg-white dark:bg-[#111711]">
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-[#f8faf6] dark:hover:bg-white/[0.03]">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle text-sm text-slate-700 dark:text-slate-200">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={table.getAllLeafColumns().length} className="px-4 py-12 text-center text-sm text-slate-500">No matching records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden" aria-label="Admin records">
        {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => {
          const cells = row.getAllCells();
          const actionCell = cells.find((cell) => cell.column.id === "actions");
          return (
            <article key={row.id} className="overflow-hidden rounded-xl border border-[#e6eae2] bg-white dark:border-white/10 dark:bg-[#111711]">
              <dl className="divide-y divide-[#edf0e9] px-3 dark:divide-white/5">
                {cells.filter((cell) => cell.column.id !== "actions").map((cell) => {
                  const title = cell.column.columnDef.header;
                  const label = typeof title === "string" ? title : cell.column.id;
                  return (
                    <div key={cell.id} className="grid grid-cols-[minmax(5.5rem,0.7fr)_minmax(0,1.3fr)] gap-3 py-3">
                      <dt className="text-xs font-semibold text-[#778171] dark:text-[#a6b09f]">{label}</dt>
                      <dd className="min-w-0 break-words text-sm text-slate-700 dark:text-slate-200"><table.FlexRender cell={cell} /></dd>
                    </div>
                  );
                })}
              </dl>
              {actionCell && <div className="flex justify-end border-t border-[#edf0e9] px-2 py-1.5 dark:border-white/5"><table.FlexRender cell={actionCell} /></div>}
            </article>
          );
        }) : (
          <div className="rounded-xl border border-[#e6eae2] bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#111711]">No matching records found</div>
        )}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col gap-3 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[#778171] dark:text-[#a6b09f]">
            Showing <span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{Math.min(page * pageSize + 1, recordCount)}</span>–<span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{Math.min((page + 1) * pageSize, recordCount)}</span> of <span className="font-semibold tabular-nums text-[#263b22] dark:text-white">{recordCount}</span>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[#e5e9e0] bg-white p-1 dark:border-white/10 dark:bg-[#111711]">
            <button type="button" onClick={() => onPageChange(page - 1)} aria-label="Previous page" disabled={page === 0} className="rounded-lg p-2 text-slate-500 transition hover:bg-[#edf3e9] hover:text-[#16a34a] disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"><ChevronLeft size={16} /></button>
            <div className="flex items-center gap-2 px-3"><span className="text-[10px] font-black text-[#16a34a]">PAGE</span><span className="min-w-7 rounded border border-slate-100 bg-white px-2 py-0.5 text-center text-[10px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{page + 1}</span><span className="text-[10px] font-bold text-slate-400">OF {totalPages}</span></div>
            <button type="button" onClick={() => onPageChange(page + 1)} aria-label="Next page" disabled={page >= totalPages - 1} className="rounded-lg p-2 text-slate-500 transition hover:bg-[#edf3e9] hover:text-[#16a34a] disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e]"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
});

AdminTable.displayName = "AdminTable";
