import { useState } from "react";
import type { Page, User } from "../types";
import { formatPrice, formatViewer } from "../utils";

/* ── Local types ─────────────────────────────────────────── */

interface HostStream {
  id: number;
  title: string;
  status: "live" | "scheduled" | "ended";
  startedAt: string | null;
  viewerPeak: number;
}

interface HostProduct {
  id: number;
  name: string;
  description: string;
  normalPrice: number;
  stock: number;
}

interface HostFlashSale {
  id: number;
  productId: number;
  productName: string;
  streamId: number;
  streamTitle: string;
  salePrice: number;
  saleStock: number;
  quotaPerUser: number;
  startTime: string;
  endTime: string;
  status: "active" | "scheduled" | "ended";
}

interface HostOrder {
  id: number;
  buyerName: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: "paid" | "shipped" | "cancelled";
  createdAt: string;
}

/* ── Mock data ───────────────────────────────────────────── */

const now = Date.now();

const INIT_STREAMS: HostStream[] = [
  { id: 1, title: "Flash Sale Skincare Korea 90% OFF", status: "live", startedAt: new Date(now - 30 * 60 * 1000).toISOString(), viewerPeak: 1842 },
  { id: 7, title: "Skincare Lokal Haul: Review & Giveaway", status: "ended", startedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), viewerPeak: 2100 },
  { id: 9, title: "Peluncuran Produk Baru: Sheet Mask Series", status: "scheduled", startedAt: null, viewerPeak: 0 },
  { id: 10, title: "Flash Sale Harbolnas Kemerdekaan", status: "ended", startedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), viewerPeak: 3400 },
];

const INIT_PRODUCTS: HostProduct[] = [
  { id: 1, name: "Serum Vitamin C + Collagen Gold 30ml", description: "Formula Korea dengan Vit C 20% dan Collagen Marine.", normalPrice: 299_000, stock: 153 },
  { id: 2, name: "Sheet Mask Brightening Pack (5pcs)", description: "Masker wajah aloe vera + niacinamide.", normalPrice: 89_000, stock: 320 },
  { id: 3, name: "Toner Hyaluronic Acid 200ml", description: "Toner hydrating untuk semua jenis kulit.", normalPrice: 149_000, stock: 80 },
  { id: 4, name: "Sunscreen SPF50+ PA++++ 50ml", description: "Tekstur ringan, tidak white cast.", normalPrice: 129_000, stock: 200 },
  { id: 5, name: "Eye Cream Retinol 15ml", description: "Mengurangi kantung mata dan kerutan halus.", normalPrice: 189_000, stock: 45 },
];

const INIT_FLASH_SALES: HostFlashSale[] = [
  {
    id: 1, productId: 1, productName: "Serum Vitamin C + Collagen Gold 30ml",
    streamId: 1, streamTitle: "Flash Sale Skincare Korea 90% OFF",
    salePrice: 89_000, saleStock: 47, quotaPerUser: 2,
    startTime: new Date(now - 5 * 60 * 1000).toISOString(),
    endTime: new Date(now + 8 * 60 * 1000).toISOString(),
    status: "active",
  },
  {
    id: 2, productId: 2, productName: "Sheet Mask Brightening Pack (5pcs)",
    streamId: 7, streamTitle: "Skincare Lokal Haul: Review & Giveaway",
    salePrice: 49_000, saleStock: 0, quotaPerUser: 3,
    startTime: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    status: "ended",
  },
  {
    id: 3, productId: 4, productName: "Sunscreen SPF50+ PA++++ 50ml",
    streamId: 9, streamTitle: "Peluncuran Produk Baru: Sheet Mask Series",
    salePrice: 75_000, saleStock: 100, quotaPerUser: 2,
    startTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
    status: "scheduled",
  },
];

const INIT_ORDERS: HostOrder[] = [
  { id: 1001, buyerName: "Dewi R.", productName: "Serum Vitamin C + Collagen Gold 30ml", quantity: 2, totalPrice: 178_000, status: "paid", createdAt: new Date(now - 3 * 60 * 1000).toISOString() },
  { id: 1002, buyerName: "Sari K.", productName: "Serum Vitamin C + Collagen Gold 30ml", quantity: 1, totalPrice: 89_000, status: "paid", createdAt: new Date(now - 7 * 60 * 1000).toISOString() },
  { id: 1003, buyerName: "Tika M.", productName: "Serum Vitamin C + Collagen Gold 30ml", quantity: 2, totalPrice: 178_000, status: "shipped", createdAt: new Date(now - 12 * 60 * 1000).toISOString() },
  { id: 1004, buyerName: "Maya S.", productName: "Sheet Mask Brightening Pack (5pcs)", quantity: 3, totalPrice: 147_000, status: "paid", createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
  { id: 1005, buyerName: "Putri L.", productName: "Sheet Mask Brightening Pack (5pcs)", quantity: 2, totalPrice: 98_000, status: "shipped", createdAt: new Date(now - 2.2 * 60 * 60 * 1000).toISOString() },
  { id: 1006, buyerName: "Nisa F.", productName: "Sheet Mask Brightening Pack (5pcs)", quantity: 1, totalPrice: 49_000, status: "cancelled", createdAt: new Date(now - 2.5 * 60 * 60 * 1000).toISOString() },
  { id: 1007, buyerName: "Lina H.", productName: "Serum Vitamin C + Collagen Gold 30ml", quantity: 1, totalPrice: 89_000, status: "paid", createdAt: new Date(now - 25 * 60 * 1000).toISOString() },
  { id: 1008, buyerName: "Yuli A.", productName: "Serum Vitamin C + Collagen Gold 30ml", quantity: 2, totalPrice: 178_000, status: "paid", createdAt: new Date(now - 18 * 60 * 1000).toISOString() },
];

/* ── Main component ──────────────────────────────────────── */

type Tab = "overview" | "streams" | "products" | "flash-sales" | "orders";

interface HostDashboardProps {
  user: User;
  onNavigate: (p: Page) => void;
}

export default function HostDashboard({ user, onNavigate }: HostDashboardProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [streams, setStreams] = useState(INIT_STREAMS);
  const [products, setProducts] = useState(INIT_PRODUCTS);
  const [flashSales, setFlashSales] = useState(INIT_FLASH_SALES);
  const [orders] = useState(INIT_ORDERS);

  const [showCreateStream, setShowCreateStream] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateFlashSale, setShowCreateFlashSale] = useState(false);

  const liveStreams = streams.filter((s) => s.status === "live");
  const todayOrders = orders.filter((o) => o.status !== "cancelled");
  const todayRevenue = todayOrders.reduce((acc, o) => acc + o.totalPrice, 0);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Ringkasan", icon: "📊" },
    { id: "streams", label: "Siaran", icon: "📡" },
    { id: "products", label: "Produk", icon: "🛍️" },
    { id: "flash-sales", label: "Flash Sale", icon: "⚡" },
    { id: "orders", label: "Pesanan", icon: "📦" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Host Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Halo, {user.name} 👋</p>
          </div>
          {liveStreams.length > 0 && (
            <button
              onClick={() => onNavigate({ id: "live", streamId: liveStreams[0].id })}
              className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-full animate-pulse"
            >
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              Lihat Siaran Live
            </button>
          )}
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
            streams={streams}
            products={products}
            flashSales={flashSales}
            orders={orders}
            todayRevenue={todayRevenue}
            todayOrderCount={todayOrders.length}
            onGoToTab={setTab}
            onNavigate={onNavigate}
          />
        )}
        {tab === "streams" && (
          <StreamsTab
            streams={streams}
            onAdd={() => setShowCreateStream(true)}
            onGoLive={(id) =>
              setStreams((prev) =>
                prev.map((s) => (s.id === id ? { ...s, status: "live", startedAt: new Date().toISOString() } : s))
              )
            }
            onNavigate={onNavigate}
          />
        )}
        {tab === "products" && (
          <ProductsTab products={products} onAdd={() => setShowCreateProduct(true)} />
        )}
        {tab === "flash-sales" && (
          <FlashSalesTab
            flashSales={flashSales}
            onAdd={() => setShowCreateFlashSale(true)}
          />
        )}
        {tab === "orders" && <OrdersTab orders={orders} />}
      </div>

      {showCreateStream && (
        <CreateStreamModal
          onClose={() => setShowCreateStream(false)}
          onCreate={(title, status) => {
            const newStream: HostStream = {
              id: Date.now(),
              title,
              status,
              startedAt: status === "live" ? new Date().toISOString() : null,
              viewerPeak: 0,
            };
            setStreams((prev) => [newStream, ...prev]);
            setShowCreateStream(false);
          }}
        />
      )}
      {showCreateProduct && (
        <CreateProductModal
          onClose={() => setShowCreateProduct(false)}
          onCreate={(p) => {
            setProducts((prev) => [{ ...p, id: Date.now() }, ...prev]);
            setShowCreateProduct(false);
          }}
        />
      )}
      {showCreateFlashSale && (
        <CreateFlashSaleModal
          products={products}
          streams={streams}
          onClose={() => setShowCreateFlashSale(false)}
          onCreate={(fs) => {
            setFlashSales((prev) => [{ ...fs, id: Date.now() }, ...prev]);
            setShowCreateFlashSale(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Overview Tab ────────────────────────────────────────── */

function OverviewTab({
  streams, products, flashSales, orders, todayRevenue, todayOrderCount, onGoToTab, onNavigate,
}: {
  streams: HostStream[];
  products: HostProduct[];
  flashSales: HostFlashSale[];
  orders: HostOrder[];
  todayRevenue: number;
  todayOrderCount: number;
  onGoToTab: (t: Tab) => void;
  onNavigate: (p: Page) => void;
}) {
  const activeFlashSales = flashSales.filter((fs) => fs.status === "active");

  const stats = [
    { label: "Total Siaran", value: String(streams.length), icon: "📡", color: "#6366F1" },
    { label: "Total Produk", value: String(products.length), icon: "🛍️", color: "#F59E0B" },
    { label: "Pesanan Hari Ini", value: String(todayOrderCount), icon: "📦", color: "#10B981" },
    { label: "Pendapatan Hari Ini", value: formatPrice(todayRevenue), icon: "💰", color: "#EF4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3"
              style={{ background: `${s.color}18` }}
            >
              {s.icon}
            </div>
            <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active flash sale alert */}
      {activeFlashSales.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">⚡</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">Flash Sale Aktif</span>
              </div>
              <p className="font-bold text-sm">{activeFlashSales[0].productName}</p>
              <p className="text-xs opacity-80 mt-0.5">{activeFlashSales[0].streamTitle}</p>
            </div>
            <button
              onClick={() => onNavigate({ id: "live", streamId: activeFlashSales[0].streamId })}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
            >
              Lihat →
            </button>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Aksi Cepat</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Buat Siaran", icon: "📡", tab: "streams" as Tab },
            { label: "Tambah Produk", icon: "🛍️", tab: "products" as Tab },
            { label: "Atur Flash Sale", icon: "⚡", tab: "flash-sales" as Tab },
            { label: "Lihat Pesanan", icon: "📦", tab: "orders" as Tab },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onGoToTab(a.tab)}
              className="bg-white border border-gray-100 rounded-xl p-3 text-left hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <span className="text-xl block mb-1.5">{a.icon}</span>
              <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pesanan Terbaru</p>
          <button onClick={() => onGoToTab("orders")} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Lihat semua →
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
          {orders.slice(0, 4).map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Streams Tab ─────────────────────────────────────────── */

function StreamsTab({
  streams, onAdd, onGoLive, onNavigate,
}: {
  streams: HostStream[];
  onAdd: () => void;
  onGoLive: (id: number) => void;
  onNavigate: (p: Page) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">{streams.length} siaran</p>
        <AddButton label="Buat Siaran" onClick={onAdd} />
      </div>
      <div className="space-y-2">
        {streams.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <StreamStatusBadge status={s.status} />
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{s.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.status === "live" && s.startedAt
                  ? `Mulai ${new Date(s.startedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                  : s.status === "ended" && s.viewerPeak > 0
                  ? `${formatViewer(s.viewerPeak)} penonton`
                  : "Dijadwalkan"}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {s.status === "scheduled" && (
                <button
                  onClick={() => onGoLive(s.id)}
                  className="text-xs font-semibold bg-red-500 text-white px-3 py-1.5 rounded-full hover:bg-red-600 transition-colors"
                >
                  Mulai Live
                </button>
              )}
              {s.status === "live" && (
                <button
                  onClick={() => onNavigate({ id: "live", streamId: s.id })}
                  className="text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Masuk Room
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Products Tab ────────────────────────────────────────── */

function ProductsTab({ products, onAdd }: { products: HostProduct[]; onAdd: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">{products.length} produk</p>
        <AddButton label="Tambah Produk" onClick={onAdd} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)" }}
            >
              ✨
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1">{p.name}</p>
              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{p.description}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-sm font-bold text-gray-900">{formatPrice(p.normalPrice)}</span>
                <span className="text-xs text-gray-400">{p.stock} stok</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Flash Sales Tab ─────────────────────────────────────── */

function FlashSalesTab({ flashSales, onAdd }: { flashSales: HostFlashSale[]; onAdd: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">{flashSales.length} flash sale</p>
        <AddButton label="Buat Flash Sale" onClick={onAdd} />
      </div>
      <div className="space-y-2">
        {flashSales.map((fs) => {
          const discount = Math.round(
            ((INIT_PRODUCTS.find((p) => p.id === fs.productId)?.normalPrice ?? fs.salePrice) - fs.salePrice) /
              (INIT_PRODUCTS.find((p) => p.id === fs.productId)?.normalPrice ?? fs.salePrice) * 100,
          );
          return (
            <div key={fs.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FlashSaleStatusBadge status={fs.status} />
                    {discount > 0 && (
                      <span className="text-[10px] font-bold text-red-500">-{discount}%</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{fs.productName}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{fs.streamTitle}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-orange-500">{formatPrice(fs.salePrice)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fs.saleStock} stok · maks {fs.quotaPerUser}/user
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-xs text-gray-400">
                <span>Mulai: {new Date(fs.startTime).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                <span>Selesai: {new Date(fs.endTime).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Orders Tab ──────────────────────────────────────────── */

function OrdersTab({ orders }: { orders: HostOrder[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-700">{orders.length} pesanan</p>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
        {orders.map((o) => (
          <OrderRow key={o.id} order={o} showProduct />
        ))}
      </div>
    </div>
  );
}

/* ── Shared small components ─────────────────────────────── */

function OrderRow({ order, showProduct = false }: { order: HostOrder; showProduct?: boolean }) {
  const statusColor: Record<string, string> = {
    paid: "text-green-600 bg-green-50",
    shipped: "text-blue-600 bg-blue-50",
    cancelled: "text-gray-400 bg-gray-100",
  };
  const statusLabel: Record<string, string> = {
    paid: "Dibayar",
    shipped: "Dikirim",
    cancelled: "Batal",
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{order.buyerName}</p>
        {showProduct && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{order.productName}</p>
        )}
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

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-full hover:bg-gray-700 transition-colors"
    >
      <span className="text-base leading-none">+</span> {label}
    </button>
  );
}

function StreamStatusBadge({ status }: { status: HostStream["status"] }) {
  if (status === "live") return <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">LIVE</span>;
  if (status === "scheduled") return <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">UPCOMING</span>;
  return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">ENDED</span>;
}

function FlashSaleStatusBadge({ status }: { status: HostFlashSale["status"] }) {
  if (status === "active") return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">AKTIF</span>;
  if (status === "scheduled") return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">TERJADWAL</span>;
  return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">SELESAI</span>;
}

/* ── Create Modals ───────────────────────────────────────── */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl transition-colors">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors";

function CreateStreamModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, status: "live" | "scheduled") => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"live" | "scheduled">("scheduled");

  return (
    <ModalShell title="Buat Siaran Baru" onClose={onClose}>
      <Field label="Judul Siaran">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Flash Sale Harbolnas..." className={inputClass} />
      </Field>
      <Field label="Status Awal">
        <div className="grid grid-cols-2 gap-2">
          {(["scheduled", "live"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`py-2 rounded-xl text-sm font-semibold border transition-all ${status === s ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {s === "scheduled" ? "📅 Terjadwal" : "🔴 Langsung Live"}
            </button>
          ))}
        </div>
      </Field>
      <button disabled={!title.trim()} onClick={() => onCreate(title.trim(), status)}
        className="w-full py-3 mt-1 rounded-xl font-bold text-sm text-white bg-gray-900 disabled:opacity-40 hover:bg-gray-700 transition-colors">
        Buat Siaran
      </button>
    </ModalShell>
  );
}

function CreateProductModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Omit<HostProduct, "id">) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const valid = name.trim() && desc.trim() && Number(price) > 0 && Number(stock) > 0;

  return (
    <ModalShell title="Tambah Produk" onClose={onClose}>
      <Field label="Nama Produk"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama produk..." className={inputClass} /></Field>
      <Field label="Deskripsi"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Deskripsi singkat..." rows={2} className={`${inputClass} resize-none`} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Harga Normal (Rp)"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="299000" className={inputClass} /></Field>
        <Field label="Stok"><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="100" className={inputClass} /></Field>
      </div>
      <button disabled={!valid}
        onClick={() => onCreate({ name: name.trim(), description: desc.trim(), normalPrice: Number(price), stock: Number(stock) })}
        className="w-full py-3 mt-1 rounded-xl font-bold text-sm text-white bg-gray-900 disabled:opacity-40 hover:bg-gray-700 transition-colors">
        Simpan Produk
      </button>
    </ModalShell>
  );
}

function CreateFlashSaleModal({ products, streams, onClose, onCreate }: {
  products: HostProduct[];
  streams: HostStream[];
  onClose: () => void;
  onCreate: (fs: Omit<HostFlashSale, "id">) => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [streamId, setStreamId] = useState(streams[0]?.id ?? 0);
  const [salePrice, setSalePrice] = useState("");
  const [saleStock, setSaleStock] = useState("");
  const [quota, setQuota] = useState("2");
  const [durationMin, setDurationMin] = useState("30");

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedStream = streams.find((s) => s.id === streamId);
  const valid = productId && streamId && Number(salePrice) > 0 && Number(saleStock) > 0 && Number(quota) > 0;

  return (
    <ModalShell title="Buat Flash Sale" onClose={onClose}>
      <Field label="Produk">
        <select value={productId} onChange={(e) => setProductId(Number(e.target.value))} className={inputClass}>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Siaran">
        <select value={streamId} onChange={(e) => setStreamId(Number(e.target.value))} className={inputClass}>
          {streams.filter((s) => s.status !== "ended").map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Harga Flash Sale (Rp)"><input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder={selectedProduct ? String(Math.round(selectedProduct.normalPrice * 0.7)) : "0"} className={inputClass} /></Field>
        <Field label="Stok Flash Sale"><input type="number" value={saleStock} onChange={(e) => setSaleStock(e.target.value)} placeholder="50" className={inputClass} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Maks/User"><input type="number" value={quota} onChange={(e) => setQuota(e.target.value)} className={inputClass} /></Field>
        <Field label="Durasi (menit)"><input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className={inputClass} /></Field>
      </div>
      <button disabled={!valid}
        onClick={() => {
          const start = new Date();
          const end = new Date(start.getTime() + Number(durationMin) * 60 * 1000);
          onCreate({
            productId, productName: selectedProduct?.name ?? "",
            streamId, streamTitle: selectedStream?.title ?? "",
            salePrice: Number(salePrice), saleStock: Number(saleStock),
            quotaPerUser: Number(quota),
            startTime: start.toISOString(), endTime: end.toISOString(),
            status: "active",
          });
        }}
        className="w-full py-3 mt-1 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-colors"
        style={{ background: valid ? "linear-gradient(135deg,#F97316,#EF4444)" : undefined, backgroundColor: valid ? undefined : "#9CA3AF" }}>
        Aktifkan Flash Sale
      </button>
    </ModalShell>
  );
}
