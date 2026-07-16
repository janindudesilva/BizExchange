"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";



export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

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

    // The seller portal ships its own full-screen portal shell (sidebar + top bar),
    // so the site-wide navbar would be redundant there.
    if (pathname?.startsWith("/seller/")) {
        return null;
    }

    return (
        <nav className="bg-[#0d1220] text-[#c7d2e0] px-8 py-4 flex items-center justify-between border-b border-white/5">
            <Link href="/" className="text-xl font-bold text-[#00cfa8] tracking-wide">
                BIZEXCHANGE
            </Link>

            <div className="flex gap-6 items-center text-sm">
                <Link href="/businesses" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                    Businesses
                </Link>

                {token && role === "BUYER" && (
                    <Link href="/businesses/my-inquiries" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                        My Inquiries
                    </Link>
                )}

                {token && role === "SELLER" && (
                    <Link href="/seller/dashboard" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                        Seller Dashboard
                    </Link>
                )}

                {token && role === "ADMIN" && (
                    <Link href="/admin/dashboard" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                        Admin Dashboard
                    </Link>
                )}

                {!token && (
                    <>
                        <Link href="/login" className="text-[#8092ab] hover:text-[#d8e4f0] transition-colors">
                            Login
                        </Link>
                        <Link href="/register" className="bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors">
                            Register
                        </Link>
                    </>
                )}

                {token && (
                    <button onClick={logout} className="text-[#8092ab] hover:text-red-400 transition-colors">
                        Logout
                    </button>
                )}
            </div>
        </nav>
    );
}