import React from 'react';
import { X, ShieldCheck, Calendar, FileText, HelpCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-emerald-950/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div 
        id="terms-of-use-modal"
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden text-gray-800 border border-white/40 flex flex-col max-h-[85vh] animate-scaleUp"
      >
        {/* Top Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-700 shrink-0" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex justify-between items-center border-b border-gray-150/45 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-750 rounded-xl border border-emerald-100">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-950 font-display">Termos de Uso e Serviço</h3>
              <p className="text-xs text-gray-500 font-medium">Clube e Supermercado O Favorito</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
            id="close-terms-modal"
            title="Fechar Termos de Uso"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 font-medium leading-relaxed max-h-[60vh] no-scrollbar">
          
          {/* Last Update */}
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50/50 py-1.5 px-3 rounded-lg border border-emerald-100/50 w-fit">
            <Calendar size={12} />
            <span>Última atualização: Junho de 2026</span>
          </div>

          <p>
            Seja bem-vindo ao <strong>Supermercado O Favorito</strong>! Ao acessar nossa plataforma ou cadastrar-se em nosso clube de benefícios, você declara estar ciente e concordar integralmente com as seguintes condições de uso e prestação de serviço.
          </p>

          {/* Section 1 */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="text-emerald-700">1.</span> Objeto da Plataforma
            </h4>
            <p>
              O Favorito é uma plataforma digital que permite a visualização interativa do nosso catálogo de produtos (hortifrúti, açougue, padaria, mercearia, entre outros), inserção de itens no carrinho de compras, cadastro do cliente no programa de fidelidade, simulação/fechamento de pedidos, e acompanhamento em tempo real do progresso da separação e entrega.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="text-emerald-700">2.</span> Cadastro de Conta e Veracidade das Informações
            </h4>
            <p>
              Para finalizar compras ou assinar nosso programa de pontos, é obrigatório criar um perfil de acesso utilizando seu <strong>Nome Completo</strong>, <strong>Número de WhatsApp ativo</strong> e <strong>Endereço de Entrega preciso</strong> (incluindo Cidade, Bairro, Rua e Número). Você é o único responsável pela veracidade e exatidão das informações fornecidas, garantindo que nossas equipes efetuem a entrega no local correto.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="text-emerald-700">3.</span> Comunicação e Segurança de Acesso
            </h4>
            <p>
              Em caso de perda de senha, o sistema oferece um processo seguro de redefinição de credenciais via e-mail. Um código correspondente de 8 caracteres alfanuméricos gerados dinamicamente é disparado ao seu endereço via SMTP. O cliente compromete-se a guardar sua senha de forma confidencial, não a compartilhando com terceiros.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="text-emerald-700">4.</span> Programa de Fidelidade (Clube O Favorito)
            </h4>
            <p>
              O sistema de fidelidade acumula pontos de forma proporcional ao valor dos pedidos fechados. Os pontos acumulados estarão vinculados exclusivamente à sua conta e poderão ser convertidos em abatimento oficial de valores (desconto em dinheiro) no ato do checkout das compras seguintes, aplicados sobre o valor total de produtos ou taxa de entrega sob as regras vigentes do estabelecimento.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="text-emerald-700">5.</span> Privacidade de Dados (LGPD)
            </h4>
            <p>
              Em cumprimento à Lei Geral de Proteção de Dados (LGPD - nº 13.709/2018), declaramos que seus dados cadastrais (nome, e-mail, WhatsApp e endereço) são tratados de forma confidencial e segura pelo Supermercado O Favorito exclusivamente para a operacionalização dos pedidos, envio do código de segurança de login, processamento da entrega e cálculo das pontuações do clube. Seus dados nunca serão compartilhados, vendidos ou utilizados para spam de terceiros.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="text-emerald-700">6.</span> Disposições Finais e Regulação
            </h4>
            <p>
              Reservamo-nos o direito de atualizar estes Termos de Uso conforme evoluções da plataforma ou do estabelecimento. Interrupções técnicas ocasionais estão sujeitas à manutenção da hospedagem.
            </p>
          </div>

          {/* Support line */}
          <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-emerald-800">
            <HelpCircle size={14} className="shrink-0" />
            <span className="font-semibold text-[11px]">Dúvidas ou suporte? Entre em contato pelo WhatsApp (31) 3635-9495.</span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-gray-50 border-t border-gray-150/45 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white text-xs font-bold rounded-xl transition-all hover:scale-[1.01] shadow-md cursor-pointer"
            id="terms-accept-close-btn"
          >
            Entendi e Concordo
          </button>
        </div>
      </div>
    </div>
  );
}
