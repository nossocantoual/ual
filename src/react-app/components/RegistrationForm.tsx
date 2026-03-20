import { useState, useEffect } from 'react';
import { UserPlus } from '@/react-app/components/Icons';
import { useApi } from '@/react-app/hooks/useApi';

interface RegistrationFormProps {
  theme?: string;
  userSession?: string;
  onRegistrationSuccess?: (message: string, status: string) => void;
}

export default function RegistrationForm({ theme = 'default', userSession, onRegistrationSuccess }: RegistrationFormProps) {
  const getAccentColor = () => {
    switch (theme) {
      case 'ere':
        return { from: 'from-pink-400', to: 'to-blue-400', ring: 'ring-pink-400', bg: 'bg-pink-400', bgHover: 'bg-pink-500' };
      case 'boiadeiro':
        return { from: 'from-teal-500', to: 'to-cyan-600', ring: 'ring-teal-400', bg: 'bg-teal-500', bgHover: 'bg-teal-600' };
      case 'cigano':
        return { from: 'from-amber-600', to: 'to-orange-600', ring: 'ring-amber-400', bg: 'bg-amber-600', bgHover: 'bg-amber-700' };
      case 'exu':
        return { from: 'from-red-500', to: 'to-red-700', ring: 'ring-red-400', bg: 'bg-red-500', bgHover: 'bg-red-600' };
      case 'bahiano':
        return { from: 'from-yellow-400', to: 'to-amber-500', ring: 'ring-yellow-400', bg: 'bg-yellow-400', bgHover: 'bg-yellow-500' };
      case 'preto-velho':
        return { from: 'from-gray-600', to: 'to-gray-800', ring: 'ring-gray-400', bg: 'bg-gray-600', bgHover: 'bg-gray-700' };
      case 'caboclo':
        return { from: 'from-green-500', to: 'to-emerald-600', ring: 'ring-green-400', bg: 'bg-green-500', bgHover: 'bg-green-600' };
      case 'malandro':
        return { from: 'from-red-500', to: 'to-rose-600', ring: 'ring-red-400', bg: 'bg-red-500', bgHover: 'bg-red-600' };
      case 'marinheiro':
        return { from: 'from-cyan-400', to: 'to-sky-500', ring: 'ring-cyan-400', bg: 'bg-cyan-400', bgHover: 'bg-cyan-500' };
      default:
        return { from: 'from-amber-400', to: 'to-orange-500', ring: 'ring-amber-400', bg: 'bg-amber-400', bgHover: 'bg-amber-500' };
    }
  };

  const colors = getAccentColor();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [confirmWhatsapp, setConfirmWhatsapp] = useState('');
  const [validationError, setValidationError] = useState('');
  const [formStarted, setFormStarted] = useState(false);
  const [formStartTime, setFormStartTime] = useState<number | null>(null);
  const [abandonTracked, setAbandonTracked] = useState(false);
  const [inactivityTimeoutId, setInactivityTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { call, loading, error, setError } = useApi();

  // When there's an API error, notify parent to show large message
  useEffect(() => {
    if (error && onRegistrationSuccess) {
      onRegistrationSuccess(error, 'error');
      // Clear the error so it doesn't keep triggering
      setError(null);
    }
  }, [error, onRegistrationSuccess, setError]);

  // Track form abandon when user closes app/tab or switches tabs
  useEffect(() => {
    const trackAbandon = () => {
      if (formStarted && formStartTime && !abandonTracked && userSession) {
        setAbandonTracked(true);
        // Use sendBeacon with proper blob format
        const blob = new Blob(
          [JSON.stringify({
            event_type: 'form_abandon',
            user_session: userSession,
          })],
          { type: 'application/json' }
        );
        navigator.sendBeacon('/api/analytics/track', blob);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackAbandon();
      }
    };

    const handleBeforeUnload = () => {
      trackAbandon();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formStarted, formStartTime, abandonTracked, userSession]);

  const trackFormCompletion = () => {
    if (userSession) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'register_click',
          user_session: userSession,
        }),
      }).catch(() => {});
    }
  };

  const trackFormStart = () => {
    if (!formStarted && userSession) {
      setFormStarted(true);
      const startTime = Date.now();
      setFormStartTime(startTime);
      
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'form_start',
          user_session: userSession,
        }),
      }).catch(() => {});
      
      // Set timeout to track abandon after 45 seconds
      setTimeout(() => {
        // Check if form was submitted (formStartTime would be null if submitted)
        if (formStartTime === startTime && !abandonTracked) {
          setAbandonTracked(true);
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'form_abandon',
              user_session: userSession,
            }),
          }).catch(() => {});
        }
      }, 45000); // 45 seconds
    }
  };

  // Clear form after 3 minutes of inactivity
  useEffect(() => {
    // Only start timer if user has entered any data
    if (firstName || lastName || whatsapp || confirmWhatsapp) {
      // Clear any existing inactivity timeout
      if (inactivityTimeoutId) {
        clearTimeout(inactivityTimeoutId);
      }
      
      // Set new timeout for 3 minutes (180000ms)
      const timeoutId = setTimeout(() => {
        // Clear all form fields
        setFirstName('');
        setLastName('');
        setWhatsapp('');
        setConfirmWhatsapp('');
        setFormStarted(false);
        setFormStartTime(null);
        setAbandonTracked(false);
        setError(null);
        
        // Show alert to user
        alert('⏱️ Seu formulário foi limpo devido à inatividade. Por favor, preencha novamente para se inscrever.');
      }, 180000); // 3 minutes
      
      setInactivityTimeoutId(timeoutId);
      
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [firstName, lastName, whatsapp, confirmWhatsapp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationError('');
    
    // Validate WhatsApp confirmation
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    const cleanConfirmWhatsapp = confirmWhatsapp.replace(/\D/g, '');
    
    if (cleanWhatsapp !== cleanConfirmWhatsapp) {
      setValidationError('O número de WhatsApp está errado, favor corrigir.');
      return;
    }
    
    // Clear form start time to prevent abandon tracking
    setFormStartTime(null);

    // Clear inactivity timeout when user submits
    if (inactivityTimeoutId) {
      clearTimeout(inactivityTimeoutId);
      setInactivityTimeoutId(null);
    }

    const result = await call<{ success: boolean; message: string; status: string }>(
      '/api/register',
      {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          whatsapp: cleanWhatsapp,
        }),
      }
    );

    if (result?.success) {
      // Track successful form completion
      trackFormCompletion();
      
      // Clear form fields
      setFirstName('');
      setLastName('');
      setWhatsapp('');
      setConfirmWhatsapp('');
      setFormStarted(false);
      
      // Notify parent component of successful registration
      if (onRegistrationSuccess) {
        onRegistrationSuccess(result.message, result.status);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 bg-gradient-to-br ${colors.from} ${colors.to} rounded-xl shadow-lg`}>
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Inscrição</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Nome
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={trackFormStart}
              required
              className={`w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:${colors.ring} focus:border-transparent transition-all`}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Sobrenome
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="Seu sobrenome"
            />
          </div>

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
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="11999999999"
            />
            <p className="text-xs text-white/70 mt-1">Digite seu número com DDD (11 dígitos: DDD + 9 dígitos)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Confirmar número de WhatsApp
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
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="11999999999"
            />
            <p className="text-xs text-white/70 mt-1">Digite novamente o número com DDD (11 dígitos: DDD + 9 dígitos)</p>
          </div>

          {validationError && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-200 text-sm">{validationError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Inscrever-se'}
          </button>
        </form>
      </div>
    </div>
  );
}
