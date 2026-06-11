import React from 'react';
import { Product } from '../types';
import { Plus, Minus, Star, Percent } from 'lucide-react';

interface ProductCardProps {
  key?: any;
  product: Product;
  cartQuantity: number;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  userPointsEarned?: boolean;
  pointsActive?: boolean;
  campaign?: {
    id: string;
    name: string;
    discountPercent?: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'scheduled' | 'expired';
  };
}

export default function ProductCard({ product, cartQuantity, onAdd, onRemove, pointsActive = true, campaign }: ProductCardProps) {
  const displayPrice = product.promoPrice && product.isPromo ? product.promoPrice : product.price;
  const originalPrice = product.price;
  const hasPromo = product.isPromo && product.promoPrice;
  const discountPercent = hasPromo ? Math.round(((originalPrice - (product.promoPrice || 0)) / originalPrice) * 100) : 0;

  const [scarcityText, setScarcityText] = React.useState('');
  const [isUrgent, setIsUrgent] = React.useState(false);

  React.useEffect(() => {
    if (!campaign) return;

    const updateTimer = () => {
      try {
        const end = new Date(campaign.endDate + 'T23:59:59');
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();

        if (diffMs <= 0) {
          setScarcityText("Promoção expirada");
          setIsUrgent(false);
          return;
        }

        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = Math.ceil(diffHours / 24);

        if (diffHours <= 24) {
          const h = Math.floor(diffHours);
          const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setScarcityText(`Últimas ${h}h ${m}m!`);
          setIsUrgent(true);
        } else if (diffDays <= 2) {
          const dayString = diffDays === 1 ? 'Amanhã' : '2 dias';
          setScarcityText(`Acaba em ${dayString}!`);
          setIsUrgent(true);
        } else {
          const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          const endDayName = daysOfWeek[end.getDay()];
          setScarcityText(`Válido até ${endDayName}!`);
          setIsUrgent(false);
        }
      } catch (e) {
        setScarcityText('Tempo limitado!');
        setIsUrgent(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [campaign]);

  return (
    <div 
      className="bg-white/45 backdrop-blur-md rounded-2xl border border-white/40 shadow-xs hover:shadow-lg hover:shadow-green-950/5 transition-all flex flex-col justify-between overflow-hidden group h-full hover:border-emerald-700/30 hover:-translate-y-0.5"
      id={`product-card-${product.id}`}
    >
      {/* Visual Product Image and tags */}
      <div className="relative pt-[75%] sm:pt-[70%] bg-gray-50 overflow-hidden shrink-0">
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback product background if photo doesn't load or is blocked
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
          }}
        />

        {/* Promotion Off Badge */}
        {hasPromo && (
          <div className="absolute top-2 left-2 bg-rose-600 text-white rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[11px] font-extrabold flex items-center gap-0.5 shadow-sm">
            <Percent size={10} />
            <span>{discountPercent}% OFF</span>
          </div>
        )}

        {/* Loyalty Points Badge */}
        {pointsActive && (
          <div className="absolute top-2 right-2 bg-emerald-700/90 text-white rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 backdrop-blur-xs min-h-[20px] sm:min-h-[22px] shadow-sm">
            <Star size={10} className="fill-yellow-300 text-yellow-300 shrink-0" />
            <span>+{product.pointsAwarded} pts</span>
          </div>
        )}

        {/* Dynamic Scarcity/Campaign bar */}
        {campaign && scarcityText && (
          <div 
            className={`absolute bottom-0 left-0 right-0 py-1.5 px-2.5 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider flex items-center justify-between text-white shadow-md transition-all duration-300 ${
              isUrgent 
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 animate-pulse' 
                : 'bg-slate-900/90 backdrop-blur-xs'
            }`}
          >
            <span className="flex items-center gap-0.5 max-w-[65%] truncate">
              <span className="animate-bounce">⚡</span> {campaign.name}
            </span>
            <span className="font-mono text-[8px] sm:text-[9px] font-black shrink-0 tracking-normal">
              {scarcityText}
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              {product.category}
            </span>
            {campaign && (
              <span className={`text-[8px] sm:text-[8.5px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                isUrgent 
                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-250/50'
              }`}>
                {isUrgent ? 'Corra!' : 'Oferta'}
              </span>
            )}
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-2 min-h-[36px] sm:min-h-[40px] group-hover:text-emerald-800 transition-colors">
            {product.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-400 line-clamp-2 leading-normal sm:leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Prices and unit */}
        <div className="pt-2 border-t border-gray-50 flex items-end justify-between gap-1">
          <div className="space-y-0.5 min-w-0">
            {hasPromo ? (
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-[10px] sm:text-xs text-gray-400 line-through truncate">
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
                <div className="text-base sm:text-lg font-black text-rose-600 leading-tight">
                  R$ {product.promoPrice?.toFixed(2).replace('.', ',')}
                </div>
              </div>
            ) : (
              <div className="text-base sm:text-lg font-black text-emerald-800 leading-tight">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </div>
            )}
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium block truncate">
              {product.unit} {product.stock <= 5 && product.stock > 0 && (
                <span className="text-rose-500 font-bold ml-1 block sm:inline">(Só {product.stock}!)</span>
              )}
              {product.stock === 0 && (
                <span className="text-gray-400 font-bold ml-1 block sm:inline">(Sem estoque)</span>
              )}
            </span>
          </div>

          {/* Action buttons */}
          <div className="shrink-0">
            {product.stock === 0 ? (
              <span className="px-2.5 py-1.5 bg-gray-100 text-gray-400 text-[10px] sm:text-xs font-bold rounded-xl block border border-gray-250 cursor-not-allowed">
                Esgotado
              </span>
            ) : cartQuantity === 0 ? (
              <button
                onClick={() => onAdd(product)}
                className="px-2.5 sm:px-3.5 py-1.5 bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95 text-white text-[10px] sm:text-xs font-bold rounded-xl transition-all flex items-center gap-0.5 sm:gap-1 shadow-sm shadow-green-600/10 cursor-pointer"
                id={`add-btn-${product.id}`}
              >
                <Plus size={13} />
                <span>Adicionar</span>
              </button>
            ) : (
              <div className="flex items-center bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden text-emerald-900 shadow-2xs">
                <button
                  onClick={() => onRemove(product.id)}
                  className="px-2 py-1.5 hover:bg-emerald-100/50 transition-colors text-emerald-700 font-bold cursor-pointer"
                  id={`remove-qty-${product.id}`}
                  aria-label="Remover um item"
                >
                  <Minus size={12} />
                </button>
                <span className="px-1.5 text-[11px] sm:text-xs font-extrabold" id={`qty-${product.id}`}>
                  {cartQuantity}
                </span>
                <button
                  onClick={() => {
                    if (cartQuantity < product.stock) {
                      onAdd(product);
                    }
                  }}
                  disabled={cartQuantity >= product.stock}
                  className="px-2 py-1.5 hover:bg-emerald-100/50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-emerald-700 font-bold cursor-pointer"
                  id={`add-qty-${product.id}`}
                  aria-label="Adicionar mais um item"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
