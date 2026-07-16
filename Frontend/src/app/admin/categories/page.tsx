"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setError("");
      // Public GET /api/categories returns ApiResponse<List<CategoryResponse>>
      const response = await apiRequest<{ data: Category[] }>("/categories");
      setCategories(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setMessage("");
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setMessage("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingCategory) {
        // Update
        const response = await apiRequest<{ message: string; data: Category }>(
          `/admin/categories/${editingCategory.id}`,
          {
            method: "PUT",
            body: JSON.stringify({ name, description }),
          }
        );
        setMessage(response.message);
        setEditingCategory(null);
      } else {
        // Create
        const response = await apiRequest<{ message: string; data: Category }>(
          "/admin/categories",
          {
            method: "POST",
            body: JSON.stringify({ name, description }),
          }
        );
        setMessage(response.message);
      }

      setName("");
      setDescription("");
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    setError("");
    setMessage("");

    try {
      const response = await apiRequest<{ message: string }>(`/admin/categories/${id}`, {
        method: "DELETE",
      });
      setMessage(response.message);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category");
    }
  };

  const inputClass =
    "w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors text-sm";

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#d8e4f0] tracking-wide">
            BUSINESS CATEGORIES
          </h1>
          <p className="text-[#4f6380] text-sm mt-1">
            Manage listing categories and classifications
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Category Form */}
        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl h-fit">
          <h2 className="text-lg font-semibold text-[#d8e4f0] mb-4">
            {editingCategory ? "EDIT CATEGORY" : "ADD NEW CATEGORY"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] tracking-[0.1em] text-[#4f6380] mb-1 font-medium">
                CATEGORY NAME
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Technology, Retail"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] tracking-[0.1em] text-[#4f6380] mb-1 font-medium">
                DESCRIPTION
              </label>
              <textarea
                className={inputClass}
                placeholder="Brief description of this category"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#00cfa8] text-[#080c15] py-2.5 rounded-lg font-semibold hover:bg-[#00e6bc] disabled:opacity-50 transition-colors text-sm"
              >
                {submitting
                  ? "Submitting..."
                  : editingCategory
                  ? "Save Changes"
                  : "Create Category"}
              </button>

              {editingCategory && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-lg border border-white/10 text-[#8092ab] hover:bg-white/[0.04] hover:text-[#c7d2e0] transition-colors text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Categories List */}
        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-[#4f6380]">Loading categories...</p>
          ) : categories.length === 0 ? (
            <p className="text-[#4f6380]">No categories defined.</p>
          ) : (
            <div className="bg-[#121c32] border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">
                      NAME
                    </th>
                    <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">
                      DESCRIPTION
                    </th>
                    <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium">
                      CREATED AT
                    </th>
                    <th className="p-4 text-[11px] tracking-[0.1em] text-[#4f6380] font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4 text-sm font-semibold text-[#d8e4f0]">
                        {cat.name}
                      </td>
                      <td className="p-4 text-sm text-[#8092ab] max-w-[200px] truncate">
                        {cat.description || "—"}
                      </td>
                      <td className="p-4 text-sm text-[#4f6380]">
                        {new Date(cat.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm space-x-2 text-right">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="text-[#00cfa8] hover:text-[#00e6bc] transition-colors text-xs font-semibold bg-[#00cfa8]/10 hover:bg-[#00cfa8]/20 px-2.5 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="text-red-400 hover:text-red-300 transition-colors text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
