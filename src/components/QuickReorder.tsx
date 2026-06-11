import { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { Product, User, Order } from '../types';
import { RotateCcw, Check, Plus, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface QuickReorderProps {
  user: User;
  availableProducts: Product[];
  onAddBatch: (items: { product: Product; quantity: number }[]) => void;
  onAddSingle: (product: Product) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface ReorderItem {
  product: Product;
  quantity: number;
  timesPurchased: number;
}

export default function QuickReorder({
  user,
  availableProducts,
  onAddBatch,
  onAddSingle,
  showToast
}: QuickReorderProps) {
  const [loading, setLoading] = useState(true);
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([]);
  const [successAnim, setSuccessAnim] = useState(false);

  useEffect(() => {
    async function loadReorderData() {
      if (!user?.id || availableProducts.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch up to all orders and get top 3
        const allUserOrders = await db.getOrders(user.id);
        
        // Take the 3 most recent orders
        const recentOrders = allUserOrders
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);

        if (recentOrders.length === 0) {
          setReorderItems([]);
          setLoading(false);
          return;
        }

        // Tally product IDs from the last 3 orders
        const tally: { [id: string]: { qtySum: number; appearances: number } } = {};
        
        recentOrders.forEach((order) => {
          if (Array.isArray(order.items)) {
            order.items.forEach((item) => {
              const pid = item.product?.id;
              if (pid) {
                if (!tally[pid]) {
                  tally[pid] = { qtySum: 0, appearances: 0 };
                }
                // We add the average bought quantity or the maximum bought quantity
                // Let's use the most representative quantity (e.g. max or last quantity, or sum divided by appearances)
                tally[pid].qtySum += item.quantity;
                tally[pid].appearances += 1;
              }
            });
          }
        });

        // Now map back to contemporary active products in catalog to ensure fresh price/stock
        const calculatedItems: ReorderItem[] = [];
        
        Object.keys(tally).forEach((pid) => {
          const freshProd = availableProducts.find((p) => p.id === pid);
          if (freshProd) {
            const stats = tally[pid];
            // Safe quantity to reorder: average rounded or at least 1, up to current stock
            const averageQty = Math.max(1, Math.round(stats.qtySum / stats.appearances));
            const reorderQty = Math.min(averageQty, freshProd.stock);

            calculatedItems.push({
              product: freshProd,
              quantity: reorderQty,
              timesPurchased: stats.appearances
            });
          }
        });

        // Sort: first by timesPurchased (most frequent first), then by stock (available first)
        calculatedItems.sort((a, b) => {
          if (b.timesPurchased !== a.timesPurchased) {
            return b.timesPurchased - a.timesPurchased;
          }
          return (b.product.stock > 0 ? 1 : 0) - (a.product.stock > 0 ? 1 : 0);
        });

        setReorderItems(calculatedItems);
      } catch (error) {
        console.error('Error calculating QuickReorder items:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReorderData();
  }, [user?.id, availableProducts]);

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 flex items-center justify-center gap-3 animate-pulse">
        <RotateCcw className="animate-spin text-emerald-600" size={18} />
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider font-sans">
          Mapeando sua despensa recorrente...
        </span>
      </div>
    );
  }

  // If no reordered items are found, we don't display anything to avoid filling space unnecessarily
  if (reorderItems.length === 0) {
    return null;
  }

  // Filter in-stock items
  const inStockItems = reorderItems.filter(item => item.product.stock > 0);

  const handleAddAll = () => {
    if (inStockItems.length === 0) {
      if (showToast) {
        showToast('Nenhum item da sua dispensa está em estoque no momento.', 'error');
      }
      return;
    }

    // Convert to target cart structure
    const itemsToAdd = inStockItems.map(item => ({
      product: item.product,
      quantity: item.quantity
    }));

    onAddBatch(itemsToAdd);
    
    setSuccessAnim(true);
    setTimeout(() => setSuccessAnim(false), 2000);

    if (showToast) {
      showToast(`${inStockItems.length} itens re-adicionados ao seu carrinho com sucesso!`, 'success');
    }
  };

  return (
    <div id="quick-reorder-container" className="bg-emerald-50/40 border border-emerald-150/70 p-5 rounded-2xl shadow-3xs space-y-4">
      {/* Container Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛒</span>
            <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider flex items-center gap-1.5">
              Refazer Compra Favorita
              <span className="text-[9px] px-2 py-0.5 bg-emerald-600 text-white rounded-full font-black animate-pulse font-sans">
                Dispensa Inteligente
              </span>
            </h3>
          </div>
          <p className="text-[11px] text-gray-500 font-medium">
            Mapeamos os itens recorrentes de suas últimas 3 compras. Reabasteça sua casa com um clique!
          </p>
        </div>

        {inStockItems.length > 0 && (
          <button
            onClick={handleAddAll}
            className={`px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
              successAnim
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {successAnim ? (
              <>
                <Check size={14} className="animate-bounce" />
                Dispensa Adicionada!
              </>
            ) : (
              <>
                <ShoppingBag size={14} />
                Adicionar Tudo ({inStockItems.length} itens)
              </>
            )}
          </button>
        )}
      </div>

      {/* Horizontal snap-scrolling list of recurrent items */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 no-scrollbar snap-x">
        {reorderItems.map((item) => {
          const fresh = item.product;
          const isOut = fresh.stock <= 0;
          const currentPrice = fresh.isPromo && fresh.promoPrice ? fresh.promoPrice : fresh.price;

          return (
            <div
              key={fresh.id}
              className={`flex-none w-[190px] bg-white border border-slate-150 rounded-xl p-3.5 relative flex flex-col justify-between shrink-0 snap-align-start transition-all ${
                isOut ? 'opacity-65 grayscale bg-slate-50/50' : 'hover:shadow-3xs hover:-translate-y-0.5'
              }`}
            >
              {/* Recurrence Indicator badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-yellow-50 text-yellow-800 border border-yellow-200/60 px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wide">
                <Sparkles size={8} />
                {item.timesPurchased}x comprado
              </div>

              {/* Product Image and Availability Badge */}
              <div className="relative w-full h-20 flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden mt-3 mb-2 shrink-0">
                <img
                  src={fresh.image}
                  alt={fresh.name}
                  className="max-h-full max-w-full object-contain mix-blend-multiply"
                  referrerPolicy="no-referrer"
                />
                {isOut ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-[9px] bg-red-650 text-white font-black uppercase px-2 py-0.5 rounded-md font-sans">
                      Sem Estoque
                    </span>
                  </div>
                ) : (
                  fresh.isPromo && (
                    <div className="absolute right-0 bottom-0 bg-rose-600 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-tl-lg font-mono">
                      Oferta
                    </div>
                  )
                )}
              </div>

              {/* Metadata content */}
              <div className="space-y-1 mb-2.5 flex-1 min-w-0">
                <span className="text-[10px] text-emerald-700 font-extrabold uppercase font-sans tracking-wide">
                  {fresh.category}
                </span>
                <span className="text-xs font-bold text-slate-800 block truncate leading-tight font-sans">
                  {fresh.name}
                </span>
                <span className="text-[10px] text-slate-450 block font-medium">
                  Ref: {item.quantity} {fresh.unit} por pedido
                </span>
              </div>

              {/* Price & Action button footer */}
              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 shrink-0">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold block leading-none">Preço Atual</span>
                  <span className="text-[13px] font-black text-slate-900 font-mono">
                    R$ {currentPrice.toFixed(2)}
                  </span>
                </div>

                {!isOut ? (
                  <button
                    onClick={() => {
                      onAddSingle(fresh);
                      if (showToast) {
                        showToast(`"${fresh.name}" adicionado ao carrinho!`, 'success');
                      }
                    }}
                    title={`Adicionar ${fresh.name} ao carrinho`}
                    className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white transition-colors cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                  >
                    <Plus size={14} />
                  </button>
                ) : (
                  <div title="Item indisponível temporariamente" className="w-7 h-7 flex items-center justify-center text-slate-400">
                    <AlertCircle size={14} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
