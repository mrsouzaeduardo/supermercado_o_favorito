import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PromotionCarousel from './components/PromotionCarousel';
import ProductCard from './components/ProductCard';
import CheckoutModal from './components/CheckoutModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import OrderTracker from './components/OrderTracker';
import AdminPanel from './components/AdminPanel';
import TermsModal from './components/TermsModal';
import { db } from './lib/supabase';
import { Product, CartItem, User, Order } from './types';
import { CATEGORIES } from './data/mockProducts';
import { Award, ShoppingCart, ShieldAlert, Sparkles, AlertCircle, Database, Instagram, MessageCircle, Search, MapPin, Phone, Clock } from 'lucide-react';

export default function App() {
  // DB Products catalog
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [promoOnly, setPromoOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Shopping Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Authenticated User
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // Toggles for different views
  const [isAdminActive, setIsAdminActive] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem('O_FAVORITO_ADMIN_LOGGED');
    } catch {
      return false;
    }
  });
  const [isOrderTrackerActive, setIsOrderTrackerActive] = useState(false);

  // Last order submitted (automatically loaded to OrderTracker)
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Management controls for client loyalty points system
  const [pointsActive, setPointsActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('O_FAVORITO_POINTS_ACTIVE');
    return saved !== 'false'; // default is true
  });

  const [pointsValue, setPointsValue] = useState<number>(() => {
    const saved = localStorage.getItem('O_FAVORITO_POINTS_VALUE');
    return saved ? parseFloat(saved) : 0.10; // default to 0.10 (meaning 1 point = R$ 0.10)
  });

  const [pointsDiscountType, setPointsDiscountType] = useState<'total' | 'delivery'>(() => {
    const saved = localStorage.getItem('O_FAVORITO_POINTS_DISCOUNT_TYPE');
    return saved === 'delivery' ? 'delivery' : 'total'; // default to total
  });

  // Initialize and load persistent data
  useEffect(() => {
    loadProducts();

    // Load active cart from localStorage if present
    const savedCart = localStorage.getItem('O_FAVORITO_CART');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse saved cart:', e);
      }
    }

    // Load persistent logged user
    const savedUser = localStorage.getItem('O_FAVORITO_LOGGED_USER');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }
  }, []);

  // Save cart to localstorage whenever it changes
  useEffect(() => {
    localStorage.setItem('O_FAVORITO_CART', JSON.stringify(cartItems));
  }, [cartItems]);

  // Synchronize cart item quantities and product state with updated stock levels
  useEffect(() => {
    if (products.length === 0 || cartItems.length === 0) return;
    
    let changed = false;
    const updatedCart = cartItems.map((item) => {
      const currentProduct = products.find((p) => p.id === item.product.id);
      if (currentProduct) {
        const newQty = Math.min(item.quantity, currentProduct.stock);
        if (
          newQty !== item.quantity ||
          item.product.stock !== currentProduct.stock ||
          item.product.price !== currentProduct.price ||
          item.product.promoPrice !== currentProduct.promoPrice ||
          item.product.isPromo !== currentProduct.isPromo
        ) {
          changed = true;
          return {
            ...item,
            product: currentProduct,
            quantity: newQty
          };
        }
      }
      return item;
    }).filter((item) => {
      const currentProduct = products.find((p) => p.id === item.product.id);
      if (!currentProduct || currentProduct.stock <= 0) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      setCartItems(updatedCart);
    }
  }, [products]);

  const loadProducts = async () => {
    const data = await db.getProducts();
    setProducts(data);
  };

  // Helper to sync user points after order/actions
  const handleRefreshUserPoints = async () => {
    if (!user) return;
    try {
      const usersList = JSON.parse(localStorage.getItem('O_FAVORITO_DB_users') || '[]');
      const activeData = usersList.find((u: User) => u.id === user.id);
      if (activeData) {
        setUser(activeData);
        localStorage.setItem('O_FAVORITO_LOGGED_USER', JSON.stringify(activeData));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === product.id);
      if (existing) {
        // Cap quantity to stock limit
        if (existing.quantity >= product.stock) return prevItems;
        return prevItems.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prevItems.map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevItems.filter((item) => item.product.id !== productId);
    });
  };

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((item) => {
          if (item.product.id === productId) {
            const capped = Math.min(quantity, item.product.stock);
            return { ...item, quantity: capped };
          }
          return item;
        })
      );
    }
  };

  const handleClearCart = () => {
    setCartItems([]);
    localStorage.removeItem('O_FAVORITO_CART');
  };

  // Authentication operations
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('O_FAVORITO_LOGGED_USER', JSON.stringify(loggedInUser));
    setIsAdminActive(false);
    setIsAdminAuthorized(false);
    sessionStorage.removeItem('O_FAVORITO_ADMIN_LOGGED');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('O_FAVORITO_LOGGED_USER');
    setLastPlacedOrder(null);
    isOrderTrackerActive && setIsOrderTrackerActive(false);
  };

  // Filter products catalog
  const filteredProducts = products.filter((p) => {
    const hasStock = p.stock > 0;
    const matchCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchPromo = !promoOnly || p.isPromo;
    const matchSearch =
      !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    return hasStock && matchCategory && matchPromo && matchSearch;
  });

  const categoryEmojis: { [key: string]: string } = {
    'Todos': '🛒',
    'Açougue': '🥩',
    'Bebês': '👶',
    'Bebidas': '🥤',
    'Carvões': '🔥',
    'Chocolates e Balas': '🍬',
    'Descartáveis': '🍽️',
    'Gelos': '🧊',
    'Higiene': '🧼',
    'Hortifrúti': '🍎',
    'Laticínios': '🧀',
    'Limpeza': '🧹',
    'Mercearia': '🍚',
    'Padaria': '🥖',
    'Ração': '🐾',
    'Salgadinhos': '🍿',
    'Sorvetes': '🍦',
    'Utilidades': '🛠️',
    'Papelaria': '✏️',
    'Frios e Congelados': '❄️'
  };

  return (
    <div className="min-h-screen bg-[#f0f9f0] flex flex-col text-slate-800 relative font-sans overflow-x-hidden selection:bg-green-200" id="main-applet">
      {/* Mesh Background Accent Blobs for Frosted Glass Theme */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-200/50 blur-[110px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[60%] rounded-full bg-yellow-105/45 blur-[90px]" />
        <div className="absolute top-[40%] right-[15%] w-[35%] h-[35%] rounded-full bg-emerald-100/30 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header/Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onLoginTrigger={() => setIsAuthOpen(true)}
        onEditProfileTrigger={() => setIsProfileOpen(true)}
        cartItems={cartItems}
        onOpenCartCheckout={() => setIsCheckoutOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          // Auto route to catalog if searching
          if (isAdminActive) setIsAdminActive(false);
          if (isOrderTrackerActive) setIsOrderTrackerActive(false);
        }}
        onToggleAdmin={() => {
          if (user) return; // Forbid opening admin if logged in as client
          setIsAdminActive(!isAdminActive);
          setIsOrderTrackerActive(false);
        }}
        isAdminActive={isAdminActive}
        onViewOrderTracker={() => {
          setIsOrderTrackerActive(!isOrderTrackerActive);
          setIsAdminActive(false);
        }}
        isOrderTrackerActive={isOrderTrackerActive}
        pointsActive={pointsActive}
        isAdminAuthorized={isAdminAuthorized}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 sm:pb-6 space-y-6 sm:space-y-8">
        
        {/* VIEW 1: ADMIN PANEL */}
        {isAdminActive && !user ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 leading-none">
                <AlertCircle size={14} />
                Ambiente Administrativo: simule pedidos, mude o andamento das entregas e crie novos produtos do Favorito!
              </span>
              <button
                onClick={() => setIsAdminActive(false)}
                className="text-[10.5px] font-bold text-amber-900 underline hover:no-underline cursor-pointer"
              >
                Voltar à Loja
              </button>
            </div>
             <AdminPanel 
              productsList={products} 
              onRefreshProducts={loadProducts} 
              pointsActive={pointsActive}
              onTogglePointsActive={(val) => {
                setPointsActive(val);
                localStorage.setItem('O_FAVORITO_POINTS_ACTIVE', String(val));
              }}
              pointsValue={pointsValue}
              onUpdatePointsValue={(val) => {
                setPointsValue(val);
                localStorage.setItem('O_FAVORITO_POINTS_VALUE', String(val));
              }}
              pointsDiscountType={pointsDiscountType}
              onUpdatePointsDiscountType={(val) => {
                setPointsDiscountType(val);
                localStorage.setItem('O_FAVORITO_POINTS_DISCOUNT_TYPE', val);
              }}
              onAdminAuthChange={setIsAdminAuthorized}
            />
          </div>
        ) 
        
        // VIEW 2: ORDER TRACKER PANEL
        : isOrderTrackerActive ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-150">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 leading-none">
                <Sparkles size={14} className="animate-spin text-emerald-600" />
                Módulo do Cliente: consulte o histórico ou mude o status no Painel de Gerente para ver ele andar!
              </span>
              <button
                onClick={() => setIsOrderTrackerActive(false)}
                className="text-[10.5px] font-bold text-emerald-900 underline hover:no-underline cursor-pointer"
              >
                Voltar às Compras
              </button>
            </div>
            <OrderTracker user={user} activeOrder={lastPlacedOrder} pointsActive={pointsActive} />
          </div>
        ) 
        
        // VIEW 3: STOREFRONT AND PRODUCTS CATALOG
        : (
          <div className="space-y-8 animate-fadeIn">
            {/* Promotion slide carousel banners */}
            <PromotionCarousel 
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                const el = document.getElementById('catalog-anchoring');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onSelectPromoOnly={(promoVal) => setPromoOnly(promoVal)}
              pointsActive={pointsActive}
            />

            {/* Shopping Catalog Section */}
            <div className="space-y-6 pt-2" id="catalog-anchoring">
              
              {/* Category selector & Filter Switches */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:border-b md:border-gray-150/40 md:pb-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-950 font-display">Corredores do Supermercado</h2>
                    <p className="text-xs text-slate-500 font-medium font-sans">Selecione uma categoria para filtrar as prateleiras</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Live search input */}
                    <div className="relative flex-1 sm:min-w-[270px]">
                      <input
                        type="text"
                        placeholder="Busque por nome do item..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 bg-white border border-green-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-green-500/25 text-xs text-gray-800 transition-all font-semibold shadow-inner"
                        id="catalog-search-input"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/60 font-bold">
                        <Search size={14} />
                      </div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 text-xs font-bold font-sans transition-colors cursor-pointer"
                          title="Limpar busca"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Promotion Only quick switch button */}
                    <button
                      onClick={() => setPromoOnly(!promoOnly)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                        promoOnly
                          ? 'bg-rose-500/20 text-rose-700 border-rose-300 shadow-xs backdrop-blur-xs animate-pulse'
                          : 'bg-white/50 hover:bg-white text-slate-600 hover:text-slate-800 border-green-200/80 hover:border-green-300'
                      }`}
                    >
                      <span className="text-xs">🔥</span>
                      <span>Apenas Ofertas Semanais</span>
                    </button>
                  </div>
                </div>

                {/* Categories Tab buttons list */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        // reset search term slightly for neat navigation
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-300 shrink-0 cursor-pointer flex items-center gap-2 border ${
                        selectedCategory === cat
                          ? 'bg-green-600 text-white border-green-650 shadow-lg scale-[1.02]'
                          : 'bg-white/40 hover:bg-white/75 text-slate-700 border-white/50 hover:border-white/90 backdrop-blur-md'
                      }`}
                      id={`category-btn-${cat.toLowerCase().replace('/', '-')}`}
                    >
                      <span className="text-sm">{categoryEmojis[cat] || '📦'}</span>
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product catalog cards grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 max-w-sm mx-auto space-y-3">
                  <span className="text-4xl text-gray-300 block">🥬</span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-800">Nenhum produto foi localizado</h3>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                      Não encontramos itens correspondentes aos filtros selecionados. Clique abaixo para redefinir o corredor.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('Todos');
                      setPromoOnly(false);
                      setSearchTerm('');
                    }}
                    className="mt-3 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Limpar Todos os Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {filteredProducts.map((p) => {
                    const existingItem = cartItems.find((itm) => itm.product.id === p.id);
                    const qty = existingItem ? existingItem.quantity : 0;
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        cartQuantity={qty}
                        onAdd={handleAddToCart}
                        onRemove={handleRemoveFromCart}
                        pointsActive={pointsActive}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Mobile Cart Summary bar */}
      {cartItems.length > 0 && !isCheckoutOpen && !isAdminActive && !isOrderTrackerActive && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-30 animate-slideUp">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-rose-600/90 backdrop-blur-md text-white flex justify-between items-center p-3.5 rounded-2xl shadow-xl shadow-rose-900/10 border border-white/30 font-bold text-xs"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <span>{cartItems.reduce((acc, current) => acc + current.quantity, 0)} itens</span>
            </div>
            <span>Finalizar Compras • R$ {cartItems.reduce((acc, current) => {
              const price = current.product.isPromo && current.product.promoPrice ? current.product.promoPrice : current.product.price;
              return acc + price * current.quantity;
            }, 0).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {/* Premium Footer with credit and information details */}
      <footer className="bg-emerald-950/95 backdrop-blur-md text-emerald-300 py-12 mt-12 border-t border-white/10 font-medium text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Col 1: About */}
            <div className="space-y-3">
              <h4 className="text-white font-extrabold text-xs tracking-widest uppercase">Clube O Favorito</h4>
              <p className="text-xs text-emerald-400 font-semibold leading-relaxed">
                O seu supermercado favorito de verduras, hortifrúti, padaria e carnes de alta qualidade com um sistema completo de entregas rápidas na sua porta.
              </p>
            </div>

            {/* Col 2: Endereço */}
            <div className="space-y-3">
              <h4 className="text-white font-extrabold text-xs tracking-widest uppercase flex items-center gap-1.5">
                <MapPin size={16} className="text-emerald-400" /> Endereço
              </h4>
              <div className="text-xs text-emerald-400 space-y-1 font-semibold">
                <p className="text-white text-sm font-black">Av. Etelvino Souza Lima, 3335 Conjugal</p>
                <p>Palmital São Benedito</p>
                <p>Santa Luzia - MG</p>
              </div>
            </div>

            {/* Col 3: Contatos e Horário */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-white font-extrabold text-xs tracking-widest uppercase flex items-center gap-1.5">
                  <Phone size={15} className="text-emerald-400" /> Telefones
                </h4>
                <p className="text-xs text-emerald-400 font-semibold">
                  Telefone 1: <span className="text-white font-black">(31) 3635-9495</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-white font-extrabold text-xs tracking-widest uppercase flex items-center gap-1.5">
                  <Clock size={15} className="text-emerald-400" /> Funcionamento
                </h4>
                <div className="text-xs text-emerald-400 font-semibold space-y-0.5">
                  <p className="text-white font-black">Domingo a Domingo</p>
                  <p>10h às 21:30</p>
                </div>
              </div>
            </div>

            {/* Col 4: Redes e Rastreamento */}
            <div className="space-y-3">
              <h4 className="text-white font-extrabold text-xs tracking-widest uppercase">Canais e Suporte</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {/* WhatsApp Social Icon */}
                  <a
                    href="https://wa.me/553136359495"
                    target="_blank"
                    rel="noreferrer"
                    className="group p-2.5 bg-emerald-900 hover:bg-emerald-800 rounded-xl transition-all flex items-center justify-center border border-emerald-800 hover:border-emerald-700"
                    title="Fale conosco no WhatsApp"
                  >
                    <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                      <MessageCircle size={16} className="text-emerald-300 group-hover:text-white transition-colors" />
                      <Phone size={7} className="absolute text-emerald-300 group-hover:text-white fill-emerald-300 group-hover:fill-white rotate-45 transition-colors" />
                    </div>
                  </a>

                  {/* Instagram Social Icon */}
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-xl transition-all flex items-center justify-center border border-emerald-800 hover:border-emerald-700"
                    title="Siga-nos no Instagram"
                  >
                    <Instagram size={16} className="text-emerald-300 hover:text-green-300" />
                  </a>
                </div>

                <button
                  onClick={() => {
                    setIsOrderTrackerActive(true);
                    setIsAdminActive(false);
                    const el = document.getElementById('store-header');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-center text-xs bg-emerald-800 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl transition-all font-bold cursor-pointer"
                >
                  Acompanhar Entregas Rastreio
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-emerald-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-emerald-500">
            <span>© 2026 Supermercado O Favorito Ltda. Todos os direitos reservados.</span>
            <div className="text-emerald-400 font-bold bg-white/5 py-1 px-3 rounded-full border border-white/5">
              Desenvolvido por <span className="text-white hover:text-green-300 transition-colors">Vitta Systems</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsTermsOpen(true)}
                className="hover:text-emerald-300 cursor-pointer bg-transparent border-none p-0 font-semibold focus:outline-hidden text-xs"
              >
                Termos de Uso
              </button>
              <span className="hover:text-emerald-300 cursor-pointer">Segurança dos Dados</span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL CONTROLS */}
      
      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        user={user}
        onLoginTrigger={() => {
          setIsCheckoutOpen(false);
          setIsAuthOpen(true);
        }}
        onOrderSuccess={(placedOrder) => {
          setLastPlacedOrder(placedOrder);
          // Auto route client to order tracker to monitor details!
          setIsOrderTrackerActive(true);
          setIsAdminActive(false);
          handleRefreshUserPoints();
          loadProducts(); // Sync updated stocks with frontend state
          const el = document.getElementById('store-header');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        onUpdateCartQty={handleUpdateCartQty}
        onClearCart={handleClearCart}
        pointsActive={pointsActive}
        pointsValue={pointsValue}
        pointsDiscountType={pointsDiscountType}
        onEditProfileTrigger={() => setIsProfileOpen(true)}
      />

      {/* Auth Login Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        pointsActive={pointsActive}
        onOpenTerms={() => setIsTermsOpen(true)}
      />

      {/* Terms of Use Modal */}
      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateSuccess={(updatedUser) => {
          setUser(updatedUser);
          localStorage.setItem('O_FAVORITO_LOGGED_USER', JSON.stringify(updatedUser));
        }}
        onLogout={handleLogout}
      />

      </div>
    </div>
  );
}
