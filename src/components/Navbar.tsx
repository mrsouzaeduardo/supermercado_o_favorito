import { Search, ShoppingCart, User as UserIcon, Star, LogOut, Settings, Award, Database } from 'lucide-react';
import { User, CartItem } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onLoginTrigger: () => void;
  cartItems: CartItem[];
  onOpenCartCheckout: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onToggleAdmin: () => void;
  isAdminActive: boolean;
  onViewOrderTracker: () => void;
  isOrderTrackerActive: boolean;
  pointsActive: boolean;
}

export default function Navbar({
  user,
  onLogout,
  onLoginTrigger,
  cartItems,
  onOpenCartCheckout,
  searchTerm,
  onSearchChange,
  onToggleAdmin,
  isAdminActive,
  onViewOrderTracker,
  isOrderTrackerActive,
  pointsActive,
}: NavbarProps) {
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => {
    const price = item.product.promoPrice && item.product.isPromo ? item.product.promoPrice : item.product.price;
    return acc + price * item.quantity;
  }, 0);

  return (
    <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-md border-b border-white/30" id="store-header">
      {/* Upper Small Notification Strip */}
      <div className="bg-emerald-900/90 backdrop-blur-xs text-white py-1.5 px-4 text-[10.5px] font-bold text-center flex justify-center items-center gap-4">
        <span className="leading-none text-center">⚠️ PROMOÇÕES SEMANAIS ATIVAS: Aproveite hortifrúti fresco e carnes selecionadas!</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand "O Favorito" */}
          <div className="flex items-center justify-between">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                onSearchChange('');
                if (isAdminActive) onToggleAdmin();
                if (isOrderTrackerActive) onViewOrderTracker();
              }}
              className="flex items-center gap-3 group cursor-pointer"
              id="brand-logo"
            >
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-600/20 font-display transition-transform group-hover:scale-105 duration-300">
                F
              </div>
              <div className="flex flex-col select-none relative pb-1">
                <span className="text-[10px] font-extrabold tracking-widest text-emerald-800/80 leading-none font-display">SUPERMERCADO</span>
                
                {/* Visual script representation of O Favorito with green and red swirl styling */}
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-rose-605 font-extrabold italic text-2xl leading-none">O</span>
                  <span className="text-emerald-850 font-black italic text-2xl tracking-tight leading-none relative group-hover:text-emerald-950 transition-colors">
                    Favorito
                    {/* Tiny Red sweep line below */}
                    <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-rose-600 rounded-full scale-100 group-hover:scale-105 transition-transform" />
                  </span>
                </div>
              </div>
            </a>

            {/* Quick mobile view helpers */}
            <div className="flex md:hidden items-center gap-3">
              <button 
                onClick={onOpenCartCheckout}
                className="relative p-2 text-emerald-800 hover:bg-white/40 rounded-full cursor-pointer transition-colors"
                aria-label="Carrinho de Compras"
              >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Nav Controls */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 justify-center md:justify-end">
                  {/* View Order Tracker button */}
            <button
               onClick={onViewOrderTracker}
               className={`px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 border ${
                isOrderTrackerActive
                  ? 'bg-green-600 text-white border-green-650 shadow-md scale-[1.01]'
                  : 'bg-white/40 hover:bg-white/80 text-emerald-800 border-white/50'
              }`}
              id="nav-order-tracker-btn"
            >
              <span>🚚</span>
              <span>Rastrear Pedido</span>
            </button>

            {/* Admin control button */}
            <button
              onClick={onToggleAdmin}
              className={`px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 border ${
                isAdminActive
                  ? 'bg-amber-600 text-white border-amber-650 shadow-sm'
                  : 'bg-white/20 hover:bg-white/60 text-slate-700 border-white/30'
              }`}
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Gerência</span>
              <span className="sm:hidden">Painel</span>
            </button>

            {/* User Login/Account with Loyalty stars */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2" id="user-navbar-info">
                {/* Loyalty Balance badge */}
                {pointsActive && (
                  <div 
                    className="bg-yellow-400/10 text-yellow-900/90 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-yellow-400/30 text-[10px] sm:text-xs font-bold flex items-center gap-0.5 sm:gap-1 shadow-3xs"
                    title="Seu saldo de pontos no Clube Fidelidade"
                  >
                    <Star size={13} className="fill-yellow-500 text-yellow-500 shrink-0" />
                    <span>⭐ <strong>{user.points}</strong> pts</span>
                  </div>
                )}

                <div className="text-right hidden xl:block">
                  <span className="text-[10px] text-emerald-800/65 block font-bold leading-none">Olá,</span>
                  <span className="text-xs font-bold text-gray-800 block truncate max-w-[90px]">{user.name}</span>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-full transition-all cursor-pointer"
                  title="Sair da Conta"
                  id="logout-navbar-btn"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginTrigger}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 hover:bg-white bg-white/50 text-emerald-850 border border-white/50 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-3xs hover:border-green-300"
                id="login-navbar-btn"
              >
                <UserIcon size={13} />
                <span>Entrar / Cadastrar</span>
              </button>
            )}

            {/* Sticky Cart on Desktop */}
            <button
              onClick={onOpenCartCheckout}
              disabled={cartCount === 0}
              className="hidden md:flex items-center gap-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200/50 disabled:cursor-not-allowed disabled:text-gray-400 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-lg shadow-green-600/10 transition-all cursor-pointer select-none"
              id="navbar-cart-button"
            >
              <div className="relative">
                <ShoppingCart size={16} />
                {cartCount > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-white text-rose-600 text-[9px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center border border-rose-500">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="font-extrabold">
                {cartCount === 0 ? 'Carrinho Vazio' : `R$ ${cartSubtotal.toFixed(2).replace('.', ',')}`}
              </span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
