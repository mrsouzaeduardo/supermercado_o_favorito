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
  onOpenTerms?: () => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess, pointsActive, onOpenTerms }: AuthModalProps) {
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

  // Password Recovery Multi-step States
  const [recoveryStep, setRecoveryStep] = useState<'idle' | 'request' | 'verify'>('idle');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  if (!isOpen) return null;

  const handleForgotPasswordTrigger = () => {
    setError('');
    setRecoveryMessage('');
    // Prefill the email if user already typed it in the contact field
    if (contact.trim() && contact.includes('@')) {
      setRecoveryEmail(contact.trim());
    } else {
      setRecoveryEmail('');
    }
    setRecoveryStep('request');
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoveryMessage('');
    
    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido para receber o código.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: recoveryEmail })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRecoveryMessage(data.message);
        setRecoveryStep('verify');
      } else {
        setError(data.message || 'Erro ao solicitar código de recuperação.');
      }
    } catch (err) {
      setError('Sua solicitação de código falhou. Certifique-se de que o servidor backend está online.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecoveryMessage('');

    if (!verificationCode.trim() || verificationCode.trim().length !== 8) {
      setError('Por favor, informe o código de verificação alfanumérico exato de 8 caracteres.');
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setError('Sua nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/complete-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: recoveryEmail,
          code: verificationCode,
          newPassword: newPassword
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Redundancy: update password locally to support mock-local database fallback perfectly
        await db.resetUserPassword(recoveryEmail, newPassword);

        // Auto-login on reset password success
        try {
          const loggedInUser = await db.loginOrRegister(recoveryEmail, '', newPassword);
          setSuccess(true);
          setTimeout(() => {
            onLoginSuccess(loggedInUser);
            onClose();
            setSuccess(false);
            setRecoveryStep('idle');
            setRecoveryEmail('');
            setVerificationCode('');
            setNewPassword('');
            // Reset fields
            setName('');
            setContact('');
            setPassword('');
          }, 1500);
        } catch (loginErr) {
          // Fallback if direct login fails
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setRecoveryStep('idle');
            setRecoveryEmail('');
            setVerificationCode('');
            setNewPassword('');
            setContact(recoveryEmail);
            setPassword(newPassword);
          }, 1500);
        }
      } else {
        setError(data.message || 'Erro ao redefinir sua senha.');
      }
    } catch (err) {
      setError('Erro de comunicação para validação do código de segurança.');
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
        {recoveryStep === 'idle' && (
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
        )}

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
            recoveryStep === 'request' ? (
              <form onSubmit={handleSendResetCode} className="space-y-4">
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

                {/* Password Recovery Request Step */}
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-emerald-50/70 text-emerald-800 text-xs rounded-xl border border-emerald-100 flex items-start gap-2.5">
                    <HelpCircle className="text-emerald-700 mt-0.5 shrink-0" size={16} />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-emerald-800">Recuperação de Senha</span>
                      <span className="block text-[11px] text-emerald-600 leading-normal">
                        Para redefinir sua senha, digite abaixo seu e-mail cadastrado.
                        Enviaremos um código de verificação de <strong>8 caracteres alfanuméricos</strong> via SMTP.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Endereço de E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={18} />
                      <input
                        type="email"
                        required
                        placeholder="Digite seu e-mail cadastrado"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-green-150 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                        id="recovery-email-input"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('idle')}
                      className="w-1/2 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 transition-all text-xs cursor-pointer text-center"
                    >
                      Voltar ao Login
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md transition-all text-xs cursor-pointer text-center flex justify-center items-center"
                    >
                      {loading ? 'Processando...' : 'Obter Código'}
                    </button>
                  </div>
                </div>
              </form>
            ) : recoveryStep === 'verify' ? (
              <form onSubmit={handleCompleteReset} className="space-y-4">
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

                {/* Password Recovery Verification and Reset Step */}
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-emerald-50/70 text-emerald-850 text-xs rounded-xl border border-emerald-150 flex items-start gap-2.5">
                    <Check className="text-emerald-700 mt-0.5 shrink-0" size={16} />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-emerald-800">Código Enviado!</span>
                      <span className="block text-[11px] text-emerald-600 leading-normal">
                        O código alfanumérico de 8 caracteres foi enviado para <strong>{recoveryEmail}</strong>. Insira-o abaixo com sua nova senha:
                      </span>
                    </div>
                  </div>

                  {/* Verification Code */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block text-center">Código de Verificação (8 dígitos)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: A1B2C3D4"
                      maxLength={8}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-white border border-green-150 rounded-xl text-center text-xl focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-emerald-800 font-mono font-black tracking-widest uppercase"
                      id="verification-code-input"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Sua Nova Senha de Acesso</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-800/40" size={18} />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Crie sua nova senha de segurança"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-green-150 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                        id="new-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-800/50 hover:text-emerald-800 transition-colors"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('request')}
                      className="w-1/2 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 transition-all text-xs cursor-pointer text-center"
                    >
                      Reenviar Código
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md transition-all text-xs cursor-pointer text-center flex justify-center items-center"
                    >
                      {loading ? 'Processando...' : 'Confirmar Senha'}
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setRecoveryStep('idle')}
                      className="text-xs text-emerald-750 hover:text-emerald-950 font-bold hover:underline cursor-pointer"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                </div>
              </form>
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
                        onClick={handleForgotPasswordTrigger}
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
                          onChange={(e) => setRegName(e.target.value.toUpperCase())}
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
                          onChange={(e) => setRegCity(e.target.value.toUpperCase())}
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
                          onChange={(e) => setRegNeighborhood(e.target.value.toUpperCase())}
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
                          onChange={(e) => setRegStreetNumber(e.target.value.toUpperCase())}
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

                  {/* Terms of Use registration consent phrase */}
                  <div className="text-center pt-1.5 pb-0.5">
                    <p className="text-[10.5px] text-gray-500 font-bold leading-relaxed">
                      Ao se cadastrar você concorda com os{' '}
                      <button
                        type="button"
                        onClick={onOpenTerms}
                        className="text-emerald-700 hover:text-emerald-900 font-extrabold underline cursor-pointer"
                      >
                        termos de uso
                      </button>
                    </p>
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
          )
        )}
        </div>
      </div>
    </div>
  );
}
