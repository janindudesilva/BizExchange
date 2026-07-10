"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

useEffect(() => {
  setToken(localStorage.getItem("token"));
  setRole(localStorage.getItem("role"));
}, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");

    setToken(null);
    setRole(null);

    router.push("/");
  }

  return (
    <nav className="bg-slate-950 text-white px-8 py-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold">
        Business Exchange
      </Link>

      <div className="flex gap-6 items-center">
      <Link href="/businesses">Businesses</Link>

      {token && role === "SELLER" && (
        <Link href="/seller/dashboard">Seller Dashboard</Link>
        )}
        
      {token && role === "ADMIN" && (
        <Link href="/admin/dashboard">Admin Dashboard</Link>
        )}
          
      {!token && (
        <>
          <Link href="/login">Login</Link>
          <Link href="/register" className="bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-700">
          Register
          </Link>
        </>
)}

{token && (
  <button onClick={logout} className="text-red-300">
    Logout
  </button>
)}
      </div>
    </nav>
  );
}
