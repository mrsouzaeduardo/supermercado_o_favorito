import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle2, MapPin, Smartphone, Calendar, DollarSign, Tag, ClipboardList } from 'lucide-react';
import { Order, CartItem } from '../types';

interface SeparationGuideModalProps {
  order: Order;
  clientName?: string;
  clientContact?: string;
  onClose: () => void;
}

export default function SeparationGuideModal({ order, clientName, clientContact, onClose }: SeparationGuideModalProps) {
  // Configurable layout state: 'a4' for optimized A4 sheets, 'thermal' for 80mm continuous thermal receipt rolls
  const [printLayout, setPrintLayout] = useState<'a4' | 'thermal'>('a4');

  // Local state to track which products have been picked (checked)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleItemChecked = (productId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  // Sync print mode class to document body so CSS print layouts compile correctly
  useEffect(() => {
    if (printLayout === 'thermal') {
      document.body.classList.add('body-print-thermal');
    } else {
      document.body.classList.remove('body-print-thermal');
    }
    return () => {
      document.body.classList.remove('body-print-thermal');
    };
  }, [printLayout]);

  // Group items by category for optimized picking flow in-store
  const itemsByCategory: Record<string, CartItem[]> = {};
  order.items.forEach(item => {
    const category = item.product.category || 'Outros';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const checkedItemsCount = order.items.filter(item => checkedItems[item.product.id]).reduce((sum, item) => sum + item.quantity, 0);

  const trackingUrl = `${window.location.origin}/?track=${order.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;

  return (
    <div id="separation-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none print:bg-white print:p-0 print:static print:h-auto print:overflow-visible">
      {/* Dynamic override of page printing dimensions for narrow receipt rolls, to prevent printer margins from cutting text */}
      {printLayout === 'thermal' && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              margin: 2mm 3mm !important;
              size: auto;
            }
          }
        `}} />
      )}

      {/* Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-150 max-w-2xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden relative print:border-none print:shadow-none print:max-w-none print:h-auto print:static" id="modal-container">
        
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ClipboardList size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5 font-sans">
                Guia de Separação de Pedido
              </h3>
              <p className="text-[10px] text-gray-400 font-medium font-sans">
                Acompanhe e separe os itens fisicamente na loja.
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body (Scrollable container on screen, printed fully) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 print:overflow-visible print:p-0" id="printable-area-container">
          
          {/* Printable Layout Target Section */}
          <div 
            id="print-section" 
            className={`space-y-6 print:p-0 print:m-0 print:static transition-all duration-300 ${
              printLayout === 'thermal' 
                ? 'print-mode-thermal max-w-[340px] mx-auto border border-dashed border-slate-300 p-5 bg-slate-50/40 text-slate-950 shadow-inner rounded-2xl' 
                : ''
            }`}
          >
            
            {/* Print Only Header (Hidden on UI) */}
            <div className="hidden show-on-print print:block mb-6 border-b-2 border-gray-950 pb-4 print-main-header">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-gray-900 font-display uppercase tracking-wider">Supermercado O Favorito</h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">GUIA DE SEPARAÇÃO E ENTREGA</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black bg-slate-100 border border-slate-300 px-3 py-1 rounded-sm uppercase font-mono">
                      {order.id}
                    </span>
                    <p className="text-[9px] text-gray-400 font-medium mt-1">
                      Gerado em: {new Date().toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {/* Dynamic tracking QR Code for print */}
                  <div className="flex flex-col items-center gap-0.5 border border-slate-300 p-1 bg-white rounded-lg">
                    <img 
                      src={qrImageUrl} 
                      alt="Rastreamento" 
                      className="w-12 h-12 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[6.5px] font-black uppercase text-slate-800 tracking-wider font-sans">SCAN ROTEAR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl no-print">
              <div>
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">Código Pedido</span>
                <span className="text-sm font-black text-emerald-950 font-mono tracking-tight">{order.id}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">Progresso Separação</span>
                <span className="text-sm font-black text-emerald-950">
                  {checkedItemsCount} de {totalItemsCount} itens ({Math.round((checkedItemsCount / (totalItemsCount || 1)) * 100)}%)
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">Pagamento</span>
                <span className="text-sm font-bold text-emerald-900 capitalize">{order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'credit' ? 'Cartão de Crédito' : 'Dinheiro (Troco)'}</span>
              </div>
            </div>

            {/* Paper Bill Details Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-150 p-4.5 rounded-2xl bg-white print-border">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-450 uppercase tracking-wider block border-b pb-1">
                  👤 INFORMAÇÕES DO CLIENTE
                </span>
                <div className="space-y-1 text-xs">
                  <p className="text-gray-850 font-extrabold flex items-center gap-1.5 leading-tight">
                    <span className="font-normal text-gray-400 uppercase tracking-wider text-[9px] w-12 shrink-0">Nome:</span>
                    {clientName || 'Cliente'}
                  </p>
                  <p className="text-gray-750 font-medium flex items-center gap-1.5 leading-tight">
                    <span className="font-normal text-gray-400 uppercase tracking-wider text-[9px] w-12 shrink-0">Contato:</span>
                    <Smartphone size={11} className="text-emerald-600 no-print" />
                    <span className="font-bold">{clientContact || order.userContact}</span>
                  </p>
                  <p className="text-gray-750 font-medium flex items-center gap-1.5 leading-tight">
                    <span className="font-normal text-gray-400 uppercase tracking-wider text-[9px] w-12 shrink-0">Data:</span>
                    <Calendar size={11} className="text-indigo-650 no-print" />
                    <span className="font-semibold">{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-455 uppercase tracking-wider block border-b pb-1">
                  📍 DETALHES DA ENTREGA
                </span>
                <div className="text-xs space-y-1">
                  <p className="text-gray-800 font-bold flex items-start gap-1 leading-normal">
                    <MapPin size={12} className="text-rose-500 mt-0.5 shrink-0 no-print" />
                    <span>
                      {order.address}, {order.number}
                      {order.complement && <span className="font-normal text-gray-500"> ({order.complement})</span>}
                    </span>
                  </p>
                  <p className="text-gray-650 font-medium pl-0 md:pl-4">
                    {order.neighborhood} • {order.city} - {order.cep}
                  </p>
                  <p className="text-emerald-850 font-extrabold text-[11px] pl-0 md:pl-4 uppercase flex items-center gap-1">
                    <DollarSign size={11} className="no-print" />
                    Total Compra: R$ {order.total.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
             </div>

            {/* QR Code de Rastreamento Impresso no Cupom/PDF */}
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-between transition-all">
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-sm uppercase tracking-wider inline-block">
                  📲 QR Code Rastreio & Entrega
                </span>
                <h4 className="text-xs font-black text-slate-900 font-sans leading-snug">
                  Módulo de Rastreamento Otimizado
                </h4>
                <p className="text-[10px] text-gray-450 font-medium leading-relaxed max-w-sm">
                  <strong>Entregador:</strong> Escaneie com a câmera do celular para abrir o trajeto no Maps ou Waze diretamente da tela do celular.<br />
                  <strong>Cliente:</strong> Escaneie ao receber para Confirmar Recebimento direto na plataforma com total segurança.
                </p>
              </div>

              <div className="bg-white border border-slate-200 p-2 rounded-xl flex flex-col items-center gap-1 shrink-0 shadow-3xs">
                <img 
                  src={qrImageUrl} 
                  alt="QR Rastreamento" 
                  className="w-20 h-20 shrink-0 select-all"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[8px] font-mono font-black text-slate-800 bg-slate-100 px-1 py-0.2 rounded">{order.id}</span>
              </div>
            </div>

            {/* Picking checklist grouped by Category */}
            <div className="space-y-5">
              <span className="text-[10px] font-black text-gray-450 uppercase tracking-wider block border-b pb-1">
                📦 LISTA DE PRODUTOS PARA SEPARAÇÃO (ORGANIZADOS POR SETOR)
              </span>

              {Object.keys(itemsByCategory).map(category => (
                <div key={category} className="space-y-2.5">
                  {/* Category Header */}
                  <div className="bg-slate-100/80 px-3.5 py-1.5 rounded-lg text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between print-header-bg">
                    <span>💡 Setor / Categoria: {category}</span>
                    <span className="text-[10px] font-bold text-slate-400 font-sans tracking-wide">
                      {itemsByCategory[category].reduce((tot, i) => tot + i.quantity, 0)} un
                    </span>
                  </div>

                  {/* Category Items List */}
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white print-border">
                    {itemsByCategory[category].map(item => {
                      const isChecked = !!checkedItems[item.product.id];
                      return (
                        <div 
                          key={item.product.id}
                          onClick={() => toggleItemChecked(item.product.id)}
                          className={`p-3 md:p-4 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                            isChecked ? 'bg-emerald-50/30' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Left: Checkbox + Qty Badge + Name */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Checkbox (Clickable only on Screen) */}
                            <div className="relative shrink-0 flex items-center justify-center no-print">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="w-5 h-5 rounded-lg border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                              />
                            </div>

                            {/* Print Only Empty Box bracket (For paper checklist ticking) */}
                            <div className="hidden print:block font-mono text-sm font-semibold shrink-0 text-gray-400 mr-2">
                              [ &nbsp; ]
                            </div>

                            {/* Quantity Badge (Very large and visible!) */}
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 shrink-0 flex items-center justify-center text-amber-800 font-black font-sans leading-none text-base">
                              {item.quantity}
                              <span className="text-[8px] font-bold block self-end pb-1 text-amber-550 ml-0.5">x</span>
                            </div>

                            {/* Product Info */}
                            <div className="min-w-0">
                              <p className="font-extrabold text-sm text-gray-900 leading-tight uppercase truncate max-w-[280px] md:max-w-md">
                                {item.product.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10.5px] text-gray-400 font-semibold uppercase mt-1">
                                <Tag size={10} />
                                <span>R$ {item.product.price.toFixed(2).replace('.', ',')} / {item.product.unit || 'un'}</span>
                                {item.product.isPromo && (
                                  <span className="text-emerald-700 font-extrabold text-[9px] bg-emerald-50 px-1 py-0.2 rounded">PROMO</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Subtotal column */}
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-black text-gray-800">
                              R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[9.5px] text-gray-400 block font-medium font-sans">
                              {item.product.unit || 'un'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Print Confirmation Footnote */}
            <div className="hidden print:block mt-12 pt-6 border-t border-dashed border-gray-405 text-center text-[10px] text-gray-400 font-medium print-footnote">
              <p>Obrigado por comprar no Supermercado O Favorito • WhatsApp: (84) 9999-9999</p>
              <p className="mt-1">Favor conferir todas as sacolas de acordo com este romaneio antes de expedir!</p>
            </div>

          </div>

        </div>

        {/* Modal Footer (Always visible on UI, hidden from printer) */}
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shrink-0 no-print">
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">
              ⚙️ Layout de Impressão (Economia de Papel & Térmica)
            </span>
            <div className="flex bg-gray-200/70 p-0.5 rounded-xl border border-gray-205 w-full max-w-sm self-start">
              <button
                type="button"
                onClick={() => setPrintLayout('a4')}
                className={`flex-1 px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  printLayout === 'a4' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📄 A4 Compacto
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('thermal')}
                className={`flex-1 px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  printLayout === 'thermal' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📟 Cupom Térmico (80mm)
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 md:flex-none px-4 py-2 bg-white hover:bg-gray-100 border border-gray-250 text-gray-700 text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
            >
              Fechar Painel
            </button>
            <button
              onClick={handlePrint}
              className={`flex-1 md:flex-none px-4.5 py-2 text-white text-xs font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-95 ${
                printLayout === 'thermal'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <Printer size={15} />
              Imprimir {printLayout === 'thermal' ? 'Cupom' : 'Guia (A4)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
