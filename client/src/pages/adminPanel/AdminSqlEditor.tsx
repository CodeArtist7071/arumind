import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, ClipboardPaste, Code2, Copy, Loader2, Play, RotateCcw } from "lucide-react";
import { supabase } from "../../utils/supabase";

type SqlResult = {
  rows?: unknown[];
  rowsAffected?: number;
};

const AdminSqlEditor = () => {
  const [query, setQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SqlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clipboardStatus, setClipboardStatus] = useState<string | null>(null);

  const resultRows = Array.isArray(result?.rows)
    ? result.rows as Array<Record<string, unknown>>
    : [];
  const resultColumns = Array.from(new Set(resultRows.flatMap((row) => Object.keys(row ?? {}))));

  const formatCell = (value: unknown) => {
    if (value === null || value === undefined) return "NULL";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setClipboardStatus(`${label} copied`);
      window.setTimeout(() => setClipboardStatus(null), 2000);
    } catch {
      setClipboardStatus("Clipboard access was blocked by the browser");
    }
  };

  const pasteFromClipboard = async () => {
    try {
      setQuery(await navigator.clipboard.readText());
      setClipboardStatus("Pasted from clipboard");
      window.setTimeout(() => setClipboardStatus(null), 2000);
    } catch {
      setClipboardStatus("Clipboard access was blocked by the browser");
    }
  };

  const copyResults = () => {
    if (!resultRows.length) return;
    const escapeCell = (value: unknown) => {
      const text = formatCell(value);
      return /[\t\r\n"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    };
    const lines = [
      resultColumns.map(escapeCell).join("\t"),
      ...resultRows.map((row) => resultColumns.map((column) => escapeCell(row[column])).join("\t")),
    ];
    void copyToClipboard(lines.join("\n"), "Results");
  };

  const runQuery = async () => {
    const statement = query.trim();
    if (!statement || isRunning) return;

    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_execute_sql", {
        query: statement,
      });
      if (rpcError) throw rpcError;
      setResult(data as SqlResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The SQL command could not be executed.";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66805d] dark:text-[#a9c99e]">Admin · Database tools</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1b2419] dark:text-[#e8eee4] sm:text-3xl">SQL editor</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#778171] dark:text-[#a6b09f]">Run one SQL statement at a time against the Supabase database. SELECT results are shown below; data changes follow the signed-in admin’s database permissions and row-level security policies.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#e5e9e0] bg-[#fbfcf8] dark:border-white/10 dark:bg-[#171e17]" aria-labelledby="sql-editor-title">
        <div className="flex flex-col gap-3 border-b border-[#e8ece4] px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#e8f0e3] text-[#315f29] dark:bg-[#263d24] dark:text-[#c9e4c0]"><Code2 size={18} /></span>
            <div><h2 id="sql-editor-title" className="text-sm font-semibold text-[#263b22] dark:text-[#e8eee4]">Query</h2><p className="mt-0.5 text-xs text-[#778171] dark:text-[#a6b09f]">Results from SELECT are limited to the first 100 rows.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setQuery(""); setResult(null); setError(null); }} disabled={isRunning || !query} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dfe6d9] px-3.5 text-sm font-medium text-[#52604d] transition hover:bg-[#edf3e9] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e] dark:border-white/10 dark:text-[#c3cdbd] dark:hover:bg-white/[0.06]"><RotateCcw size={15} />Clear</button>
            <button type="button" onClick={() => void copyToClipboard(query, "SQL")} disabled={!query} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dfe6d9] px-3.5 text-sm font-medium text-[#52604d] transition hover:bg-[#edf3e9] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e] dark:border-white/10 dark:text-[#c3cdbd] dark:hover:bg-white/[0.06]"><Clipboard size={15} />Copy SQL</button>
            <button type="button" onClick={() => void pasteFromClipboard()} disabled={isRunning} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dfe6d9] px-3.5 text-sm font-medium text-[#52604d] transition hover:bg-[#edf3e9] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e] dark:border-white/10 dark:text-[#c3cdbd] dark:hover:bg-white/[0.06]"><ClipboardPaste size={15} />Paste</button>
            <button type="button" onClick={runQuery} disabled={isRunning || !query.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#24551e] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173f17] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c8b3e]">
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} fill="currentColor" />}{isRunning ? "Running…" : "Run query"}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <label htmlFor="admin-sql-query" className="sr-only">SQL command</label>
          <textarea
            id="admin-sql-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                void runQuery();
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={'select id, name from public.subjects order by name limit 20;'}
            className="min-h-[280px] w-full resize-y rounded-xl border border-[#29352a] bg-[#111711] p-4 font-mono text-sm leading-6 text-[#d6dfd1] outline-none placeholder:text-[#71806c] focus:border-[#6e9d61] focus:ring-4 focus:ring-[#7ba36e]/15"
            aria-describedby="sql-editor-hint"
          />
          <p id="sql-editor-hint" className="mt-2 text-xs text-[#778171] dark:text-[#a6b09f]">Use Ctrl+Enter or ⌘+Enter to run. Only one statement is accepted per run.</p>
          {clipboardStatus && <p className="mt-1 text-xs text-[#315f29] dark:text-[#b7d7ad]" role="status">{clipboardStatus}</p>}
        </div>

        {(error || result) && (
          <div className="border-t border-[#e8ece4] p-4 dark:border-white/10 sm:p-5" aria-live="polite">
            {error ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200" role="alert"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Query failed</p><pre className="mt-1 whitespace-pre-wrap break-words font-sans">{error}</pre>{error.includes("admin_execute_sql") && <p className="mt-2 text-xs">Run the setup script in <code>supabase/migrations/20261117000000_admin_sql_editor.sql</code> in your Supabase SQL editor, then reload this page.</p>}</div></div>
            ) : (
              <div className="rounded-xl border border-[#d7e7d0] bg-[#f3f8f0] p-4 dark:border-[#365330] dark:bg-[#172517]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#315f29] dark:text-[#c9e4c0]"><CheckCircle2 size={17} />Query completed</div>
                  {resultRows.length > 0 && <button type="button" onClick={copyResults} className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-[#d7e7d0] px-3 text-xs font-semibold text-[#315f29] transition hover:bg-[#e8f0e3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4c8b3e] dark:border-[#365330] dark:hover:bg-[#203620]"><Copy size={14} />Copy results as TSV</button>}
                </div>
                <p className="mt-1 text-xs text-[#53634d] dark:text-[#b7c7af]">{result?.rows?.length ?? result?.rowsAffected ?? 0} {result?.rows ? "rows returned" : "rows affected"}</p>
                {resultRows.length > 0 && <div className="mt-3 max-h-[480px] overflow-auto rounded-lg border border-[#dce5d7] bg-white dark:border-white/10 dark:bg-[#111711]">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-[#edf3e9] text-[#34402f] dark:bg-[#202920] dark:text-[#d6dfd1]"><tr>{resultColumns.map((column) => <th key={column} scope="col" className="whitespace-nowrap border-b border-[#dce5d7] px-3 py-2.5 font-semibold dark:border-white/10">{column}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[#edf0e9] text-[#34402f] dark:divide-white/5 dark:text-[#d6dfd1]">{resultRows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-[#f8fbf6] dark:hover:bg-white/[0.03]">{resultColumns.map((column) => <td key={column} className="max-w-[420px] whitespace-pre-wrap break-words px-3 py-2 align-top select-text">{formatCell(row?.[column])}</td>)}</tr>)}</tbody>
                  </table>
                </div>}
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
        <p><span className="font-semibold">Use care with data-changing statements.</span> This tool runs commands against the live database. Start with a SELECT to inspect the target rows before changing them.</p>
      </aside>
    </div>
  );
};

export default AdminSqlEditor;
