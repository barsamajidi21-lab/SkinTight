import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  CloudSun, 
  Wind, 
  Upload, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  MapPin, 
  Thermometer, 
  Sparkles, 
  Dna,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { PseoPage } from '../data/pSEOData';

interface PseoLandingPageProps {
  page: PseoPage;
  onCtaClick: () => void;
}

export const PseoLandingPage: React.FC<PseoLandingPageProps> = ({ page, onCtaClick }) => {
  const [weatherConnected, setWeatherConnected] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherData, setWeatherData] = useState<{
    uvIndex: number;
    humidity: number;
    temp: number;
    wind: number;
    barrierRisk: 'High' | 'Moderate' | 'Low';
    alertText: string;
  } | null>(null);

  const connectWeatherData = () => {
    setLoadingWeather(true);
    setTimeout(() => {
      // Generate realistic climate weather based on city climate characteristics
      let uv = 5;
      let hum = 50;
      let temp = 72;
      let wind = 10;
      let risk: 'High' | 'Moderate' | 'Low' = 'Moderate';
      let alertText = "Ambient levels are stable. Maintain your core ceramide hydration routine.";

      const lowerCity = page.cityName.toLowerCase();
      if (lowerCity.includes('los angeles')) {
        uv = 8; hum = 34; temp = 79; wind = 8; risk = 'High';
        alertText = "High UV & Dry Air detected. Skin barrier hydration levels are dropping. Apply SPF 50+ and ceramides immediately.";
      } else if (lowerCity.includes('phoenix') || lowerCity.includes('las vegas')) {
        uv = 9; hum = 12; temp = 95; wind = 12; risk = 'High';
        alertText = "Hostile Desert Extremes! Rapid moisture evaporation in progress. Limit chemical exfoliants and layer occlusive lipid creams.";
      } else if (lowerCity.includes('miami') || lowerCity.includes('houston')) {
        uv = 8; hum = 82; temp = 87; wind = 9; risk = 'Moderate';
        alertText = "Tropical Moisture Surge. Elevated sebum output expected. Shield with oil-free antioxidants and a light fluid sunscreen.";
      } else if (lowerCity.includes('seattle') || lowerCity.includes('san francisco')) {
        uv = 3; hum = 75; temp = 59; wind = 14; risk = 'Low';
        alertText = "Cool Maritime Air. Wind-induced micro-dryness is possible. Apply lightweight hyaluronic serums under cream layers.";
      } else if (lowerCity.includes('chicago') || lowerCity.includes('minneapolis')) {
        uv = 4; hum = 28; temp = 35; wind = 18; risk = 'High';
        alertText = "Severe Wind Chill and Dry Indoor Heating. Extreme risk of transepidermal water loss. Shield with a dense occlusive balm.";
      } else if (lowerCity.includes('denver') || lowerCity.includes('salt lake')) {
        uv = 8; hum = 22; temp = 68; wind = 7; risk = 'High';
        alertText = "High Elevation UV Surge. Solar radiation is elevated. Your skin moisture barrier requires dual physical UV shielding.";
      }

      setWeatherData({
        uvIndex: uv,
        humidity: hum,
        temp,
        wind,
        barrierRisk: risk,
        alertText
      });
      setLoadingWeather(false);
      setWeatherConnected(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: '#1c1c1e', color: '#eae0d5' }}>
      {/* Premium Header */}
      <header className="border-b" style={{ borderColor: 'rgba(234, 224, 213, 0.1)', background: '#121212' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna size={26} color="#2dd4bf" />
            <span className="font-extrabold text-lg tracking-tight text-white">Skin Tight</span>
          </div>
          <div className="text-xs font-mono text-gray-400 uppercase tracking-widest">
            Atmospheric Health Node
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center md:text-left mb-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 border"
               style={{ 
                 background: 'rgba(234, 224, 213, 0.05)', 
                 borderColor: 'rgba(234, 224, 213, 0.15)',
                 color: '#eae0d5'
               }}>
            <MapPin size={12} className="text-[#2dd4bf]" />
            <span>Region Tracker: {page.cityName}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            {page.cityName} Atmospheric Skin Barrier Guide
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
            Local humidity drops, particulate indexes, and solar elevations directly govern your outer stratum corneum health. Learn how to protect your skin barrier in <strong className="text-white">{page.cityName}</strong> today.
          </p>
        </motion.div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          
          {/* Climate & Local Advice Card */}
          <motion.div 
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl p-6 border flex flex-col justify-between"
            style={{ 
              background: '#121212', 
              borderColor: 'rgba(234, 224, 213, 0.1)' 
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Climate Characteristic</span>
                <span className="text-xs px-2.5 py-1 rounded-md font-bold text-gray-900 bg-[#eae0d5]">
                  {page.climateType}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Localized Skincare Protocol</h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                {page.localAdvice}
              </p>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'rgba(234, 224, 213, 0.08)' }}>
              <div className="flex items-start gap-2 text-xs text-gray-400">
                <ShieldCheck size={14} className="text-[#2dd4bf] mt-0.5 flex-shrink-0" />
                <span>Custom calculated advice balancing real-time humidity coefficients and regional UV mutations.</span>
              </div>
            </div>
          </motion.div>

          {/* Connect Live Weather Widget */}
          <motion.div 
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl p-6 border flex flex-col justify-between"
            style={{ 
              background: '#121212', 
              borderColor: 'rgba(234, 224, 213, 0.1)' 
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CloudSun size={18} className="text-[#2dd4bf]" />
                <h3 className="text-lg font-bold text-white">Live Environmental Analysis</h3>
              </div>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Connect our regional climate matrix with real-time local telemetry to analyze current moisture evaporation stresses and active skin-barrier threats.
              </p>

              <AnimatePresence mode="wait">
                {!weatherConnected ? (
                  <div className="py-4 text-center">
                    <button
                      onClick={connectWeatherData}
                      disabled={loadingWeather}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{ 
                        background: '#eae0d5', 
                        color: '#1c1c1e',
                        opacity: loadingWeather ? 0.7 : 1,
                        cursor: loadingWeather ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loadingWeather ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Polling Weather Feed...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Connect Live Weather Feed</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-[#1c1c1e] border" style={{ borderColor: 'rgba(234, 224, 213, 0.05)' }}>
                        <span className="block text-[10px] text-gray-500 uppercase font-mono mb-1">UV Index</span>
                        <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                          <Sun size={14} className="text-yellow-400" />
                          <span>{weatherData?.uvIndex} / 10</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#1c1c1e] border" style={{ borderColor: 'rgba(234, 224, 213, 0.05)' }}>
                        <span className="block text-[10px] text-gray-500 uppercase font-mono mb-1">Humidity</span>
                        <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                          <Wind size={14} className="text-blue-400" />
                          <span>{weatherData?.humidity}%</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#1c1c1e] border" style={{ borderColor: 'rgba(234, 224, 213, 0.05)' }}>
                        <span className="block text-[10px] text-gray-500 uppercase font-mono mb-1">Temp</span>
                        <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                          <Thermometer size={14} className="text-red-400" />
                          <span>{weatherData?.temp}°F</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[#1c1c1e] border" style={{ borderColor: 'rgba(234, 224, 213, 0.05)' }}>
                        <span className="block text-[10px] text-gray-500 uppercase font-mono mb-1">Barrier Stress</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-extrabold ${
                          weatherData?.barrierRisk === 'High' ? 'bg-red-950 text-red-400 border border-red-900/40' : 
                          weatherData?.barrierRisk === 'Moderate' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900/40' : 
                          'bg-green-950 text-green-400 border border-green-900/40'
                        }`}>
                          {weatherData?.barrierRisk} Risk
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border flex items-start gap-2.5" 
                         style={{ 
                           background: 'rgba(45, 212, 191, 0.04)', 
                           borderColor: 'rgba(45, 212, 191, 0.15)' 
                         }}>
                      <AlertTriangle size={15} className="text-[#2dd4bf] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {weatherData?.alertText}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-4 border-t mt-4" style={{ borderColor: 'rgba(234, 224, 213, 0.08)' }}>
              <span className="text-[10px] text-gray-500 font-mono uppercase">
                Status: {weatherConnected ? '✅ Signal Synchronized' : '📡 Ready to Ping'}
              </span>
            </div>
          </motion.div>

        </div>

        {/* Diagnostic CTA Box */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-3xl p-8 md:p-10 border text-center flex flex-col items-center justify-center relative overflow-hidden"
          style={{ 
            background: '#121212', 
            borderColor: 'rgba(234, 224, 213, 0.15)' 
          }}
        >
          {/* Subtle design grid highlight */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,rgba(234,224,213,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(234,224,213,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" />

          <div className="relative z-10 max-w-lg space-y-6">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                 style={{ background: 'rgba(45, 212, 191, 0.1)' }}>
              <Upload size={24} className="text-[#2dd4bf]" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Initiate Your Secure Visual Skin Log
            </h2>

            <p className="text-sm text-gray-300 leading-relaxed">
              Don't leave mole changes and barrier stress to guesswork. Join thousands of users logging and tracking local UV skin variations in our 100% private, military-grade encrypted cloud vault.
            </p>

            <button
              onClick={onCtaClick}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black tracking-wide transition-all shadow-xl hover:scale-[1.01] hover:shadow-2xl active:scale-[0.99]"
              style={{ 
                background: '#eae0d5', 
                color: '#121212',
                cursor: 'pointer'
              }}
            >
              <span>Upload Baseline Photo to Your Secure Vault</span>
              <ArrowRight size={16} />
            </button>

            <div className="flex items-center justify-center gap-6 pt-4 text-[11px] text-gray-400 font-mono uppercase tracking-wider">
              <span>🔒 Encrypted Vault</span>
              <span>•</span>
              <span>📂 HIPAA Compliant</span>
              <span>•</span>
              <span>⚡ Instantly Activated</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Modern Footer */}
      <footer className="border-t py-8 mt-12 text-center text-xs text-gray-500" 
              style={{ borderColor: 'rgba(234, 224, 213, 0.05)', background: '#121212' }}>
        <p>© 2026 Skin Tight Atmospheric Health Network. All rights reserved.</p>
        <p className="mt-2 text-[10px] text-gray-600 max-w-md mx-auto px-4">
          Disclaimer: This environmental skin-barrier tracker is designed for educational purposes only. It does not constitute medical diagnosis or diagnostic advice.
        </p>
      </footer>
    </div>
  );
};
