import { useState } from 'react';
import { UserX } from '@/react-app/components/Icons';
import { useApi } from '@/react-app/hooks/useApi';

interface CancellationFormProps {
  theme?: string;
}

export default function CancellationForm({ theme = 'default' }: CancellationFormProps) {
  const getAccentColor = () => {
    switch (theme) {
      case 'ere':
        return { from: 'from-pink-500', to: 'to-blue-500', ring: 'ring-pink-500', bgHover: 'bg-pink-600' };
      case 'boiadeiro':
        return { from: 'from-teal-600', to: 'to-cyan-700', ring: 'ring-teal-500', bgHover: 'bg-teal-700' };
      case 'cigano':
        return { from: 'from-amber-700', to: 'to-orange-700', ring: 'ring-amber-500', bgHover: 'bg-amber-800' };
      case 'exu':
        return { from: 'from-red-600', to: 'to-red-800', ring: 'ring-red-500', bgHover: 'bg-red-700' };
      case 'bahiano':
        return { from: 'from-yellow-500', to: 'to-amber-600', ring: 'ring-yellow-500', bgHover: 'bg-yellow-600' };
      case 'preto-velho':
        return { from: 'from-gray-700', to: 'to-gray-900', ring: 'ring-gray-500', bgHover: 'bg-gray-800' };
      case 'caboclo':
        return { from: 'from-green-600', to: 'to-emerald-700', ring: 'ring-green-500', bgHover: 'bg-green-700' };
      case 'malandro':
        return { from: 'from-red-600', to: 'to-rose-700', ring: 'ring-ring-red-500', bgHover: 'bg-red-700' };
      case 'marinheiro':
        return { from: 'from-cyan-500', to: 'to-sky-600', ring: 'ring-cyan-500', bgHover: 'bg-cyan-600' };
      default:
        return { from: 'from-red-400', to: 'to-red-600', ring: 'ring-red-400', bgHover: 'bg-red-500' };
    }
  };

  const colors = getAccentColor();
  const [whatsapp, setWhatsapp] = useState('');
  const [confirmWhatsapp, setConfirmWhatsapp] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { call, loading, error, setError } = useApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setError(null);

    // Validate WhatsApp numbers match
    if (whatsapp.replace(/\D/g, '') !== confirmWhatsapp.replace(/\D/g, '')) {
      setError('O número de WhatsApp está errado, favor corrigir.');
      return;
    }

    const result = await call<{ success: boolean; message: string; whatsapp_contact_number?: string | null }>(
      '/api/cancel',
      {
        method: 'POST',
        body: JSON.stringify({
          whatsapp: whatsapp.replace(/\D/g, ''),
        }),
      }
    );

    if (result?.success) {
      setSuccessMessage(result.message);
      setWhatsapp('');
      setConfirmWhatsapp('');
      
      // Abrir WhatsApp com mensagem de cancelamento
      if (result.whatsapp_contact_number) {
        const cancelMessage = 'Estou cancelando minha visita ao evento de hoje. Estou ciente de que estou sujeito(a) a não participar dos próximos eventos pelo período de 15 dias.';
        const cleanPhone = result.whatsapp_contact_number.replace(/\D/g, '');
        const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const whatsappUrl = `whatsapp://send?phone=${phoneWithDDI}&text=${encodeURIComponent(cancelMessage)}`;
        window.open(whatsappUrl, '_blank');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 bg-gradient-to-br ${colors.from} ${colors.to} rounded-xl shadow-lg`}>
            <UserX className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Desistir</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              WhatsApp
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                  setWhatsapp(value);
                }
              }}
              required
              pattern="\d{11}"
              maxLength={11}
              className={`w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:${colors.ring} focus:border-transparent transition-all`}
              placeholder="11999999999"
            />
            <p className="text-xs text-white/70 mt-1">Digite seu número com DDD (11 dígitos: DDD + 9 dígitos)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Confirmar WhatsApp
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={confirmWhatsapp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                  setConfirmWhatsapp(value);
                }
              }}
              required
              pattern="\d{11}"
              maxLength={11}
              className={`w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:${colors.ring} focus:border-transparent transition-all`}
              placeholder="11999999999"
            />
            <p className="text-xs text-white/70 mt-1">Digite o mesmo número novamente (11 dígitos: DDD + 9 dígitos)</p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
              <p className="text-green-200 text-sm">{successMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:${colors.bgHover} transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Processando...' : 'Confirmar Desistência'}
          </button>
        </form>
      </div>
    </div>
  );
}
