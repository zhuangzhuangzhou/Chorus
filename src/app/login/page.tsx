"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "An error occurred");
        return;
      }

      const result = data.data;

      if (result.type === "super_admin") {
        router.push(`/login/admin?email=${encodeURIComponent(email)}`);
      } else if (result.type === "oidc" && result.company) {
        // TODO: 实现 OIDC 重定向
        setError(
          `OIDC login for ${result.company.name} is not yet implemented`
        );
      } else {
        setError(result.message || "No organization found for this email");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] p-4">
      <div className="w-full max-w-[400px] rounded-xl border border-[#E5E2DC] bg-white p-10">
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12 text-[#171717]"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <h1 className="text-[28px] font-semibold text-[#171717]">Chorus</h1>
          <p className="text-sm text-[#737373]">
            AI-Human Collaboration Platform
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[#171717]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-11 w-full rounded-lg border border-[#E5E5E5] bg-white px-3 text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#171717] text-sm font-medium text-white transition-colors hover:bg-[#2C2C2C] disabled:opacity-50"
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>

        {/* Help Text */}
        <p className="mt-8 text-center text-xs text-[#737373]">
          Enter your email to sign in or create an account
        </p>
      </div>
    </div>
  );
}
