import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

/**
 * High-Performance Lattice Hook.
 * Manages Supabase table data with a server-side pagination manifestation.
 * Optimized for React 19 and AG Grid orchestration.
 */
export function useTableData(tableName: string, options: { 
  filterColumn?: string; 
  filterValue?: any;
  pageSize?: number;
} = {}) {
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(0); 
  const [pageSize, setPageSize] = useState(options.pageSize || 10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(tableName).select("*", { count: "exact" });

      // Apply Filter Manifestation if present
      if (options.filterColumn && options.filterValue && options.filterValue !== "all") {
        if (Array.isArray(options.filterValue)) {
            query = query.in(options.filterColumn, options.filterValue);
        } else {
            query = query.eq(options.filterColumn, options.filterValue);
        }
      }

      // 1. Fetch total count for current filter manifestation
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data: result, count, error: fetchError } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;
      
      setData(result || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error(`[Lattice Hook] ${tableName} Fetch Failure:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName, page, pageSize, options.filterColumn, options.filterValue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = async (item: any) => {
    const { id: _, created_at, updated_at, ...payload } = item;
    const { data: results, error: insertError } = await supabase
      .from(tableName)
      .insert(payload)
      .select();

    if (insertError) throw insertError;
    const newItem = Array.isArray(results) ? results[0] : results;
    
    await fetchData();
    return newItem;
  };

  const updateItem = async (id: string, updates: any) => {
    const { id: _, created_at, updated_at, ...payload } = updates;
    console.log(`[Lattice Hook] Initiating Authoritative Verification for ID:`, id);
    
    // 1. Visibility Check Manifestation
    const { data: visibilityCheck } = await supabase.from(tableName).select("id").eq("id", id).maybeSingle();
    if (!visibilityCheck) {
        console.error(`[Lattice Hook] Visibility Failure: The entity with ID ${id} is NOT accessible or does not exist with current credentials.`);
        throw new Error("Lattice Visibility Failure: Access Denied or Entity Missing.");
    }

    console.log(`[Lattice Hook] Executing UPDATE on ${tableName} for ID:`, id);
    const { data: results, error: updateError } = await supabase
      .from(tableName)
      .update(payload)
      .eq("id", id)
      .select();

    if (updateError) {
        console.error(`[Lattice Hook] ${tableName} Update ERROR:`, updateError);
        throw updateError;
    }

    console.log(`[Lattice Hook] PostgreSQL Manifestation Results:`, results);
    const updatedItem = Array.isArray(results) ? results[0] : results;
    
    if (updatedItem) {
      setData((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
      console.log(`[Lattice Hook] Local State Synchronized for ID:`, id);
    } else {
      console.warn(`[Lattice Hook] Update matched exactly ONE row but returned NO results. (High Probability of RLS Select Censorship).`);
      await fetchData(); 
    }
    return updatedItem;
  };

  const deleteItem = async (id: string) => {
    const { error: deleteError } = await supabase.from(tableName).delete().eq("id", id);
    if (deleteError) throw deleteError;
    await fetchData();
  };

  return {
    data,
    totalCount,
    loading,
    error,
    page,
    pageSize,
    setPage,
    setPageSize,
    refresh: fetchData,
    addItem,
    updateItem,
    deleteItem,
  };
}
