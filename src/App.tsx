import { useState } from "react";
import type { Page, User } from "./types";
import Header from "./components/Header";
import BrowsePage from "./pages/BrowsePage";
import LiveRoomPage from "./pages/LiveRoomPage";
import AuthModal from "./pages/AuthModal";
import HostDashboard from "./pages/HostDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BuyerOrders from "./pages/BuyerOrders";

export default function App() {
  const [page, setPage] = useState<Page>({ id: "browse" });
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  function handleAuth(u: User, t: string) {
    setUser(u);
    setToken(t);
    setShowAuth(false);
  }

  function handleLogout() {
    setUser(null);
    setToken(null);
    setPage({ id: "browse" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        page={page}
        user={user}
        onNavigate={setPage}
        onLoginClick={() => setShowAuth(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {page.id === "browse" && (
          <BrowsePage onNavigate={setPage} user={user} />
        )}
        {page.id === "live" && (
          <LiveRoomPage
            streamId={page.streamId}
            onNavigate={setPage}
            user={user}
            token={token}
            onLoginRequired={() => setShowAuth(true)}
          />
        )}
        {page.id === "host-dashboard" && user && (user.role === "host" || user.role === "admin") && (
          <HostDashboard user={user} onNavigate={setPage} />
        )}
        {page.id === "admin-dashboard" && user && user.role === "admin" && (
          <AdminDashboard user={user} onNavigate={setPage} />
        )}
        {page.id === "buyer-orders" && user && (
          <BuyerOrders user={user} token={token} onNavigate={setPage} />
        )}
      </main>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={handleAuth}
        />
      )}
    </div>
  );
}
