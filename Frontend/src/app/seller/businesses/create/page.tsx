"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function CreateBusinessPage() {
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
const form = new FormData(formElement);

    const userId = localStorage.getItem("userId");

    const payload = {
      sellerId: Number(userId),
      category: category === "Other" ? String(form.get("otherCategory")) : String(form.get("category")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      location: String(form.get("location")),
      address: String(form.get("address")),
      askingPrice: Number(form.get("askingPrice")),
      businessAgeYears: Number(form.get("businessAgeYears")),
      numberOfEmployees: Number(form.get("numberOfEmployees")),
      reasonForSelling: String(form.get("reasonForSelling")),
    };

    try {
      const result = await apiRequest<{ success: boolean; message: string }>(
        "/businesses",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      setMessage(result.message);
      formElement.reset();
      setCategory("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to create business"
      );
    }
  }

  return (
    <main className="max-w-2xl mx-auto bg-white mt-10 p-8 rounded-xl shadow-sm text-slate-950">
      <h1 className="text-3xl font-bold mb-6">Create Business Listing</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <select
        name="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full border p-3 rounded-md text-slate-950"
        required
        >
          <option value="">Select Business Category</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Grocery Shop">Grocery Shop</option>
          <option value="Salon">Salon</option>
          <option value="Hotel">Hotel</option>
          <option value="Online Business">Online Business</option>
          <option value="Clothing Store">Clothing Store</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Other">Other</option>
        </select>

        {category === "Other" && (
          <input
          name="otherCategory"
          placeholder="Enter Category"
          className="w-full border p-3 rounded-md text-slate-950 placeholder:text-slate-400"
          required
          />
          )}

        <input
          name="title"
          placeholder="Business Title"
          className="w-full border p-3 rounded-md"
          required
        />

        <textarea
          name="description"
          placeholder="Business Description"
          className="w-full border p-3 rounded-md"
          required
        />

        <input
          name="location"
          placeholder="Location"
          className="w-full border p-3 rounded-md"
          required
        />

        <input
          name="address"
          placeholder="Address"
          className="w-full border p-3 rounded-md"
        />

        <input
          name="askingPrice"
          type="number"
          placeholder="Asking Price"
          className="w-full border p-3 rounded-md"
          required
        />

        <input
          name="businessAgeYears"
          type="number"
          placeholder="Business Age in Years"
          className="w-full border p-3 rounded-md"
        />

        <input
          name="numberOfEmployees"
          type="number"
          placeholder="Number of Employees"
          className="w-full border p-3 rounded-md"
        />

        <textarea
          name="reasonForSelling"
          placeholder="Reason for Selling"
          className="w-full border p-3 rounded-md"
        />

        <button className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700">
          Submit for Review
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
    </main>
  );
}
