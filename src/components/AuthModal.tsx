import React, { useState } from 'react';
import { Mail, Phone, User, X, Check, Award, Lock, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { db } from '../lib/supabase';
import { User as UserType } from '../types';

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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
  pointsActive: boolean;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess, pointsActive }: AuthModalProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Registration specific states
  const [regName, setRegName] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regNeighborhood, setRegNeighborhood] = useState('');
  const [regStreetNumber, setRegStreetNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const handleForgotPassword = async () => {
    setError('');
    setRecoveryMessage('');
    if (!contact.trim()) {
      setError('Por favor, informe primeiro seu E-mail ou WhatsApp no campo de contato.');
      return;
    }
    
    setLoading(true);
    try {
      const result = await db.resetUserPassword(contact);
      if (result.success) {
        setRecoveryMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Erro ao enviar solicitação de recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoveryMessage('');
    setLoading(true);

    if (authTab === 'login') {
      if (!contact.trim()) {
        setError('Por favor, informe seu e-mail ou WhatsApp.');
        setLoading(false);
        return;
      }

      if (activeTab === 'email' && !contact.includes('@')) {
        setError('Por favor, insira um e-mail válido.');
        setLoading(false);
        return;
      }

      if (activeTab === 'whatsapp') {
        const whatsappFormatRegex = /^\d{2} \d \d{4}-\d{4}$/;
        if (!whatsappFormatRegex.test(contact)) {
          setError('O WhatsApp deve estar exatamente no formato: ## # ####-####');
          setLoading(false);
          return;
        }
      }

      if (!password.trim()) {
        setError('Por favor, informe uma senha para proteger sua conta.');
        setLoading(false);
        return;
      }

      try {
        const user = await db.loginOrRegister(contact, '', password);
        setSuccess(true);
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
          setSuccess(false);
          setName('');
          setContact('');
          setPassword('');
        }, 1500);
      } catch (err: any) {
        if (err.message === 'PASSWORD_INCORRECT') {
          setError('Senha incorreta! Se esqueceu sua senha, insira seu contato no campo e clique em "Esqueci minha senha" abaixo.');
        } else {
          setError('Não foi possível realizar o login. Se você é novo por aqui, por favor, clique em "Criar Conta" acima.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Registration specific handler
      if (!regName.trim() || !regWhatsapp.trim() || !regCity.trim() || !regNeighborhood.trim() || !regStreetNumber.trim()) {
        setError('Preencha todos os campos obrigatórios (*).');
        setLoading(false);
        return;
      }

      const whatsappFormatRegex = /^\d{2} \d \d{4}-\d{4}$/;
      if (!whatsappFormatRegex.test(regWhatsapp)) {
        setError('O WhatsApp deve estar exatamente no formato: ## # ####-####');
        setLoading(false);
        return;
      }

      if (!regPassword.trim()) {
        setError('Por favor, informe uma senha para proteger sua conta.');
        setLoading(false);
        return;
      }

      try {
        const user = await db.registerClient({
          name: regName.trim(),
          email: regEmail.trim() || undefined,
          whatsapp: regWhatsapp.trim(),
          city: regCity.trim(),
          neighborhood: regNeighborhood.trim(),
          streetNumber: regStreetNumber.trim(),
          password: regPassword.trim(),
        });

        setSuccess(true);
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
          setSuccess(false);
          // Clean states
          setRegName('');
          setRegWhatsapp('');
          setRegEmail('');
          setRegCity('');
          setRegNeighborhood('');
          setRegStreetNumber('');
          setRegPassword('');
        }, 1500);
      } catch (err: any) {
        setError('Erro ao realizar o cadastro. O e-mail ou WhatsApp digitado já pode estar em uso.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div 
        id="auth-modal"
        className="bg-white/85 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden text-gray-800 border border-white/55"
      >
        {/* Top Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-700 via-rose-600 to-emerald-700" />

        {/* Modal Header */}
        <div className="p-6 pb-2 flex justify-between items-center border-b border-gray-150/40">
          <div>
            <h3 className="text-xl font-bold text-gray-950">Seja Bem-vindo!</h3>
            <p className="text-xs text-gray-500 mt-1">
              {authTab === 'login' ? 'Acesse sua conta em segundos' : 'Crie sua conta no Clube O Favorito'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/60 rounded-full transition-colors text-gray-400 hover:text-gray-650"
            id="close-auth-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs for Entrar vs Criar Conta */}
        <div className="px-6 pt-3 grid grid-cols-2 text-center text-xs border-b border-gray-100" id="auth-mode-selector">
          <button
            type="button"
            className={`pb-2.5 font-bold border-b-2 text-sm tracking-wider uppercase transition-all cursor-pointer ${
              authTab === 'login'
                ? 'border-emerald-600 text-emerald-800 font-black'
                : 'border-transparent text-gray-450 hover:text-gray-600'
            }`}
            onClick={() => {
              setAuthTab('login');
              setError('');
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`pb-2.5 font-bold border-b-2 text-sm tracking-wider uppercase transition-all cursor-pointer ${
              authTab === 'register'
                ? 'border-emerald-600 text-emerald-800 font-black'
                : 'border-transparent text-gray-450 hover:text-gray-600'
            }`}
            onClick={() => {
              setAuthTab('register');
              setError('');
            }}
          >
            Criar Conta
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8 animate-scaleUp">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <Check size={32} />
              </div>
              <h4 className="text-lg font-bold text-emerald-800">
                {authTab === 'login' ? 'Conectado com sucesso!' : 'Conta criada com sucesso!'}
              </h4>
              <p className="text-sm text-emerald-600 mt-1">Carregando seus dados...</p>
              
              {pointsActive && (
                <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full text-xs text-emerald-700 border border-emerald-100">
                  <Award size={16} />
                  <span>Você ganhou <strong>+10 pontos</strong> de Boas-vindas!</span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100 font-medium animate-pulse">
                  ⚠️ {error}
                </div>
              )}

              {/* Recovery success Alert */}
              {recoveryMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-100 font-medium">
                  {recoveryMessage}
                </div>
              )}

              {authTab === 'login' ? (
                <>
                  {/* Login Method Tabs */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-200/50 p-1 rounded-xl border border-white/20">
                    <button
                      type="button"
                      className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'email'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                      }`}
                      onClick={() => {
                        setActiveTab('email');
                        setContact('');
                      }}
                      id="tab-email"
                    >
                      <Mail size={14} />
                      E-mail
                    </button>
                    <button
                      type="button"
                      className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'whatsapp'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                      }`}
                      onClick={() => {
                        setActiveTab('whatsapp');
                        setContact('');
                      }}
                      id="tab-whatsapp"
                    >
                      <Phone size={14} />
                      WhatsApp
                    </button>
                  </div>

                  {/* Dynamic Contact Field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      {activeTab === 'email' ? 'Endereço de E-mail' : 'Número do WhatsApp'}
                    </label>
                    <div className="relative">
                      {activeTab === 'email' ? (
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={18} />
                      ) : (
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={18} />
                      )}
                      <input
                        type={activeTab === 'email' ? 'email' : 'tel'}
                        required
                        placeholder={activeTab === 'email' ? 'exemplo@email.com' : '## # ####-####'}
                        maxLength={activeTab === 'email' ? undefined : 14}
                        value={contact}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === 'whatsapp') {
                            setContact(formatWhatsAppNumber(val));
                          } else {
                            setContact(val);
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-green-100 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                        id="auth-contact-input"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Senha de Acesso</label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[10px] text-emerald-750 hover:text-emerald-950 font-bold hover:underline cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Sua senha de segurança"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-green-100 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                        id="auth-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-800/40 hover:text-emerald-800 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Register Fields */}
                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nome Completo *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={16} />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Eduardo Souza Morais"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                          id="reg-name-input"
                        />
                      </div>
                    </div>

                    {/* WhatsApp & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">WhatsApp *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={16} />
                          <input
                            type="tel"
                            required
                            placeholder="31 9 8944-9722"
                            value={regWhatsapp}
                            onChange={(e) => setRegWhatsapp(formatWhatsAppNumber(e.target.value))}
                            maxLength={14}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-mono font-bold"
                            id="reg-whatsapp-input"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">E-mail (Opcional)</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={16} />
                          <input
                            type="email"
                            placeholder="Ex: eduardo@email.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                            id="reg-email-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address components: Cidade, Bairro, Rua/Nº */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Cidade *</label>
                        <input
                          type="text"
                          required
                          placeholder="Cidade"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                          id="reg-city-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Bairro *</label>
                        <input
                          type="text"
                          required
                          placeholder="Bairro"
                          value={regNeighborhood}
                          onChange={(e) => setRegNeighborhood(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                          id="reg-neighborhood-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Rua / Nº *</label>
                        <input
                          type="text"
                          required
                          placeholder="Rua, número"
                          value={regStreetNumber}
                          onChange={(e) => setRegStreetNumber(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                          id="reg-street-input"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Senha de Acesso *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={16} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Crie sua senha de segurança"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                          id="reg-password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-850/50 hover:text-emerald-800 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Benefit Box */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                <Award className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-emerald-800 block">Clube O Favorito</span>
                  <span className="text-[11px] text-emerald-600 block">
                    {pointsActive ? (
                      authTab === 'login' 
                        ? 'Ganhe pontos em todas as compras e troque por descontos em dinheiro no fechamento!' 
                        : 'Registre-se hoje e ganhe +10 pontos de Boas-vindas para usar em seus pedidos!'
                    ) : (
                      authTab === 'login'
                        ? 'Entre para fazer suas compras com rapidez e facilidade.'
                        : 'Cadastre-se para aproveitar ofertas incríveis e compras fáceis!'
                    )}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-green-600/10 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-sm"
                id="auth-submit-button"
              >
                {loading ? 'Processando...' : authTab === 'login' ? 'Entrar na Conta' : (pointsActive ? 'Cadastrar e Ganhar Pontos' : 'Finalizar Cadastro')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
