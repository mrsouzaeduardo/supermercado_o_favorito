import React, { useState, useEffect } from 'react';
import { X, Search, MapPin, CreditCard, ChevronRight, Check, Award, Truck, ShieldCheck, QrCode, Calendar, Clock } from 'lucide-react';
import { db } from '../lib/supabase';
import { CartItem, Order, User, DeliveryConfig, DeliverySlot } from '../types';

function formatWhatsAppNumber(value: string): string {
  const numbers = value.replace(/\D/g, '');
  const truncated = numbers.slice(0, 11);
  if (truncated.length <= 2) {
    return truncated;
  } else if (truncated.length <= 3) {
    return `${truncated.slice(0, 2)} ${truncated.slice(2)}`;
  } else if (truncated.length <= 7) {
    return `${truncated.slice(0, 2)} ${truncated.slice(2, 3)} ${truncated.slice(3)}`;
  } else {
    return `${truncated.slice(0, 2)} ${truncated.slice(2, 3)} ${truncated.slice(3, 7)}-${truncated.slice(7)}`;
  }
}

interface UpcomingDate {
  dateString: string;
  label: string;
  dayOfWeek: string;
  formattedDate: string;
}

function getUpcomingDates(): UpcomingDate[] {
  const dates: UpcomingDate[] = [];
  const ptDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const today = new Date();
  
  for (let i = 0; i < 5; i++) {
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + i);
    
    // Format YYYY-MM-DD
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    let label = '';
    if (i === 0) label = 'Hoje';
    else if (i === 1) label = 'Amanhã';
    else label = ptDays[futureDate.getDay()];
    
    dates.push({
      dateString: dateStr,
      label,
      dayOfWeek: ptDays[futureDate.getDay()],
      formattedDate: futureDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    });
  }
  return dates;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  user: User | null;
  onLoginTrigger: () => void;
  onOrderSuccess: (order: Order) => void;
  onUpdateCartQty: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  pointsActive: boolean;
  pointsValue?: number;
  pointsDiscountType?: 'total' | 'delivery';
  onEditProfileTrigger?: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  user,
  onLoginTrigger,
  onOrderSuccess,
  onUpdateCartQty,
  onClearCart,
  pointsActive,
  pointsValue = 0.10,
  pointsDiscountType = 'total',
  onEditProfileTrigger,
}: CheckoutModalProps) {
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'cash'>('pix');
  const [cashChange, setCashChange] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [addressSource, setAddressSource] = useState<'profile' | 'new'>('profile');

  const handleAddressSourceChange = (source: 'profile' | 'new') => {
    setAddressSource(source);
    if (source === 'profile' && user && user.neighborhood) {
      setCity((user.city || '').trim().toUpperCase());
      setNeighborhood((user.neighborhood || '').trim().toUpperCase());
      setAddress((user.streetNumber || '').trim().toUpperCase());
      setNumber('S/N');
      setCep('CADASTRO');
    } else {
      setCity('');
      setNeighborhood('');
      setAddress('');
      setNumber('');
      setCep('');
    }
  };

  // Delivery scheduling states
  const [deliveryType, setDeliveryType] = useState<'fast' | 'scheduled'>('fast');
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [slotUsage, setSlotUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      db.getDeliverySlots().then(retrievedSlots => {
        setSlots(retrievedSlots);
      });
      const dates = getUpcomingDates();
      if (dates.length > 0) {
        setSelectedDate(dates[0].dateString);
      }

      if (user && user.neighborhood) {
        setAddressSource('profile');
        setCity((user.city || '').trim().toUpperCase());
        setNeighborhood((user.neighborhood || '').trim().toUpperCase());
        setAddress((user.streetNumber || '').trim().toUpperCase());
        setNumber('S/N');
        setCep('CADASTRO');
      } else {
        setAddressSource('new');
        setCity('');
        setNeighborhood('');
        setAddress('');
        setNumber('');
        setCep('');
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      db.getSlotUsage(selectedDate).then(usage => {
        setSlotUsage(usage);
      });
    }
  }, [isOpen, selectedDate]);

  // Loaded delivery config
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(null);

  useEffect(() => {
    setDeliveryConfig(db.getDeliveryConfig());
  }, [isOpen]);

  // Subtotal calculation
  const subtotal = cartItems.reduce((acc, item) => {
    const price = item.product.promoPrice && item.product.isPromo ? item.product.promoPrice : item.product.price;
    return acc + price * item.quantity;
  }, 0);

  // Loyalty points available & value
  const maxRedeemablePoints = user ? Math.floor(user.points) : 0;
  const pointsWorth = maxRedeemablePoints * pointsValue;
  const pointsLimit = pointsDiscountType === 'delivery' ? deliveryFee : (subtotal + deliveryFee);
  const pointsDiscount = (pointsActive && usePoints) ? Math.min(pointsWorth, pointsLimit) : 0;
  const pointsToDeduct = (pointsActive && usePoints && pointsValue > 0) ? Math.ceil(pointsDiscount / pointsValue) : 0;

  // New points to earn on purchase (sum of all items pointsAwarded * qty)
  const pointsToEarn = pointsActive ? cartItems.reduce((acc, item) => acc + item.product.pointsAwarded * item.quantity, 0) : 0;

  // Filter slots based on the day of the week AND if the slot's start time hasn't passed today
  const displayedSlots = React.useMemo(() => {
    const selDateObj = getUpcomingDates().find(d => d.dateString === selectedDate);
    if (!selDateObj) return [];

    // Filter by day of the week
    let filtered = slots.filter(s => s.dayOfWeek.toLowerCase() === selDateObj.dayOfWeek.toLowerCase());

    // If selectedDate is today, filter out passed slots
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;

    if (selectedDate === todayDateStr) {
      const nowHour = today.getHours();
      const nowMinute = today.getMinutes();
      const currentMinutes = nowHour * 60 + nowMinute;

      filtered = filtered.filter(s => {
        if (!s.startTime) return false;
        const parts = s.startTime.split(':');
        const sh = parseInt(parts[0], 10) || 0;
        const sm = parseInt(parts[1], 10) || 0;
        const slotStartMinutes = sh * 60 + sm;

        // Slot start time must be in the future relative to now relative to the current day
        return slotStartMinutes > currentMinutes;
      });
    }

    return filtered;
  }, [slots, selectedDate]);

  // Delivery tax calculation
  useEffect(() => {
    if (!deliveryConfig) return;

    if (subtotal >= deliveryConfig.freeDeliveryThreshold) {
      setDeliveryFee(0);
      return;
    }

    if (neighborhood) {
      // Find fee matching neighborhood config
      const cleanNeighborhood = neighborhood.trim();
      const matchKey = Object.keys(deliveryConfig.neighborhoodFees).find(
        (key) => key.toLowerCase() === cleanNeighborhood.toLowerCase()
      );
      if (matchKey) {
        setDeliveryFee(deliveryConfig.neighborhoodFees[matchKey]);
        return;
      }
    }

    // Default fallback basic fee
    setDeliveryFee(deliveryConfig.baseFee);
  }, [neighborhood, subtotal, deliveryConfig]);

  const total = Math.max(0, subtotal + deliveryFee - pointsDiscount);

  if (!isOpen) return null;

  // ViaCEP integration
  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCepError('CEP inválido. Digite 8 números.');
      return;
    }

    setIsSearchingCep(true);
    setCepError('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado. Digite o endereço manualmente.');
      } else {
        setAddress(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setComplement(data.complemento || '');
      }
    } catch (e) {
      setCepError('Erro ao buscar o CEP. Digite o endereço manualmente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCepSearch();
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!address || !number || !neighborhood || !city) {
      alert('Por favor, preencha todos os campos do endereço.');
      return;
    }

    if (deliveryType === 'scheduled' && !selectedSlotId) {
      alert('Por favor, preencha seu endereço e escolha uma janela de horário para entrega.');
      return;
    }

    setIsSubmitting(true);

    try {
      let activeUser = user;

      // If buyer is a guest, auto register/login them with email/whatsapp
      if (!activeUser) {
        if (!guestContact.trim() || !guestName.trim()) {
          alert('Por favor, preencha seu nome e contato para concluir o pedido.');
          setIsSubmitting(false);
          return;
        }

        // Se for um número de WhatsApp (sem @), validar o formato exato
        if (!guestContact.includes('@')) {
          const whatsappFormatRegex = /^\d{2} \d \d{4}-\d{4}$/;
          if (!whatsappFormatRegex.test(guestContact)) {
            alert('Por favor, insira o WhatsApp exatamente no formato: ## # ####-####');
            setIsSubmitting(false);
            return;
          }
        }

        activeUser = await db.loginOrRegister(guestContact, guestName);
      }

      const orderId = 'ped_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      const selectedSlot = slots.find(s => s.id === selectedSlotId);
      const deliveryDescription = deliveryType === 'scheduled' && selectedSlot
        ? `Agendado para o dia ${selectedDate.split('-').reverse().join('/')} na janela das ${selectedSlot.startTime.slice(0, 5)} às ${selectedSlot.endTime.slice(0, 5)}.`
        : 'Pedido recebido com sucesso na cozinha/central do Favorito.';

      const newOrder: Order = {
        id: orderId,
        userId: activeUser.id,
        userContact: activeUser.email || activeUser.whatsapp || 'Cliente',
        items: [...cartItems],
        subtotal,
        deliveryFee,
        discountUsed: pointsDiscount,
        total,
        pointsEarned: pointsActive ? pointsToEarn : 0,
        pointsRedeemed: pointsActive && usePoints ? pointsToDeduct : 0,
        cep,
        address,
        number,
        complement,
        neighborhood,
        city,
        paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString(),
        deliverySlotId: deliveryType === 'scheduled' ? selectedSlotId : undefined,
        deliveryDate: deliveryType === 'scheduled' ? selectedDate : undefined,
        trackingHistory: [
          {
            status: 'pending',
            timestamp: new Date().toISOString(),
            description: deliveryDescription
          }
        ]
      };

      // Save to server/localStorage
      await db.createOrder(newOrder);

      // Decrement product stock in database
      for (const item of cartItems) {
        try {
          const freshProducts = await db.getProducts();
          const fresh = freshProducts.find((p) => p.id === item.product.id) || item.product;
          const updatedProduct = {
            ...fresh,
            stock: Math.max(0, fresh.stock - item.quantity),
          };
          await db.updateProduct(updatedProduct);
        } catch (e) {
          console.error("Error decrementing stock for product:", item.product.id, e);
          const updatedProduct = {
            ...item.product,
            stock: Math.max(0, item.product.stock - item.quantity),
          };
          await db.updateProduct(updatedProduct);
        }
      }

      // Adjust user points (subtract used + add earned)
      if (pointsActive) {
        const endingPoints = activeUser.points - pointsToDeduct + pointsToEarn;
        await db.updateUserPoints(activeUser.id, endingPoints);
      }

      // Trigger success flow
      onClearCart();
      onOrderSuccess({ ...newOrder, userId: activeUser.id }); // update with real user ID if registered
      onClose();
    } catch (err) {
      alert('Houve um erro ao processar seu pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
      <div 
        id="checkout-modal"
        className="bg-white/80 backdrop-blur-xl rounded-3xl w-full max-w-4xl shadow-2xl text-gray-800 flex flex-col md:grid md:grid-cols-12 h-[95vh] md:h-[85vh] max-h-[95vh] md:max-h-[85vh] border border-white/50 overflow-hidden"
      >
        {/* Left column (Products summary) - 5 Cols */}
        <div className="p-4 sm:p-6 bg-white/25 backdrop-blur-xs border-b md:border-b-0 md:border-r border-white/30 flex flex-col md:col-span-5 h-[35vh] md:h-full overflow-hidden shrink-0">
          <div className="flex-1 flex flex-col min-h-0 space-y-3 pb-3">
            <div className="flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cesta de Compras</span>
              <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} itens
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0 scrollbar-thin">
              {cartItems.map((item) => {
                const itemPrice = item.product.promoPrice && item.product.isPromo ? item.product.promoPrice : item.product.price;
                return (
                  <div key={item.product.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-3xs hover:border-gray-200 transition-all">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover shrink-0 bg-gray-100 border border-gray-105"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-800 truncate" title={item.product.name}>{item.product.name}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[11px] text-gray-400 font-semibold">
                          {item.quantity} {item.product.unit} x R$ {itemPrice.toFixed(2).replace('.', ',')}
                        </span>
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => onUpdateCartQty(item.product.id, item.quantity - 1)}
                            className="px-1.5 py-0.5 hover:bg-gray-200 text-gray-500 font-bold"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-[10px] font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity < item.product.stock) {
                                onUpdateCartQty(item.product.id, item.quantity + 1);
                              }
                            }}
                            disabled={item.quantity >= item.product.stock}
                            className="px-1.5 py-0.5 hover:bg-gray-200 text-gray-500 font-bold disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                            title={item.quantity >= item.product.stock ? "Limite de estoque atingido" : "Adicionar 1"}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 space-y-1.5 sm:space-y-2 text-xs shrink-0 bg-transparent">
            {/* Calculation summary */}
            <div className="flex justify-between text-gray-500">
              <span>Subtotal dos produtos</span>
              <span className="font-semibold text-gray-700">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="flex justify-between text-gray-500 items-center">
              <span className="flex items-center gap-1">
                <Truck size={14} className="text-emerald-600" />
                Taxa de Entrega {deliveryFee === 0 && subtotal > 0 && <strong className="text-emerald-700">(Grátis)</strong>}
              </span>
              <span className="font-semibold text-gray-700">
                {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
              </span>
            </div>

            {pointsDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100 font-semibold">
                <span className="flex items-center gap-1 font-bold">
                  <Award size={14} />
                  Desconto Clã Fidelidade
                </span>
                <span>- R$ {pointsDiscount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}

            <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
              <span className="text-sm font-black text-gray-900">Total Geral</span>
              <span className="text-xl font-extrabold text-emerald-800">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>

            {/* Loyalty points to earn widget */}
            {pointsActive && pointsToEarn > 0 && (
              <div className="p-2 bg-emerald-50/50 rounded-xl border border-dotted border-emerald-200 flex items-center justify-between text-[11px] text-emerald-800 mt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Award size={13} className="fill-emerald-600 text-white" />
                  Você acumulará nesta compra:
                </span>
                <span className="font-extrabold text-xs">+{pointsToEarn} pontos</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column (Delivery forms / submission) - 7 Cols */}
        <form onSubmit={handleCheckoutSubmit} className="p-4 sm:p-6 md:col-span-7 flex flex-col flex-1 h-[60vh] md:h-full md:max-h-full overflow-hidden min-h-0">
          {/* Header (Fixed) */}
          <div className="flex justify-between items-center pb-3 border-b border-gray-100 shrink-0 mb-2">
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">Fechamento do Pedido</h3>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Entrega rápida, quentinha e segura em sua porta</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2 min-h-0 scrollbar-thin scrollbar-thumb-gray-250">

            {/* Account requirement / auto login */}
            {!user ? (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-2.5">
                <div className="flex justify-between items-start gap-1.5">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-extrabold text-rose-800 flex items-center gap-1">
                      <Award size={14} className="text-rose-600" />
                      Não está logado no Clube Favorito?
                    </h5>
                    <p className="text-[11px] text-rose-600 leading-relaxed">
                      Identifique-se rapidez para cadastrar seu pedido no painel de acompanhamento e ativar seu saldo de fidelidade automático! Ou digite seus dados abaixo:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onLoginTrigger}
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-all"
                  >
                    Fazer Login
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Seu Nome Completo"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    className="px-2.5 py-1.5 sm:py-2 bg-white border border-rose-300 text-base sm:text-xs text-gray-900 font-extrabold rounded-xl focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                  <input
                    type="text"
                    placeholder="E-mail ou WhatsApp"
                    value={guestContact}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val.includes('@') && (/\d/.test(val) || val === '')) {
                        setGuestContact(formatWhatsAppNumber(val));
                      } else {
                        setGuestContact(val);
                      }
                    }}
                    maxLength={guestContact.includes('@') ? undefined : 14}
                    required
                    className="px-2.5 py-1.5 sm:py-2 bg-white border border-rose-300 text-base sm:text-xs text-gray-900 font-extrabold rounded-xl focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block">Cliente Conectado</span>
                  <button
                    type="button"
                    onClick={onEditProfileTrigger}
                    className="text-xs font-black text-gray-800 hover:text-emerald-700 block text-left underline decoration-dotted decoration-emerald-500/50 hover:decoration-solid underline-offset-2 transition-colors cursor-pointer"
                    title="Clique para editar seu perfil e endereço"
                    id="checkout-edit-profile-btn"
                  >
                    {user.name} ✏️
                  </button>
                </div>

                {/* Loyalty Point Redemption Slide */}
                {pointsActive && (
                  maxRedeemablePoints > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">Usar meus pontos?</span>
                        <span className="text-xs text-emerald-700 block font-black leading-none">
                          {maxRedeemablePoints} pts = R$ {(maxRedeemablePoints * pointsValue).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[9px] text-emerald-600 block font-medium mt-0.5 leading-none">
                          {pointsDiscountType === 'delivery' ? 'Apenas no Frete' : 'Na Compra Total'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usePoints}
                          onChange={(e) => setUsePoints(e.target.checked)}
                          className="sr-only peer"
                          id="loyalty-redeem-checkbox"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-bold">Seu saldo do Clube</span>
                      <span className="text-xs text-emerald-800 block font-extrabold">{user.points} pontos</span>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Address Lookup */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={14} className="text-emerald-700" />
                1. Endereço de Entrega
              </h4>

              {user && user.neighborhood && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Destino do Pedido</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddressSourceChange('profile')}
                      className={`p-2 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
                        addressSource === 'profile'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-850 shadow-3xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>Usar Endereço Salvo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddressSourceChange('new')}
                      className={`p-2 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
                        addressSource === 'new'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-850 shadow-3xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>Outro Endereço</span>
                    </button>
                  </div>
                </div>
              )}

              {addressSource === 'profile' && user && user.neighborhood ? (
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                  <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">Endereço de Entrega do Cadastro</span>
                  <div className="text-xs text-gray-700 font-extrabold flex flex-col gap-0.5">
                    <span><strong className="text-emerald-950 font-bold">Rua / Nº:</strong> {user.streetNumber}</span>
                    <span><strong className="text-emerald-950 font-bold">Bairro:</strong> {user.neighborhood}</span>
                    <span><strong className="text-emerald-950 font-bold">Cidade:</strong> {user.city}</span>
                  </div>
                  <span className="text-[9px] text-gray-400 block font-semibold pt-0.5">Configurado a partir do seu cadastro padrão.</span>
                </div>
              ) : (
                <>
                  {/* CEP Input with ViaCEP Action */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="CEP (ex: 01001-000)"
                        value={cep}
                        onKeyDown={handleCepKeyDown}
                        onChange={(e) => setCep(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-base sm:text-xs focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-gray-900 font-extrabold placeholder:text-gray-400 placeholder:font-normal"
                        id="cep-input"
                      />
                      {isSearchingCep ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <button
                          type="button"
                          onClick={handleCepSearch}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-emerald-850 hover:text-emerald-950 bg-emerald-100 rounded-full hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Buscar Endereço pelo CEP"
                          id="cep-search-button"
                        >
                          <Search size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="text-[10px] text-gray-500 font-extrabold leading-tight">Pressione ENTER ou clique no botão para buscar o CEP</span>
                    </div>
                  </div>

                  {cepError && (
                    <div className="text-[10px] text-rose-600 font-bold">{cepError}</div>
                  )}

                  {/* Address details */}
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8 sm:col-span-8">
                      <input
                        type="text"
                        required
                        placeholder="Logradouro / Rua / Avenida"
                        value={address}
                        onChange={(e) => setAddress(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-base sm:text-xs focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-gray-900 font-extrabold placeholder:text-gray-400 placeholder:font-normal transition-all"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-4">
                      <input
                        type="text"
                        required
                        placeholder="Nº"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-base sm:text-xs focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-gray-900 font-extrabold placeholder:text-gray-400 placeholder:font-normal transition-all"
                        id="address-number"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Apto / bloco / comp."
                        value={complement}
                        onChange={(e) => setComplement(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-base sm:text-xs focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-gray-900 font-extrabold placeholder:text-gray-400 placeholder:font-normal transition-all"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-4">
                      <input
                        type="text"
                        required
                        placeholder="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-base sm:text-xs focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-605 text-gray-900 font-extrabold placeholder:text-gray-400 placeholder:font-normal transition-all"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-4">
                      <input
                        type="text"
                        required
                        placeholder="Cidade"
                        value={city}
                        onChange={(e) => setCity(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-base sm:text-xs focus:outline-hidden text-gray-650 font-extrabold cursor-not-allowed"
                        disabled
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Delivery Option / Scheduling */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <Truck size={14} className="text-emerald-700" />
                2. Opções de Entrega
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('fast')}
                  className={`p-3 rounded-xl border text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center ${
                    deliveryType === 'fast'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-gray-200 hover:border-gray-250 text-gray-400 bg-white'
                  }`}
                >
                  <span className="text-lg">⚡</span>
                  <div className="space-y-0.5">
                    <span className="block text-[11px] font-black uppercase tracking-wide">Entrega Rápida</span>
                    <span className="block text-[9px] font-normal leading-tight">Fila comum do período atual</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('scheduled')}
                  className={`p-3 rounded-xl border text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center relative ${
                    deliveryType === 'scheduled'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-gray-200 hover:border-gray-250 text-gray-400 bg-white'
                  }`}
                >
                  <span className="text-lg">📅</span>
                  <div className="space-y-0.5">
                    <span className="block text-[11px] font-black uppercase tracking-wide">Agendar Horário</span>
                    <span className="block text-[9px] font-normal leading-tight">Escolher data e período</span>
                  </div>
                </button>
              </div>

              {/* Scheduling picker panel */}
              {deliveryType === 'scheduled' && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3 animate-fadeIn">
                  {/* Select Date */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Escolha o Dia da Entrega:</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {getUpcomingDates().map((d) => (
                        <button
                          key={d.dateString}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d.dateString);
                            setSelectedSlotId(''); // Reset selected slot to enforce selection
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all whitespace-nowrap shrink-0 flex flex-col items-center gap-0.5 cursor-pointer ${
                            selectedDate === d.dateString
                              ? 'bg-emerald-705 bg-emerald-700 text-white border-emerald-705'
                              : 'bg-white text-gray-500 border-gray-205 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-black">{d.label}</span>
                          <span className="text-[9px] font-medium opacity-85">{d.formattedDate}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Slot */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Janelas de Horários Disponíveis:</span>
                    
                    {/* Filter slots matching day of the week */}
                    {displayedSlots.length === 0 ? (
                      <div className="text-[10px] text-gray-400 font-bold p-2 text-center bg-white border border-gray-150 rounded-lg">
                        Nenhuma janela de entrega disponível para este dia.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {displayedSlots.map((slot) => {
                          const bookedCount = slotUsage[slot.id] || 0;
                          const isFull = bookedCount >= slot.maxOrders;
                          const isSelected = selectedSlotId === slot.id;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={isFull}
                              onClick={() => setSelectedSlotId(slot.id)}
                              className={`p-2 rounded-lg border text-left transition-all relative cursor-pointer ${
                                isFull
                                  ? 'bg-gray-100 border-gray-150 text-gray-350 cursor-not-allowed opacity-60'
                                  : isSelected
                                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-1 ring-emerald-600'
                                  : 'bg-white border-gray-205 hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                  <Clock size={11} className={isSelected ? 'text-emerald-700' : 'text-gray-400'} />
                                  <span className="text-[11px] font-extrabold">
                                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                                  </span>
                                </div>
                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full ${
                                  isFull
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                    : isSelected
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {isFull ? 'Esgotado' : `${slot.maxOrders - bookedCount} vagas`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment options */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <CreditCard size={14} className="text-emerald-700" />
                3. Forma de Pagamento
              </h4>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-1.5 sm:p-2.5 rounded-xl border text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-750 bg-white'
                  }`}
                  id="pay-pix"
                >
                  <QrCode size={16} className={paymentMethod === 'pix' ? 'text-emerald-700 animate-pulse' : 'text-gray-400'} />
                  <span>PIX</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`p-1.5 sm:p-2.5 rounded-xl border text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === 'credit'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-750 bg-white'
                  }`}
                  id="pay-credit"
                >
                  <CreditCard size={16} className={paymentMethod === 'credit' ? 'text-emerald-700' : 'text-gray-400'} />
                  <span>Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-1.5 sm:p-2.5 rounded-xl border text-[10px] sm:text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-750 bg-white'
                  }`}
                  id="pay-cash"
                >
                  <span className="text-base leading-none">💵</span>
                  <span>Dinheiro</span>
                </button>
              </div>

              {/* Extra settings for cash / change */}
              {paymentMethod === 'cash' && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 animate-fadeIn mt-1">
                  <label className="text-[11px] font-bold text-gray-650 block mb-1">Precisa de troco? Para quanto?</label>
                  <input
                    type="text"
                    placeholder="Ex: Troco para R$ 100"
                    value={cashChange}
                    onChange={(e) => setCashChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-emerald-600 text-gray-800"
                  />
                </div>
              )}

              {/* Extra visualization for PIX QR code */}
              {paymentMethod === 'pix' && (
                <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-center gap-3 animate-fadeIn mt-1">
                  <div className="w-12 h-12 bg-white rounded-lg border border-emerald-250 flex items-center justify-center text-emerald-800 font-extrabold text-[9px] shrink-0">
                    QR CODE
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="text-[11px] font-bold text-emerald-800 block">PIX do Favorito</span>
                    <span className="text-[10px] text-emerald-600 block">Aproveite desconto adicional e liberação automática do pedido em 1 minuto!</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checkout Footer buttons */}
          <div className="pt-4 border-t border-gray-150 flex items-center justify-between mt-2 shrink-0">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-400 font-semibold">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
              <span>Compra 100% Protegida</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || cartItems.length === 0}
                className="px-4 sm:px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] cursor-pointer flex items-center gap-1 shrink-0"
                id="submit-order-button"
              >
                {isSubmitting ? 'Gerando...' : 'Concluir'}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
