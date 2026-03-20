import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Settings as SettingsIcon, HelpCircle, Instagram } from '@/react-app/components/Icons';
import RegistrationForm from '@/react-app/components/RegistrationForm';
import CancellationForm from '@/react-app/components/CancellationForm';
import type { Settings } from '@/shared/types';

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recessActive, setRecessActive] = useState(false);
  const [recessData, setRecessData] = useState<any>(null);
  const [hasActiveEvent, setHasActiveEvent] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'confirmed' | 'waitlist' | 'waitlist_secondary' | 'error'>('confirmed');
  const [userSession] = useState(() => {
    // Generate a unique session ID for this visitor
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  useEffect(() => {
    // Track page view
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'page_view',
        user_session: userSession,
      }),
    }).catch(() => {});

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.recess_active) {
          setRecessActive(true);
          setRecessData(data.recess_data);
        }
        setHasActiveEvent(data.has_active_event !== false);
        setSettings(data);
      })
      .catch((error) => {
        console.error('Erro ao carregar configurações:', error);
        // Set default settings to allow page to load
        setSettings({
          max_capacity: 30,
          gira_text: 'Gira',
          header_text: 'Lista de presença',
          event_date: new Date().toISOString().split('T')[0],
          event_time: '19:30',
          registration_opens_at: new Date().toISOString().slice(0, 16),
          registration_closes_at: new Date().toISOString().slice(0, 16),
          logo_size: 256,
          theme_mode: 'auto',
        });
      });
    
    fetch('/api/upcoming-events')
      .then((res) => res.json())
      .then((data) => setUpcomingEvents(data))
      .catch(() => {
        // Silent fail for upcoming events
        setUpcomingEvents([]);
      });
  }, [userSession]);

  const getTheme = () => {
    // If manual mode, return 'manual' to use custom colors
    if (settings?.theme_mode === 'manual') return 'manual';
    
    if (!settings?.gira_text) return 'default';
    const text = settings.gira_text.toLowerCase();
    
    // Check for Erê theme (light blue and pink)
    if (/er[eê]s?/i.test(text)) return 'ere';
    
    // Check for Boiadeiro theme (petrol blue and white)
    if (/boiadeiros?|boiadeiras?/i.test(text)) return 'boiadeiro';
    
    // Check for Cigano theme (brown and orange)
    if (/ciganos?|ciganas?|oriente/i.test(text)) return 'cigano';
    
    // Check for Marinheiro theme (light blue and white)
    if (/marinheiros?|marinheiras?/i.test(text)) return 'marinheiro';
    
    // Check for Malandro theme (red and white)
    if (/malandros?|malandras?/i.test(text)) return 'malandro';
    
    // Check for Caboclo theme (green)
    if (/caboclos?|caboclas?/i.test(text)) return 'caboclo';
    
    // Check for Preto Velho theme (black and white)
    if (/pretos?\s*velhos?|pretas?\s*velhas?/i.test(text)) return 'preto-velho';
    
    // Check for Bahiano theme (yellow)
    if (/bah?ianos?/i.test(text)) return 'bahiano';
    
    // Check for Exu theme (black and red)
    if (/ex[uú]|esquerda|pombagiras?|mirins?/i.test(text)) return 'exu';
    
    return 'default';
  };

  const theme = getTheme();
  
  // Get custom gradient style if manual mode
  const getCustomGradient = () => {
    if (theme !== 'manual' || !settings?.theme_color_1) return null;
    
    if (settings.theme_color_2) {
      return `linear-gradient(135deg, ${settings.theme_color_1} 0%, ${settings.theme_color_2} 100%)`;
    }
    return settings.theme_color_1;
  };
  
  const customGradient = getCustomGradient();
  
  const themeConfig = {
    default: {
      bg: 'bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900',
      glow1: 'bg-amber-400/20',
      glow2: 'bg-orange-400/20',
    },
    ere: {
      bg: 'bg-gradient-to-br from-blue-300 via-pink-300 to-blue-200',
      glow1: 'bg-pink-200/40',
      glow2: 'bg-blue-200/40',
    },
    boiadeiro: {
      bg: 'bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700',
      glow1: 'bg-white/20',
      glow2: 'bg-teal-300/20',
    },
    cigano: {
      bg: 'bg-gradient-to-br from-amber-800 via-orange-600 to-amber-700',
      glow1: 'bg-orange-400/30',
      glow2: 'bg-amber-500/30',
    },
    exu: {
      bg: 'bg-gradient-to-br from-black via-red-950 to-black',
      glow1: 'bg-red-600/20',
      glow2: 'bg-red-700/20',
    },
    bahiano: {
      bg: 'bg-gradient-to-br from-yellow-600 via-yellow-500 to-amber-600',
      glow1: 'bg-yellow-300/30',
      glow2: 'bg-amber-400/30',
    },
    'preto-velho': {
      bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-black',
      glow1: 'bg-white/10',
      glow2: 'bg-gray-400/10',
    },
    caboclo: {
      bg: 'bg-gradient-to-br from-green-800 via-green-700 to-emerald-900',
      glow1: 'bg-green-400/20',
      glow2: 'bg-emerald-400/20',
    },
    malandro: {
      bg: 'bg-gradient-to-br from-red-600 via-red-500 to-rose-600',
      glow1: 'bg-white/20',
      glow2: 'bg-red-300/20',
    },
    marinheiro: {
      bg: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-400',
      glow1: 'bg-white/30',
      glow2: 'bg-cyan-200/30',
    },
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="animate-pulse text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // If no active event and no recess, show default page
  if (!hasActiveEvent && !recessActive) {
    return (
      <div 
        className="min-h-screen relative overflow-hidden flex flex-col bg-gradient-to-br from-gray-900 via-slate-900 to-black"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Admin button */}
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="flex justify-end">
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="text-sm">Admin</span>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <button onClick={() => window.location.reload()} className="mx-auto mb-8 flex items-center justify-center px-4 cursor-pointer bg-transparent border-0 p-0">
              <img
                src="https://019ab248-9886-7167-b4cd-efcb846f09f0.mochausercontent.com/Untitled-design.png"
                alt="Logo UAL"
                style={{ maxWidth: '400px', maxHeight: '400px' }}
                className="w-full h-auto object-contain rounded-full"
              />
            </button>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl max-w-xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                Nosso Canto de Umbanda Amor e Luz
              </h1>
            </div>
          </div>
        </div>

        {/* Instagram Link */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 pb-4">
          <span className="text-white/80 text-sm font-medium">Siga o Nosso Canto no Instagram:</span>
          <a
            href="https://www.instagram.com/nossocantoual/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Instagram className="w-5 h-5" />
            <span className="font-medium">@nossocantoual</span>
          </a>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-white/60 text-sm italic">
            Developed by Hugo Rodrigues
          </p>
        </div>
      </div>
    );
  }

  // If no active event and no recess, show default page
  if (!settings.has_active_event && !recessActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black relative overflow-hidden flex flex-col">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Admin button */}
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="flex justify-end">
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="text-sm">Admin</span>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <button onClick={() => window.location.reload()} className="mx-auto mb-8 flex items-center justify-center cursor-pointer px-4 bg-transparent border-0 p-0">
              <img
                src="https://019ab248-9886-7167-b4cd-efcb846f09f0.mochausercontent.com/Untitled-design.png"
                alt="Logo UAL"
                className="object-contain shadow-2xl border border-white/10 rounded-full w-full h-auto"
                style={{ maxWidth: '400px', maxHeight: '400px' }}
              />
            </button>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
              Nosso Canto de Umbanda Amor e Luz
            </h1>
          </div>
        </div>

        {/* Instagram Link */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 pb-4">
          <span className="text-white/80 text-sm font-medium">Siga o Nosso Canto no Instagram:</span>
          <a
            href="https://www.instagram.com/nossocantoual/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Instagram className="w-5 h-5" />
            <span className="font-medium">@nossocantoual</span>
          </a>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-white/60 text-sm italic">
            Developed by Hugo Rodrigues
          </p>
        </div>
      </div>
    );
  }
  
  // If recess is active, show recess screen
  if (recessActive && recessData) {
    const recessGradient = `linear-gradient(135deg, ${recessData.theme_color_1} 0%, ${recessData.theme_color_2} 100%)`;
    
    return (
      <div 
        className="min-h-screen relative overflow-hidden flex flex-col"
        style={{ background: recessGradient }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Admin button */}
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="flex justify-end">
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="text-sm">Admin</span>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            {recessData.image_url && (
              <button onClick={() => window.location.reload()} className="flex justify-center items-center mb-8 w-full cursor-pointer bg-transparent border-0 p-0">
                <img
                  src={recessData.image_url}
                  alt="Recesso"
                  style={{ 
                    maxWidth: `min(${recessData.image_size || 256}px, calc(100vw - 2rem))`,
                    maxHeight: `min(${recessData.image_size || 256}px, calc(100vw - 2rem))`
                  }}
                  className="rounded-full shadow-2xl border border-white/10 p-1 object-contain w-auto h-auto"
                />
              </button>
            )}
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl max-w-xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg mb-4">
                Estamos em Recesso
              </h1>
              <p className="text-white/90 text-base mb-3">
                Período de recesso: {new Date(recessData.start_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })} até {new Date(recessData.end_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </p>
              <p className="text-white/80 text-base whitespace-pre-line">
                {recessData.message || 'Voltaremos em breve. Agradecemos a compreensão! 🙏'}
              </p>
            </div>
          </div>
        </div>

        {/* Instagram Link */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 pb-4">
          <span className="text-white/80 text-sm font-medium">Siga o Nosso Canto no Instagram:</span>
          <a
            href="https://www.instagram.com/nossocantoual/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Instagram className="w-5 h-5" />
            <span className="font-medium">@nossocantoual</span>
          </a>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-white/60 text-sm italic">
            Developed by Hugo Rodrigues
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${theme === 'manual' ? '' : themeConfig[theme].bg}`}
      style={theme === 'manual' && customGradient ? { background: customGradient } : undefined}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 ${theme === 'manual' ? 'bg-white/10' : themeConfig[theme].glow1} rounded-full blur-3xl`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${theme === 'manual' ? 'bg-white/10' : themeConfig[theme].glow2} rounded-full blur-3xl`}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 pb-24">
        {/* Admin button */}
        <div className="flex justify-end mb-8">
          <Link
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="text-sm">Admin</span>
          </Link>
        </div>

        {/* Logo and header */}
        <div className="text-center mb-12">
          <button onClick={() => window.location.reload()} className="flex justify-center items-center mb-6 w-full cursor-pointer bg-transparent border-0 p-0">
            <img
              src={settings.logo_url || "https://mocha-cdn.com/019ab248-9886-7167-b4cd-efcb846f09f0/WhatsApp-Image-2025-11-26-at-10.34.08.jpeg"}
              alt="Logo UAL"
              style={{ 
                maxWidth: `min(${settings.logo_size || 256}px, calc(100vw - 2rem))`,
                maxHeight: `min(${settings.logo_size || 256}px, calc(100vw - 2rem))`
              }}
              className="rounded-full shadow-2xl border border-white/10 p-1 object-contain w-auto h-auto"
            />
          </button>
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">
              {settings.header_text}
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              {settings.gira_prefix && <span>{settings.gira_prefix} </span>}
              {settings.gira_text}
            </h2>
          </div>
          <div className="space-y-2">
            <p className="text-white/90 text-xl font-semibold">
              Data: {new Date(settings.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
            <p className="text-white/90 text-xl font-semibold">
              Horário: {settings.event_time}
            </p>
            <p className="text-white/80 text-lg mt-4">
              Período de inscrição: {new Date(settings.registration_opens_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} até {new Date(settings.registration_closes_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Forms */}
        <div className="max-w-2xl mx-auto space-y-8">
          {showMessage ? (
            <>
              {/* Large message display */}
              <div className={`bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-12 border ${
                messageType === 'error' 
                  ? 'border-red-500/50' 
                  : messageType === 'waitlist' || messageType === 'waitlist_secondary'
                  ? 'border-orange-500/50'
                  : 'border-green-500/50'
              }`}>
                <p className={`text-3xl md:text-4xl font-bold text-center leading-relaxed ${
                  messageType === 'error'
                    ? 'text-red-200'
                    : messageType === 'waitlist' || messageType === 'waitlist_secondary'
                    ? 'text-orange-200'
                    : 'text-green-200'
                }`}>
                  {messageText}
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="text-center space-y-4">
                <button
                  onClick={() => {
                    setShowMessage(false);
                    setShowCancel(false);
                  }}
                  className="py-3 px-6 bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-red-700 transition-all duration-300"
                >
                  Cancelar minha inscrição
                </button>
                <div>
                  <a
                    href="https://wa.me/5519997972276?text=Ol%C3%A1%2C%20eu%20preciso%20de%20ajuda%20da%20equipe%20do%20UAL%21"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300"
                  >
                    <HelpCircle className="w-5 h-5" />
                    Ajuda
                  </a>
                </div>
                
                {/* Instagram Link */}
                <div className="flex flex-col items-center gap-2 mt-4">
                  <span className="text-white/80 text-sm font-medium">Siga o Nosso Canto no Instagram:</span>
                  <a
                    href="https://www.instagram.com/nossocantoual/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="font-medium">@nossocantoual</span>
                  </a>
                </div>
              </div>
            </>
          ) : !showCancel ? (
            <>
              <RegistrationForm 
                theme={theme} 
                userSession={userSession}
                onRegistrationSuccess={(message, status) => {
                  setMessageText(message);
                  if (status === 'error') {
                    setMessageType('error');
                  } else if (status === 'waitlist') {
                    setMessageType('waitlist');
                  } else if (status === 'waitlist_secondary') {
                    setMessageType('waitlist_secondary');
                  } else {
                    setMessageType('confirmed');
                  }
                  setShowMessage(true);
                }}
              />
              <div className="text-center space-y-4">
                <button
                  onClick={() => setShowCancel(true)}
                  className="py-3 px-6 bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-red-700 transition-all duration-300"
                >
                  Cancelar minha inscrição
                </button>
                <div>
                  <a
                    href="https://wa.me/5519997972276?text=Ol%C3%A1%2C%20eu%20preciso%20de%20ajuda%20da%20equipe%20do%20UAL%21"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300"
                  >
                    <HelpCircle className="w-5 h-5" />
                    Ajuda
                  </a>
                </div>
                
                {/* Instagram Link */}
                <div className="flex flex-col items-center gap-2 mt-4">
                  <span className="text-white/80 text-sm font-medium">Siga o Nosso Canto no Instagram:</span>
                  <a
                    href="https://www.instagram.com/nossocantoual/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="font-medium">@nossocantoual</span>
                  </a>
                </div>
              </div>
            </>
          ) : (
            <>
              <CancellationForm theme={theme} />
              <div className="text-center space-y-4">
                <button
                  onClick={() => {
                    setShowCancel(false);
                    setShowMessage(false);
                  }}
                  className="text-white/80 hover:text-white underline transition-colors"
                >
                  Voltar para inscrição
                </button>
                <div>
                  <a
                    href="https://wa.me/5519997972276?text=Ol%C3%A1%2C%20eu%20preciso%20de%20ajuda%20da%20equipe%20do%20UAL%21"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300"
                  >
                    <HelpCircle className="w-5 h-5" />
                    Ajuda
                  </a>
                </div>
                
                {/* Instagram Link */}
                <div className="flex flex-col items-center gap-2 mt-4">
                  <span className="text-white/80 text-sm font-medium">Siga o Nosso Canto no Instagram:</span>
                  <a
                    href="https://www.instagram.com/nossocantoual/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="font-medium">@nossocantoual</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Próximos Eventos</h3>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="text-white font-semibold text-lg mb-1">
                      {event.gira_text}
                    </div>
                    <div className="text-white/80 text-sm space-y-1">
                      <div>
                        Data: {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                          timeZone: 'America/Sao_Paulo', 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })} às {event.event_time}
                      </div>
                      <div>
                        Inscrições: {new Date(event.registration_opens_at).toLocaleString('pt-BR', { 
                          timeZone: 'America/Sao_Paulo', 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} até {new Date(event.registration_closes_at).toLocaleString('pt-BR', { 
                          timeZone: 'America/Sao_Paulo', 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-6">
          <p className="text-white/60 text-sm italic">
            Developed by Hugo Rodrigues
          </p>
        </div>
      </div>
    </div>
  );
}
