import { useState } from "react";
import type { Page, User } from "../types";
import { formatPrice, formatViewer } from "../utils";

/* ── Local types ─────────────────────────────────────────── */

type UserStatus = "active" | "blocked" | "pending_verification";
type UserRole = "buyer" | "host" | "admin";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

interface AdminStream {
  id: number;
  hostName: string;
  title: string;
  status: "live" | "scheduled" | "ended";
  viewerPeak: number;
  startedAt: string | null;
}

interface AdminOrder {
  id: number;
  buyerName: string;
  hostName: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: "paid" | "shipped" | "cancelled";
  createdAt: string;
}

/* ── Mock data ───────────────────────────────────────────── */

const now = Date.now();

const MOCK_USERS: AdminUser[] = [
  { id: 1, name: "Sarah Beauty Official", email: "sarah@beauty.id", role: "host", status: "active", createdAt: new Date(now - 90 * 86400000).toISOString() },
  { id: 2, name: "KickZone Official", email: "kickzone@store.id", role: "host", status: "active", createdAt: new Date(now - 60 * 86400000).toISOString() },
  { id: 3, name: "GadgetMania ID", email: "gadget@mania.id", role: "host", status: "active", createdAt: new Date(now - 45 * 86400000).toISOString() },
  { id: 4, name: "Batik Nusantara", email: "batik@nusantara.id", role: "host", status: "active", createdAt: new Date(now - 30 * 86400000).toISOString() },
  { id: 5, name: "LuxeCloset", email: "luxe@closet.id", role: "host", status: "blocked", createdAt: new Date(now - 20 * 86400000).toISOString() },
  { id: 6, name: "Dewi Rahayu", email: "dewi.r@gmail.com", role: "buyer", status: "active", createdAt: new Date(now - 15 * 86400000).toISOString() },
  { id: 7, name: "Budi Santoso", email: "budi.s@gmail.com", role: "buyer", status: "active", createdAt: new Date(now - 12 * 86400000).toISOString() },
  { id: 8, name: "Sari Kurnia", email: "sari.k@yahoo.com", role: "buyer", status: "active", createdAt: new Date(now - 10 * 86400000).toISOString() },
  { id: 9, name: "Tika Maulida", email: "tika.m@gmail.com", role: "buyer", status: "active", createdAt: new Date(now - 7 * 86400000).toISOString() },
  { id: 10, name: "Hendra Gunawan", email: "hendra.g@outlook.com", role: "buyer", status: "blocked", createdAt: new Date(now - 5 * 86400000).toISOString() },
  { id: 11, name: "Nisa Fitria", email: "nisa.f@gmail.com", role: "buyer", status: "active", createdAt: new Date(now - 3 * 86400000).toISOString() },
  { id: 12, name: "Reza Pratama", email: "reza.p@gmail.com", role: "buyer", status: "pending_verification", createdAt: new Date(now - 2 * 86400000).toISOString() },
  { id: 13, name: "Maya Sari", email: "maya.s@gmail.com", role: "buyer", status: "active", createdAt: new Date(now - 86400000).toISOString() },
  { id: 14, name: "Putri Lestari", email: "putri.l@yahoo.com", role: "buyer", status: "active", createdAt: new Date(now - 12 * 3600000).toISOString() },
  { id: 15, name: "Fajar Darmawan", email: "fajar.d@gmail.com", role: "buyer", status: "pending_verification", createdAt: new Date(now - 3 * 3600000).toISOString() },
];

const MOCK_ADMIN_STREAMS: AdminStream[] = [
  { id: 1, hostName: "Sarah Beauty Official", title: "Flash Sale Skincare Korea 90% OFF", status: "live", viewerPeak: 1842, startedAt: new Date(now - 30 * 60000).toISOString() },
  { id: 2, hostName: "KickZone Official", title: "Sneakers Limited Nike Air Zoom", status: "live", viewerPeak: 3201, startedAt: new Date(now - 45 * 60000).toISOString() },
  { id: 3, hostName: "GadgetMania ID", title: "Laptop & Aksesoris Flash 1 Jam!", status: "live", viewerPeak: 987, startedAt: new Date(now - 20 * 60000).toISOString() },
  { id: 4, hostName: "Batik Nusantara", title: "Fashion Show Batik Modern 2026", status: "scheduled", viewerPeak: 0, startedAt: null },
  { id: 5, hostName: "Chef Yuda Kitchen", title: "Bumbu Rahasia & Peralatan Masak", status: "scheduled", viewerPeak: 0, startedAt: null },
  { id: 6, hostName: "RTX Gaming Store", title: "GPU RTX 5090 Flash Sale 40% OFF", status: "scheduled", viewerPeak: 0, startedAt: null },
  { id: 7, hostName: "Sarah Beauty Official", title: "Skincare Lokal Haul: Review & Giveaway", status: "ended", viewerPeak: 2100, startedAt: new Date(now - 5 * 3600000).toISOString() },
  { id: 8, hostName: "LuxeCloset", title: "Jam Tangan Premium Pre-Loved", status: "ended", viewerPeak: 1500, startedAt: new Date(now - 8 * 3600000).toISOString() },
];

const MOCK_ADMIN_ORDERS: AdminOrder[] = [
  { id: 1001, buyerName: "Dewi R.", hostName: "Sarah Beauty", productName: "Serum Vitamin C Gold 30ml", quantity: 2, totalPrice: 178_000, status: "paid", createdAt: new Date(now - 3 * 60000).toISOString() },
  { id: 1002, buyerName: "Sari K.", hostName: "Sarah Beauty", productName: "Serum Vitamin C Gold 30ml", quantity: 1, totalPrice: 89_000, status: "paid", createdAt: new Date(now - 7 * 60000).toISOString() },
  { id: 1003, buyerName: "Tika M.", hostName: "Sarah Beauty", productName: "Serum Vitamin C Gold 30ml", quantity: 2, totalPrice: 178_000, status: "shipped", createdAt: new Date(now - 12 * 60000).toISOString() },
  { id: 1004, buyerName: "Reza P.", hostName: "KickZone", productName: "Nike Air Zoom Pegasus 42", quantity: 1, totalPrice: 1_250_000, status: "paid", createdAt: new Date(now - 18 * 60000).toISOString() },
  { id: 1005, buyerName: "Budi S.", hostName: "KickZone", productName: "Nike Air Zoom Pegasus 42", quantity: 1, totalPrice: 1_250_000, status: "paid", createdAt: new Date(now - 25 * 60000).toISOString() },
  { id: 1006, buyerName: "Maya S.", hostName: "Sarah Beauty", productName: "Sheet Mask Brightening (5pcs)", quantity: 3, totalPrice: 147_000, status: "paid", createdAt: new Date(now - 2 * 3600000).toISOString() },
  { id: 1007, buyerName: "Nisa F.", hostName: "GadgetMania", productName: "Laptop ASUS ROG Zephyrus G16", quantity: 1, totalPrice: 18_500_000, status: "paid", createdAt: new Date(now - 35 * 60000).toISOString() },
  { id: 1008, buyerName: "Hendra G.", hostName: "Sarah Beauty", productName: "Sheet Mask Brightening (5pcs)", quantity: 1, totalPrice: 49_000, status: "cancelled", createdAt: new Date(now - 2.5 * 3600000).toISOString() },
  { id: 1009, buyerName: "Putri L.", hostName: "KickZone", productName: "Nike Air Zoom Pegasus 42", quantity: 1, totalPrice: 1_250_000, status: "shipped", createdAt: new Date(now - 40 * 60000).toISOString() },
  { id: 1010, buyerName: "Fajar D.", hostName: "GadgetMania", productName: "Laptop ASUS ROG Zephyrus G16", quantity: 1, totalPrice: 18_500_000, status: "paid", createdAt: new Date(now - 50 * 60000).toISOString() },
];

/* ── Main component ──────────────────────────────────────── */

type Tab = "overview" | "users" | "streams" | "orders";

interface AdminDashboardProps {
  user: User;
  onNavigate: (p: Page) => void;
}

export default function AdminDashboard({ user, onNavigate }: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState(MOCK_USERS);

  const activeStreams = MOCK_ADMIN_STREAMS.filter((s) => s.status === "live");
  const totalViewers = activeStreams.reduce((a, s) => a + s.viewerPeak, 0);
  const paidOrders = MOCK_ADMIN_ORDERS.filter((o) => o.status !== "cancelled");
  const todayRevenue = paidOrders.reduce((a, o) => a + o.totalPrice, 0);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Ringkasan", icon: "📊" },
    { id: "users", label: "Pengguna", icon: "👥" },
    { id: "streams", label: "Siaran", icon: "📡" },
    { id: "orders", label: "Transaksi", icon: "💳" },
  ];

  function toggleBlock(userId: number) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "blocked" ? "active" : "blocked" }
          : u,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monitor & kelola platform</p>
          </div>
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-red-600">{activeStreams.length} live sekarang</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.id ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <OverviewTab
            users={users}
            streams={MOCK_ADMIN_STREAMS}
            orders={MOCK_ADMIN_ORDERS}
            totalViewers={totalViewers}
            todayRevenue={todayRevenue}
            onGoToTab={setTab}
            onNavigate={onNavigate}
          />
        )}
        {tab === "users" && <UsersTab users={users} onToggleBlock={toggleBlock} />}
        {tab === "streams" && <StreamsTab streams={MOCK_ADMIN_STREAMS} onNavigate={onNavigate} />}
        {tab === "orders" && <OrdersTab orders={MOCK_ADMIN_ORDERS} />}
      </div>
    </div>
  );
}

/* ── Overview Tab ────────────────────────────────────────── */

function OverviewTab({
  users, streams, orders, totalViewers, todayRevenue, onGoToTab, onNavigate,
}: {
  users: AdminUser[];
  streams: AdminStream[];
  orders: AdminOrder[];
  totalViewers: number;
  todayRevenue: number;
  onGoToTab: (t: Tab) => void;
  onNavigate: (p: Page) => void;
}) {
  const liveStreams = streams.filter((s) => s.status === "live");
  const blockedUsers = users.filter((u) => u.status === "blocked").length;
  const pendingUsers = users.filter((u) => u.status === "pending_verification").length;
  const paidOrders = orders.filter((o) => o.status !== "cancelled");

  const stats = [
    { label: "Total Pengguna", value: String(users.length), sub: `${blockedUsers} diblokir`, icon: "👥", color: "#6366F1" },
    { label: "Siaran Aktif", value: String(liveStreams.length), sub: `${formatViewer(totalViewers)} penonton`, icon: "📡", color: "#EF4444" },
    { label: "Transaksi Hari Ini", value: String(paidOrders.length), sub: "tidak termasuk batal", icon: "💳", color: "#10B981" },
    { label: "Revenue Hari Ini", value: formatPrice(todayRevenue), sub: "semua host", icon: "💰", color: "#F59E0B" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3" style={{ background: `${s.color}18` }}>
              {s.icon}
            </div>
            <p className="text-xl font-black text-gray-900 leading-none truncate">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(blockedUsers > 0 || pendingUsers > 0) && (
        <div className="space-y-2">
          {pendingUsers > 0 && (
            <AlertBanner
              color="amber"
              icon="⏳"
              message={`${pendingUsers} akun menunggu verifikasi`}
              action="Kelola Pengguna"
              onAction={() => onGoToTab("users")}
            />
          )}
          {blockedUsers > 0 && (
            <AlertBanner
              color="red"
              icon="🚫"
              message={`${blockedUsers} akun diblokir`}
              action="Lihat Detail"
              onAction={() => onGoToTab("users")}
            />
          )}
        </div>
      )}

      {/* Live streams monitor */}
      {liveStreams.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Monitor Siaran Live</p>
          <div className="space-y-2">
            {liveStreams.map((s) => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-red-500">LIVE</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.hostName} · {formatViewer(s.viewerPeak)} penonton</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate({ id: "live", streamId: s.id })}
                  className="text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  Monitor →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transaksi Terbaru</p>
          <button onClick={() => onGoToTab("orders")} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Lihat semua →</button>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
          {orders.slice(0, 5).map((o) => (
            <AdminOrderRow key={o.id} order={o} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Users Tab ───────────────────────────────────────────── */

function UsersTab({ users, onToggleBlock }: { users: AdminUser[]; onToggleBlock: (id: number) => void }) {
  const [filter, setFilter] = useState<"all" | "host" | "buyer" | "blocked" | "pending">("all");

  const filtered = users.filter((u) => {
    if (filter === "all") return true;
    if (filter === "blocked") return u.status === "blocked";
    if (filter === "pending") return u.status === "pending_verification";
    return u.role === filter;
  });

  const filterOpts: { id: typeof filter; label: string }[] = [
    { id: "all", label: `Semua (${users.length})` },
    { id: "host", label: `Host (${users.filter((u) => u.role === "host").length})` },
    { id: "buyer", label: `Pembeli (${users.filter((u) => u.role === "buyer").length})` },
    { id: "blocked", label: `Diblokir (${users.filter((u) => u.status === "blocked").length})` },
    { id: "pending", label: `Pending (${users.filter((u) => u.status === "pending_verification").length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filterOpts.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
              filter === f.id ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
        {filtered.map((u) => (
          <div key={u.id} className="px-4 py-3 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: u.role === "host" ? "#6366F1" : u.role === "admin" ? "#EF4444" : "#9CA3AF" }}
            >
              {u.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                <RoleBadge role={u.role} />
              </div>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <UserStatusBadge status={u.status} />
              {u.role !== "admin" && (
                <button
                  onClick={() => onToggleBlock(u.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    u.status === "blocked"
                      ? "border-green-200 text-green-600 hover:bg-green-50"
                      : "border-red-200 text-red-500 hover:bg-red-50"
                  }`}
                >
                  {u.status === "blocked" ? "Aktifkan" : "Blokir"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Streams Tab ─────────────────────────────────────────── */

function StreamsTab({ streams, onNavigate }: { streams: AdminStream[]; onNavigate: (p: Page) => void }) {
  const [filter, setFilter] = useState<"all" | "live" | "scheduled" | "ended">("all");
  const filtered = filter === "all" ? streams : streams.filter((s) => s.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {(["all", "live", "scheduled", "ended"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
              filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}>
            {f === "all" ? `Semua (${streams.length})` : f === "live" ? `Live (${streams.filter((s) => s.status === "live").length})` : f === "scheduled" ? "Upcoming" : "Ended"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <AdminStreamBadge status={s.status} />
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{s.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.hostName}
                {s.status === "live" && s.startedAt && ` · ${formatViewer(s.viewerPeak)} penonton`}
                {s.status === "ended" && s.viewerPeak > 0 && ` · puncak ${formatViewer(s.viewerPeak)} penonton`}
              </p>
            </div>
            {s.status === "live" && (
              <button
                onClick={() => onNavigate({ id: "live", streamId: s.id })}
                className="text-xs font-semibold bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors flex-shrink-0"
              >
                Monitor
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Orders Tab ──────────────────────────────────────────── */

function OrdersTab({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState<"all" | "paid" | "shipped" | "cancelled">("all");
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.totalPrice, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {(["all", "paid", "shipped", "cancelled"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
              }`}>
              {f === "all" ? "Semua" : f === "paid" ? "Dibayar" : f === "shipped" ? "Dikirim" : "Batal"}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-500 hidden sm:block">
          Total: <span className="text-gray-900">{formatPrice(totalRevenue)}</span>
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
        {filtered.map((o) => (
          <AdminOrderRow key={o.id} order={o} showHost />
        ))}
      </div>
    </div>
  );
}

/* ── Shared components ───────────────────────────────────── */

function AlertBanner({ color, icon, message, action, onAction }: {
  color: "amber" | "red";
  icon: string;
  message: string;
  action: string;
  onAction: () => void;
}) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>{icon}</span>
        <span>{message}</span>
      </div>
      <button onClick={onAction} className="text-xs font-bold underline underline-offset-2 hover:no-underline">
        {action}
      </button>
    </div>
  );
}

function AdminOrderRow({ order, showHost = false }: { order: AdminOrder; showHost?: boolean }) {
  const statusColor: Record<string, string> = {
    paid: "text-green-600 bg-green-50",
    shipped: "text-blue-600 bg-blue-50",
    cancelled: "text-gray-400 bg-gray-100",
  };
  const statusLabel: Record<string, string> = { paid: "Dibayar", shipped: "Dikirim", cancelled: "Batal" };

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{order.buyerName}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {order.productName}{showHost && ` · ${order.hostName}`}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {order.quantity} pcs · {new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{formatPrice(order.totalPrice)}</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[order.status]}`}>
          {statusLabel[order.status]}
        </span>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "host") return <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">HOST</span>;
  if (role === "admin") return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">ADMIN</span>;
  return null;
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  if (status === "active") return <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Aktif</span>;
  if (status === "blocked") return <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Blokir</span>;
  return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>;
}

function AdminStreamBadge({ status }: { status: AdminStream["status"] }) {
  if (status === "live") return <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">LIVE</span>;
  if (status === "scheduled") return <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">UPCOMING</span>;
  return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">ENDED</span>;
}
