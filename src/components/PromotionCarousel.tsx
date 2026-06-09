import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Percent, Truck, Award, Calendar } from 'lucide-react';

interface PromoBanner {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  bgGradient: string;
  actionText: string;
  categoryTrigger?: string;
}

interface PromotionCarouselProps {
  onSelectCategory: (category: string) => void;
  onSelectPromoOnly: (promoOnly: boolean) => void;
  pointsActive: boolean;
}

export default function PromotionCarousel({ onSelectCategory, onSelectPromoOnly, pointsActive }: PromotionCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const banners: PromoBanner[] = [
    {
      id: 1,
      title: "Super Terça e Quarta do Hortifrúti",
      subtitle: "Até 35% de desconto direto do produtor",
      badge: "Sacolão do Favorito",
      description: pointsActive 
        ? "Frutas, legumes e verduras fresquinhas com o menor preço e pontos em dobro no nosso programa de fidelidade!"
        : "Frutas, legumes e verduras fresquinhas com o menor preço e qualidade garantida diretamente na sua mesa!",
      icon: <Percent size={40} className="text-amber-300" />,
      bgGradient: "from-emerald-900 via-emerald-800 to-green-700",
      actionText: "Ver Hortifrúti",
      categoryTrigger: "Hortifrúti"
    },
    {
      id: 2,
      title: "Taxa de Entrega Grátis",
      subtitle: "Para compras acima de R$ 150,00",
      badge: "Frete Grátis",
      description: "Compre no conforto do seu lar! Calcule a taxa pelo seu CEP e aproveite frete grátis em compras selecionadas.",
      icon: <Truck size={40} className="text-rose-300" />,
      bgGradient: "from-rose-900 via-red-800 to-rose-700",
      actionText: "Explorar Produtos",
      categoryTrigger: "Todos"
    },
    pointsActive ? {
      id: 3,
      title: "Clube de Vantagens O Favorito",
      subtitle: "Acumule pontos em cada compra!",
      badge: "Fidelidade Integrada",
      description: "Cada produto pontua na sua carteira. Resgate seus pontos acumulados como descontos reais de até R$ 50 no caixa!",
      icon: <Award size={40} className="text-yellow-300" />,
      bgGradient: "from-emerald-950 via-teal-900 to-emerald-800",
      actionText: "Cadastre-se Já",
      categoryTrigger: "Todos"
    } : {
      id: 3,
      title: "Atendimento Rápido pelo WhatsApp",
      subtitle: "Fale diretamente com nossa equipe",
      badge: "Suporte Imediato",
      description: "Tire dúvidas sobre produtos, faça encomendas especiais ou solicite suporte imediato à nossa equipe de atendimento!",
      icon: <Award size={40} className="text-emerald-300" />,
      bgGradient: "from-emerald-950 via-slate-900 to-emerald-800",
      actionText: "Falar Conosco",
      categoryTrigger: "Todos"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handleAction = (banner: PromoBanner) => {
    if (banner.categoryTrigger) {
      if (banner.id === 1) {
        onSelectCategory("Hortifrúti");
        onSelectPromoOnly(true);
      } else {
        onSelectCategory(banner.categoryTrigger);
        onSelectPromoOnly(false);
      }
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-lg border border-gray-100" id="promotion-carousel">
      {/* Banner Items */}
      <div 
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`w-full shrink-0 bg-gradient-to-r ${banner.bgGradient} p-6 md:p-10 text-white min-h-[220px] md:min-h-[260px] flex flex-col md:flex-row justify-between items-center gap-6 relative`}
          >
            {/* Background design elements */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12 shrink-0">
              {banner.icon}
            </div>

            <div className="space-y-3 z-10 flex-1">
              <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Calendar size={12} />
                <span>{banner.badge}</span>
              </div>
              
              <div className="space-y-1">
                <h2 className="text-xl md:text-3xl font-extrabold tracking-tight">{banner.title}</h2>
                <p className="text-sm md:text-lg text-emerald-100 font-medium">{banner.subtitle}</p>
              </div>

              <p className="text-xs md:text-sm text-white/80 max-w-xl leading-relaxed">
                {banner.description}
              </p>

              <div>
                <button
                  onClick={() => handleAction(banner)}
                  className="mt-2 bg-white hover:bg-emerald-50 text-emerald-800 hover:scale-105 transition-all text-xs font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {banner.actionText}
                </button>
              </div>
            </div>

            <div className="shrink-0 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 md:mr-6 hidden md:block">
              {banner.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer z-20"
        aria-label="Promoção anterior"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer z-20"
        aria-label="Próxima promoção"
      >
        <ChevronRight size={18} />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 flex gap-2 z-20">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
              idx === currentIndex ? 'bg-white w-6' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
