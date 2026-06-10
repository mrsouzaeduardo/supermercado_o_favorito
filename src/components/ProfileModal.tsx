import React, { useState, useEffect } from 'react';
import { Mail, Phone, User, X, Check, MapPin, Building, Home, Save, LogOut } from 'lucide-react';
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

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onUpdateSuccess: (updatedUser: UserType) => void;
  onLogout?: () => void;
}

export default function ProfileModal({ isOpen, onClose, user, onUpdateSuccess, onLogout }: ProfileModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName((user.name || '').trim().toUpperCase());
      setEmail(user.email || '');
      setWhatsapp(user.whatsapp ? formatWhatsAppNumber(user.whatsapp) : '');
      setCity((user.city || '').trim().toUpperCase());
      setNeighborhood((user.neighborhood || '').trim().toUpperCase());
      setStreetNumber((user.streetNumber || '').trim().toUpperCase());
      setError('');
      setSuccess(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!name.trim()) {
      setError('Por favor, informe seu Nome Completo.');
      return;
    }

    if (!city.trim() || !neighborhood.trim() || !streetNumber.trim()) {
      setError('Por favor, preencha as informações completas do endereço (Cidade, Bairro, Rua e nº).');
      return;
    }

    setLoading(true);
    try {
      const cleanWhatsapp = whatsapp.replace(/\D/g, '');
      const updated = await db.updateClientProfile(user.id, {
        name: name.trim().toUpperCase(),
        email: email.trim() || undefined,
        whatsapp: cleanWhatsapp || undefined,
        city: city.trim().toUpperCase(),
        neighborhood: neighborhood.trim().toUpperCase(),
        streetNumber: streetNumber.trim().toUpperCase()
      });

      setSuccess(true);
      setTimeout(() => {
        onUpdateSuccess(updated);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-[150] flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn" id="profile-modal-overlay">
      <div className="bg-[#fcfdfa]/95 border border-white/50 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden relative" id="profile-modal-box">
        {/* Decorative Top Accent Bar */}
        <div className="h-2.5 bg-emerald-600 w-full" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex justify-between items-center border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <span className="w-2 h-2 rounded-full bg-emerald-600 block animate-ping" />
              Editar Meu Perfil
            </h3>
            <p className="text-[10px] text-gray-500 font-semibold mt-0.5 uppercase tracking-wide">
              Mantenha seus dados e endereço de entrega sempre atualizados
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 hover:bg-white/60 rounded-full transition-colors text-gray-400 hover:text-gray-650 cursor-pointer"
            id="close-profile-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-750 text-xs rounded-lg border border-rose-100 font-bold animate-pulse">
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-6 animate-scaleUp">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <Check size={28} />
              </div>
              <h4 className="text-base font-bold text-emerald-800">
                Perfil atualizado com sucesso!
              </h4>
              <p className="text-xs text-emerald-600 mt-1">Sincronizando suas informações de entrega...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Actions Row (Near the Header) */}
              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    if (onLogout) {
                      onLogout();
                    }
                    onClose();
                  }}
                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                  id="profile-logout-button-top"
                  title="Sair da Conta"
                >
                  <LogOut size={13} />
                  <span>Sair da Conta</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 hover:shadow-md hover:shadow-emerald-500/20 active:scale-98"
                  id="profile-save-button-top"
                  title="Salvar alterações de perfil"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                  Nome Completo
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: SEU NOME COMPLETO"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-bold"
                    id="profile-name-input"
                  />
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="email"
                    placeholder="corretamente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-medium"
                    id="profile-email-input"
                  />
                </div>
              </div>

              {/* Whatsapp field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                  WhatsApp / Celular com DDD
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="text"
                    placeholder="Ex: 11 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatWhatsAppNumber(e.target.value))}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-bold"
                    id="profile-whatsapp-input"
                  />
                </div>
              </div>

              {/* City & Neighborhood & Street */}
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-905 block mb-2">
                  Endereço Principal
                </span>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                        Cidade
                      </label>
                      <div className="relative">
                        <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: SÃO PAULO"
                          value={city}
                          onChange={(e) => setCity(e.target.value.toUpperCase())}
                          className="w-full pl-7.5 pr-2 py-1.8 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-bold"
                          id="profile-city-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                        Bairro
                      </label>
                      <div className="relative">
                        <Building size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: CENTRO"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value.toUpperCase())}
                          className="w-full pl-7.5 pr-2 py-1.8 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-bold"
                          id="profile-neighborhood-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block">
                      Logradouro, Rua, Nº / Complemento
                    </label>
                    <div className="relative">
                      <Home size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: RUA DAS FLORES, 123"
                        value={streetNumber}
                        onChange={(e) => setStreetNumber(e.target.value.toUpperCase())}
                        className="w-full pl-7.5 pr-3 py-1.8 bg-white border border-green-150 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all text-slate-850 font-bold"
                        id="profile-street-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Area */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (onLogout) {
                      onLogout();
                    }
                    onClose();
                  }}
                  className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                  id="profile-logout-button"
                  title="Sair da Conta"
                >
                  <LogOut size={13} />
                  <span>Sair da Conta</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 hover:shadow-md hover:shadow-emerald-500/20 active:scale-98"
                  id="profile-save-button"
                  title="Salvar alterações de perfil"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
