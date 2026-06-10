import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Clock, ShoppingCart, Truck, CheckCircle2, RefreshCw, Star } from 'lucide-react';
import { db } from '../lib/supabase';
import { Order, User } from '../types';

interface OrderTrackerProps {
  user: User | null;
  activeOrder: Order | null;
  onClose?: () => void;
  pointsActive: boolean;
}

export default function OrderTracker({ user, activeOrder: initialActiveOrder, pointsActive }: OrderTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Sincronizar com order ativo recém criado
  useEffect(() => {
    if (initialActiveOrder) {
      setSelectedOrder(initialActiveOrder);
      setOrders([initialActiveOrder]);
    } else if (user) {
      loadUserOrders();
    }
  }, [user, initialActiveOrder]);

  const loadUserOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const uOrders = await db.getOrders(user.id);
      setOrders(uOrders);
      if (uOrders.length > 0 && !selectedOrder) {
        setSelectedOrder(uOrders[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setMessage('');
    setSelectedOrder(null);

    const term = searchTerm.trim().toLowerCase();

    try {
      const allOrders = await db.getOrders();
      // Filter orders by order ID OR userContact match
      const filtered = allOrders.filter(
        (o) =>
          o.id.toLowerCase() === term ||
          o.userContact.toLowerCase().includes(term) ||
          o.cep.replace(/\D/g, '').includes(term)
      );

      setOrders(filtered);

      if (filtered.length > 0) {
        setSelectedOrder(filtered[0]);
      } else {
        setMessage('Nenhum pedido encontrado para o código ou contato informado.');
      }
    } catch (err) {
      setMessage('Erro ao pesquisar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async (orderId: string) => {
    if (isConfirming || !selectedOrder) return;
    setIsConfirming(true);
    try {
      await db.updateOrderStatus(orderId, 'delivered', 'Pedido recebido e confirmado pelo cliente na plataforma via QR Code!');
      
      const updatedOrder: Order = {
        ...selectedOrder,
        status: 'delivered',
        trackingHistory: [
          ...selectedOrder.trackingHistory,
          {
            status: 'delivered',
            timestamp: new Date().toISOString(),
            description: 'Pedido recebido e confirmado pelo cliente na plataforma via QR Code!'
          }
        ]
      };
      
      setSelectedOrder(updatedOrder);
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    } catch (e) {
      console.error('Erro ao confirmar recebimento:', e);
    } finally {
      setIsConfirming(false);
    }
  };

  const getStepStatus = (order: Order, step: 'pending' | 'processing' | 'shipped' | 'delivered') => {
    const statuses = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIdx = statuses.indexOf(order.status);
    const stepIdx = statuses.indexOf(step);

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'active';
    return 'upcoming';
  };

  const getStepDescription = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Aguardando Confirmação';
      case 'processing': return 'Em Separação & Embalagem';
      case 'shipped': return 'Saiu para Entrega';
      case 'delivered': return 'Entregue com Sucesso';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="order-tracker-panel">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Truck className="text-emerald-700" />
            Rastreamento de Pedidos
          </h2>
          <p className="text-xs text-gray-500">Acompanhe a preparação e trajeto da sua entrega em tempo real</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto max-w-md">
          <input
            type="text"
            placeholder="Digite o código (ex: PED_XYZ) ou seu e-mail/WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-250 rounded-xl text-base md:text-xs w-full focus:outline-hidden focus:border-emerald-600 focus:bg-white text-gray-800 font-medium"
            id="tracking-search-input"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            id="tracking-search-button"
          >
            Buscar
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-10 flex flex-col items-center gap-2">
          <RefreshCw className="animate-spin text-emerald-700" size={32} />
          <span className="text-sm font-semibold text-gray-650">Carregando dados de entrega...</span>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-14 max-w-md mx-auto space-y-4">
          <span className="text-4xl">📦</span>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-gray-800">
              {searchTerm ? 'Nenhum Pedido Localizado' : 'Acompanhe as suas Entregas'}
            </h4>
            <p className="text-xs text-gray-550 leading-relaxed">
              {message || 'Digite acima o código do seu pedido, e-mail ou WhatsApp registrado no Checkout para acompanhar as etapas de entrega!' }
            </p>
          </div>
          {user && (
            <button
              onClick={loadUserOrders}
              className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
            >
              Recarregar meus pedidos cadastrados
            </button>
          )}
        </div>
      )}

      {!loading && orders.length > 0 && selectedOrder && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* List of relative orders (Sidebar) - 3 Cols */}
          <div className="lg:col-span-3 space-y-3 max-h-[350px] lg:max-h-[500px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Histórico Encontrado</h3>
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  o.id === selectedOrder.id
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                id={`sidebar-order-btn-${o.id}`}
              >
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-800">{o.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                    o.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : o.status === 'shipped'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {o.status === 'pending' && 'Recebido'}
                    {o.status === 'processing' && 'Na cozinha'}
                    {o.status === 'shipped' && 'A caminho'}
                    {o.status === 'delivered' && 'Entregue'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2.5 text-[10px] text-gray-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <span>R$ {o.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Order detail / tracking - 9 Cols */}
          <div className="lg:col-span-9 space-y-6">
            {/* Quick Header */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-150 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-black block">Código do Rastreio</span>
                <span className="text-sm font-black text-gray-900">{selectedOrder.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-black block">Criado em</span>
                <span className="text-xs font-bold text-gray-800 inline-flex items-center gap-1">
                  <Clock size={12} className="text-emerald-700" />
                  {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-black block">Status Atual</span>
                <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide">
                  {getStepDescription(selectedOrder.status)}
                </span>
              </div>
              {selectedOrder.deliveryDriverName && (
                <div className="bg-indigo-50 border border-indigo-150 px-3 py-1 rounded-xl">
                  <span className="text-[9px] text-[#4338ca] uppercase font-black block">Entregador Designado</span>
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1">
                    🚀 {selectedOrder.deliveryDriverName}
                  </span>
                </div>
              )}
            </div>

            {/* Dynamic Tracking QR Code Integration Actions */}
            {(() => {
              const fullAddressStr = `${selectedOrder.address}, ${selectedOrder.number}, ${selectedOrder.neighborhood}, ${selectedOrder.city}`;
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressStr)}`;
              const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(fullAddressStr)}`;
              return (
                <div className="bg-emerald-50/40 border border-emerald-150 p-4.5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  {/* Left Column: Driver routing */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider inline-block">
                      🛵 Painel de Rota (Entregador)
                    </span>
                    <p className="text-[11.5px] font-bold text-slate-800 leading-tight">
                      Abra a rota em tempo real usando o GPS do celular:
                    </p>
                    <div className="flex gap-2 pt-1">
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3 py-2 rounded-xl text-xs text-center transition-colors flex items-center justify-center gap-1.5 shadow-3xs"
                      >
                        🗺️ Google Maps
                      </a>
                      <a
                        href={wazeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs text-center transition-colors flex items-center justify-center gap-1.5 shadow-3xs"
                      >
                        🚗 Waze GPS
                      </a>
                    </div>
                  </div>

                  {/* Right Column: Customer secure validation */}
                  <div className="border-t md:border-t-0 md:border-l border-dashed border-emerald-200 pt-3 md:pt-0 md:pl-5 space-y-2">
                    <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider inline-block">
                      🔒 Confirmação de Recebimento (Cliente)
                    </span>
                    {selectedOrder.status === 'delivered' ? (
                      <div className="flex items-start gap-2.5 text-emerald-900 font-extrabold text-xs bg-white border border-emerald-200 p-3 rounded-xl shadow-3xs">
                        <span className="text-lg leading-none shrink-0">✔️</span>
                        <div className="leading-snug">
                          <p>Entrega Confirmada com Sucesso!</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5 font-sans">
                            Assinado e confirmado com segurança diretamente via QR Code na plataforma.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10.5px] text-gray-550 font-semibold leading-relaxed">
                          Recebeu as suas sacolas? Clique abaixo para validar a sua entrega instantaneamente:
                        </p>
                        <button
                          type="button"
                          onClick={() => handleConfirmReceipt(selectedOrder.id)}
                          disabled={isConfirming}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black px-4.5 py-2.5 rounded-xl text-xs cursor-pointer shadow-3xs transition-all flex items-center justify-center gap-1.5"
                        >
                          {isConfirming ? (
                            <>
                              <RefreshCw className="animate-spin" size={13} />
                              Confirmando...
                            </>
                          ) : (
                            <>
                              Confirmar meu Recebimento ✔️
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Micro Stepper Line */}
            <div className="py-2.5">
              <div className="relative">
                {/* Connecting background bar */}
                <div className="absolute top-[14px] left-8 right-8 h-1 bg-gray-200 -z-5 flex">
                  <div 
                    className="h-full bg-emerald-700 transition-all duration-1000"
                    style={{
                      width: selectedOrder.status === 'pending' ? '15%' :
                             selectedOrder.status === 'processing' ? '50%' :
                             selectedOrder.status === 'shipped' ? '85%' : '100%'
                    }}
                  />
                </div>

                <div className="grid grid-cols-4 relative text-center">
                  {/* Step 1: Pending */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      getStepStatus(selectedOrder, 'pending') === 'completed'
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : getStepStatus(selectedOrder, 'pending') === 'active'
                          ? 'bg-white border-emerald-700 text-emerald-700 ring-4 ring-emerald-100 scale-105'
                          : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      <CheckCircle2 size={16} className={getStepStatus(selectedOrder, 'pending') === 'active' ? 'animate-pulse' : ''} />
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${
                      getStepStatus(selectedOrder, 'pending') === 'active' ? 'text-emerald-800' : 'text-gray-500'
                    }`}>Recebido</span>
                  </div>

                  {/* Step 2: Processing */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      getStepStatus(selectedOrder, 'processing') === 'completed'
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : getStepStatus(selectedOrder, 'processing') === 'active'
                          ? 'bg-white border-emerald-700 text-emerald-700 ring-4 ring-emerald-100 scale-105'
                          : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      <ShoppingCart size={16} className={getStepStatus(selectedOrder, 'processing') === 'active' ? 'animate-pulse' : ''} />
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${
                      getStepStatus(selectedOrder, 'processing') === 'active' ? 'text-emerald-800' : 'text-gray-500'
                    }`}>Em Separação</span>
                  </div>

                  {/* Step 3: Shipped */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      getStepStatus(selectedOrder, 'shipped') === 'completed'
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : getStepStatus(selectedOrder, 'shipped') === 'active'
                          ? 'bg-white border-emerald-700 text-emerald-700 ring-4 ring-emerald-100 scale-105'
                          : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      <Truck size={16} className={getStepStatus(selectedOrder, 'shipped') === 'active' ? 'animate-bounce' : ''} />
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${
                      getStepStatus(selectedOrder, 'shipped') === 'active' ? 'text-emerald-800' : 'text-gray-500'
                    }`}>Saiu p/ Entrega</span>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      getStepStatus(selectedOrder, 'delivered') === 'completed' || selectedOrder.status === 'delivered'
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      <CheckCircle2 size={16} />
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${
                      selectedOrder.status === 'delivered' ? 'text-emerald-800' : 'text-gray-500'
                    }`}>Entregue</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Map Illustration: Canvas or SVG */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-150 space-y-3">
              <span className="text-xs font-extrabold text-gray-700 block uppercase tracking-wider">Percurso da sua Entrega</span>
              
              {/* Animation Stage representing route */}
              <div 
                id="interactive-route-map"
                className="h-44 rounded-xl relative overflow-hidden flex items-center justify-between p-6 cursor-pointer select-none bg-emerald-950/95 border border-emerald-900"
              >
                {/* Background road dotted paths */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e3a24_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                <div className="absolute left-8 right-8 h-1 bg-dashed border-t border-emerald-800/80 top-1/2 -translate-y-1/2" />

                {/* Left Landmark: Storehouse */}
                <div className="flex flex-col items-center z-15 relative">
                  <div className="w-10 h-10 bg-emerald-800 text-emerald-100 rounded-lg flex items-center justify-center border border-emerald-600 shadow-md">
                    🏬
                  </div>
                  <span className="text-[10px] font-bold text-emerald-200 mt-1 bg-emerald-900/80 px-2 py-0.5 rounded-md">O Favorito</span>
                </div>

                {/* Animated delivery truck */}
                <div 
                  className="absolute z-20 flex flex-col items-center transition-all duration-1000"
                  style={{
                    left: selectedOrder.status === 'pending' ? '15%' :
                          selectedOrder.status === 'processing' ? '45%' :
                          selectedOrder.status === 'shipped' ? '70%' : '85%',
                    transform: 'translateY(-50%)',
                    top: '50%'
                  }}
                >
                  <div className="w-11 h-11 bg-rose-600 text-white rounded-full flex items-center justify-center italic text-lg shadow-lg border border-rose-500 scale-105 animate-pulse">
                    🚚
                  </div>
                  <span className="text-[8px] font-extrabold text-rose-300 mt-1 bg-slate-900/90 px-1.5 py-0.5 rounded-sm whitespace-nowrap uppercase tracking-wider shadow-xs">
                    {selectedOrder.status === 'pending' && 'Preparando'}
                    {selectedOrder.status === 'processing' && 'Separando'}
                    {selectedOrder.status === 'shipped' && 'A Caminho!'}
                    {selectedOrder.status === 'delivered' && 'Disparado!'}
                  </span>
                </div>

                {/* Right Landmark: User house */}
                <div className="flex flex-col items-center z-15 relative">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-md transition-colors ${
                    selectedOrder.status === 'delivered'
                      ? 'bg-rose-700 border-rose-500 text-rose-100'
                      : 'bg-emerald-900 border-emerald-700 text-emerald-300'
                  }`}>
                    🏡
                  </div>
                  <span className="text-[10px] font-bold text-emerald-200 mt-1 bg-emerald-900/80 px-2 py-0.5 rounded-md">Sua Casa</span>
                </div>
              </div>
            </div>

            {/* Order Items & Summary of purchase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items detail list */}
              <div className="p-4 border border-gray-150 rounded-2xl space-y-3 text-xs text-gray-800">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Itens Solicitados</span>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {selectedOrder.items.map((item) => {
                    const price = item.product.promoPrice && item.product.isPromo ? item.product.promoPrice : item.product.price;
                    return (
                      <div key={item.product.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                        <span className="font-semibold text-gray-700 line-clamp-1 truncate max-w-[150px]">{item.product.name}</span>
                        <span className="text-gray-400 font-bold">
                          {item.quantity}x R$ {price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Address / Details */}
              <div className="p-4 border border-gray-150 rounded-2xl space-y-2 text-xs text-gray-800">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Endereço de Envio</span>
                
                <div className="space-y-1.5 leading-relaxed text-gray-650">
                  <p className="flex items-start gap-1.5">
                    <MapPin size={13} className="text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      {selectedOrder.address}, Nº {selectedOrder.number}<br />
                      {selectedOrder.complement && <span className="text-gray-400">Compl: {selectedOrder.complement}<br /></span>}
                      Bairro: {selectedOrder.neighborhood} <br />
                      {selectedOrder.city} - CEP: {selectedOrder.cep}
                    </span>
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex justify-between">
                    <span className="font-bold text-gray-400">Forma de pagamento:</span>
                    <span className="font-extrabold text-emerald-800 capitalize">{selectedOrder.paymentMethod === 'credit' ? 'Cartão na Entrega' : selectedOrder.paymentMethod}</span>
                  </div>

                  {pointsActive && selectedOrder.pointsEarned > 0 && (
                    <div className="mt-2 text-emerald-800 bg-emerald-50 border border-emerald-150 rounded-lg p-2 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold">
                        <Star size={13} className="fill-yellow-300 text-yellow-300" />
                        Crédito de Fidelidade ganho:
                      </span>
                      <span className="font-extrabold">+{selectedOrder.pointsEarned} pontos</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed logs */}
            <div className="p-4 border border-gray-150 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Diário de Atividades</span>
              <div className="space-y-3.5 pl-3 border-l-2 border-emerald-600/30">
                {selectedOrder.trackingHistory.slice().reverse().map((log, idx) => (
                  <div key={idx} className="relative text-xs">
                    <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />
                    <div className="flex gap-4 justify-between">
                      <p className="font-bold text-gray-800 leading-relaxed">{log.description}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 font-semibold mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
