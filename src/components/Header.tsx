import type { Page, User } from "../types";

interface HeaderProps {
  page: Page;
  user: User | null;
  onNavigate: (p: Page) => void;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function Header({ page, user, onNavigate, onLoginClick, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => onNavigate({ id: "browse" })}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <span className="text-xl">⚡</span>
          <span className="font-bold text-gray-900 text-base tracking-tight">FlashLive</span>
        </button>

        {/* Nav tabs */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavTab
            label="Browse"
            active={page.id === "browse"}
            onClick={() => onNavigate({ id: "browse" })}
          />
          {user && user.role === "buyer" && (
            <NavTab
              label="Pesanan Saya"
              active={page.id === "buyer-orders"}
              onClick={() => onNavigate({ id: "buyer-orders" })}
            />
          )}
          {user && (user.role === "host" || user.role === "admin") && (
            <NavTab
              label="Dashboard"
              active={page.id === "host-dashboard"}
              onClick={() => onNavigate({ id: "host-dashboard" })}
            />
          )}
          {user && user.role === "admin" && (
            <NavTab
              label="Admin"
              active={page.id === "admin-dashboard"}
              onClick={() => onNavigate({ id: "admin-dashboard" })}
            />
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold select-none">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user.name}
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Keluar
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-gray-700 transition-colors"
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
