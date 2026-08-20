import { useState } from "react";
import type { User } from "../types";
import { api } from "../api";

interface AuthModalProps {
  onClose: () => void;
  onAuth: (user: User, token: string) => void;
}

type Mode = "login" | "register";

export default function AuthModal({ onClose, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "host">("buyer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const fn = mode === "login"
        ? api.login(email.trim(), password)
        : api.register(name.trim(), email.trim(), password, role);

      const data = await fn;
      onAuth(data.user as User, data.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;

      // Demo fallback when API is unavailable
      const isAdminEmail = email.trim().toLowerCase() === "admin@flashlive.id";
      const mockUser: User = {
        id: 999,
        name: isAdminEmail ? "Admin FlashLive" : mode === "register" ? name.trim() || "Demo User" : email.split("@")[0],
        email: email.trim() || "demo@flashlive.id",
        role: isAdminEmail ? "admin" : mode === "register" ? role : "buyer",
        status: "active",
      };

      // Show real API error only for known errors (not network failures)
      if (message && !message.includes("fetch") && !message.includes("network")) {
        setError(message);
      } else {
        onAuth(mockUser, "mock-token-demo");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚡</span>
              <span className="font-bold text-gray-900 text-sm">FlashLive</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">
              {mode === "login" ? "Selamat datang kembali" : "Buat akun baru"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl -mt-4">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Lengkap</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                required
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@kamu.com"
              required
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Daftar sebagai</label>
              <div className="grid grid-cols-2 gap-2">
                {(["buyer", "host"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                      role === r
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {r === "buyer" ? "🛒 Pembeli" : "📡 Host"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm mt-1 disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg,#F97316,#EF4444)" }}
          >
            {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Buat Akun"}
          </button>

          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">atau</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
