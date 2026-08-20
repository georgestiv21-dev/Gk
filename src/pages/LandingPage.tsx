import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Tv, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  ArrowDownCircle, 
  Lock, 
  Tv2,
  ChevronDown,
  Subtitles,
  Smile,
  Zap,
  CheckCircle2,
  MessageSquarePlus
} from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'tv' | 'phone'>('tv');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [rotIndex, setRotIndex] = useState<number>(0);

  const rotatingItems = [
    { text: "Ταινίες", gradient: "from-amber-400 via-orange-400 to-primary" },
    { text: "Σειρές", gradient: "from-cyan-400 via-sky-400 to-blue-500" },
    { text: "Blockbusters", gradient: "from-purple-400 via-pink-400 to-rose-400" },
    { text: "Παιδικές Σειρές", gradient: "from-emerald-400 via-teal-300 to-green-500" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setRotIndex((prev) => (prev + 1) % rotatingItems.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [rotatingItems.length]);

  // Direct APK links
  const apkDownloadPath = '/downloads/greek-streaming.apk';

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Πού μπορώ να βρω σπάνια μεταγλωττισμένα ελληνικά παιδικά;',
      a: 'Στο Greek Streaming διαθέτουμε τη μεγαλύτερη συλλογή από κλασικές και νέες παιδικές σειρές, κινούμενα σχέδια και anime αποκλειστικά με αυθεντική ελληνική μεταγλώττιση, χωρίς περικοπές.'
    },
    {
      q: 'Οι ταινίες και οι σειρές έχουν ελληνικούς υπότιτλους;',
      a: 'Ναι! Όλες οι ξένες ταινίες, blockbusters και δημοφιλείς σειρές συνοδεύονται από απόλυτα συγχρονισμένους ελληνικούς υπότιτλους υψηλής ευκρίνειας.'
    },
    {
      q: 'Πώς κάνω εγκατάσταση στην Smart TV ή στο Android TV Box;',
      a: 'Κατεβάζετε το APK στο κινητό σας και το στέλνετε απευθείας στην τηλεόρασή σας μέσα σε λίγα δευτερόλεπτα με τη δωρεάν εφαρμογή Send Files to TV (SFTV).'
    },
    {
      q: 'Γιατί η πρόσβαση γίνεται μόνο μέσω της εφαρμογής APK;',
      a: 'Η εφαρμογή διαθέτει ειδική τεχνολογία κρυπτογράφησης και Anti-Screen Capture (FLAG_SECURE) που προστατεύει το περιεχόμενο και εξασφαλίζει τη μέγιστη ταχύτητα αναπαραγωγής HLS χωρίς κολλήματα.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col selection:bg-primary selection:text-white font-sans antialiased relative">
      
      {/* High-End Cinematic Background Elements */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(242,104,34,0.18),rgba(255,255,255,0))] pointer-events-none z-0"></div>
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[700px] h-[340px] sm:h-[400px] bg-gradient-to-tr from-primary/20 via-amber-600/10 to-transparent rounded-full blur-[120px] sm:blur-[160px] pointer-events-none z-0"></div>
      <div className="fixed bottom-10 right-[-10%] w-[280px] sm:w-[500px] h-[280px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      
      {/* Subtle Micro-Grid Overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f232d0a_1px,transparent_1px),linear-gradient(to_bottom,#1f232d0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 opacity-40"></div>

      {/* Sticky Fixed Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#060709]/85 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          
          <div className="shrink-0">
            <Logo size="sm" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={apkDownloadPath} 
              download="greek-streaming.apk"
              className="bg-gradient-to-r from-primary via-orange-500 to-amber-600 hover:brightness-110 text-white text-xs font-bold px-4 sm:px-5 py-2 sm:py-2 rounded-full transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Λήψη APK</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section - Optimized for Mobile & Unique Streaming Identity */}
      <section className="relative px-4 sm:px-8 pt-24 sm:pt-28 pb-12 sm:pb-16 min-h-[calc(100vh-70px)] max-w-3xl mx-auto flex flex-col items-center justify-center text-center z-10 w-full my-auto">
        
        {/* Glow Accent Spheres behind Hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[480px] h-72 sm:h-[480px] bg-gradient-to-br from-primary/25 via-amber-500/15 to-transparent rounded-full blur-[110px] pointer-events-none -z-10 animate-pulse duration-[4000ms]"></div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-80 h-48 sm:h-80 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none -z-10"></div>

        {/* SEO Tag Badge - Ultra-Refined Glowing Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/20 via-amber-500/15 to-primary/10 border border-primary/30 text-primary-light text-xs sm:text-sm font-bold mb-5 max-w-full backdrop-blur-xl shadow-lg shadow-primary/10">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse shrink-0 text-amber-400" />
          <span className="truncate">#1 Ελληνική Πλατφόρμα Streaming &bull; TV & Mobile</span>
        </div>

        {/* Headline with Clean Multi-line Rotating Words */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.2] mb-4 sm:mb-6 max-w-2xl px-1">
          <span className="block text-gray-400 text-xs sm:text-sm font-bold uppercase tracking-widest text-primary-light/90 mb-2 sm:mb-3">
            Απολαύστε σε 4K & Full HD
          </span>
          <span className="block text-white">
            Κατέβασε και δες
          </span>
          <div className="w-full flex items-center justify-center relative overflow-hidden h-[1.3em] my-1 sm:my-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={rotIndex}
                initial={{ y: 28, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -28, opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${rotatingItems[rotIndex].gradient} text-3xl sm:text-5xl md:text-6xl whitespace-nowrap`}
              >
                {rotatingItems[rotIndex].text}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300">
            με Ελληνικούς Υπότιτλους
          </span>
        </h1>

        {/* Subtitle - Crisp, Legible & Optimized for Mobile Screens */}
        <p className="text-gray-200 text-sm sm:text-base md:text-lg max-w-xl leading-relaxed mb-8 sm:mb-10 px-2 font-medium">
          Η μεγαλύτερη συλλογή από κλασικές και νέες παιδικές σειρές με αυθεντική ελληνική μεταγλώττιση, καθώς και ξένες ταινίες & σειρές με άρτιους ελληνικούς υπότιτλους σε ποιότητα Full HD & 4K.
        </p>

        {/* Ultra-Polished Download Action Area */}
        <div id="download" className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-4 text-center">
          
          {/* Main Large Touch-Friendly Download Button */}
          <a
            href={apkDownloadPath}
            download="greek-streaming.apk"
            className="w-full py-3.5 sm:py-4 px-8 bg-gradient-to-r from-primary via-orange-500 to-amber-500 hover:brightness-110 text-white font-black text-sm sm:text-base rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.96] cursor-pointer group hover:shadow-primary/60 border border-white/20"
          >
            <ArrowDownCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="tracking-wide">Κατεβάστε Επίσημα το APK</span>
          </a>

          {/* Trust Badges Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-semibold text-gray-300 pt-1">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ασφαλές APK</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>HLS Ultra Speed</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>DRM Shield</span>
            </div>
          </div>

        </div>

      </section>

      {/* Mobile Optimization & Features Badge Banner */}
      <section className="px-3 sm:px-8 py-8 bg-[#090b0f]/80 backdrop-blur-md border-y border-white/[0.08] relative z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          
          <div className="bg-[#12151e]/70 border border-white/[0.08] rounded-xl p-3 flex flex-col items-center justify-center hover:border-primary/40 transition-colors">
            <Smartphone className="w-5 h-5 text-primary mb-1" />
            <span className="text-xs font-bold text-white">Mobile Optimized</span>
            <span className="text-[10px] text-gray-400">Android 7.0 & νεότερο</span>
          </div>

          <div className="bg-[#12151e]/70 border border-white/[0.08] rounded-xl p-3 flex flex-col items-center justify-center hover:border-amber-500/40 transition-colors">
            <Tv className="w-5 h-5 text-amber-500 mb-1" />
            <span className="text-xs font-bold text-white">Smart TV Ready</span>
            <span className="text-[10px] text-gray-400">Google TV & FireStick</span>
          </div>

          <div className="bg-[#12151e]/70 border border-white/[0.08] rounded-xl p-3 flex flex-col items-center justify-center hover:border-emerald-400/40 transition-colors">
            <Zap className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-xs font-bold text-white">HLS Ultra Speed</span>
            <span className="text-[10px] text-gray-400">Zero Buffering</span>
          </div>

          <div className="bg-[#12151e]/70 border border-white/[0.08] rounded-xl p-3 flex flex-col items-center justify-center hover:border-blue-400/40 transition-colors">
            <Lock className="w-5 h-5 text-blue-400 mb-1" />
            <span className="text-xs font-bold text-white">Anti-Recording DRM</span>
            <span className="text-[10px] text-gray-400">FLAG_SECURE Protected</span>
          </div>

        </div>
      </section>

      {/* Catalog & Content Categories (SEO Focused) */}
      <section id="paidika" className="px-3 sm:px-8 py-12 sm:py-16 bg-[#080a0e] relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl font-black text-white mb-2">Πλούσιος Κατάλογος Περιεχομένου</h2>
            <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto">
              Ειδικά κατηγοριοποιημένο περιεχόμενο με κορυφαία ποιότητα εικόνας και ήχου.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Category 1: Μεταγλωττισμένα Παιδικά */}
            <div className="bg-[#12151e]/80 border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col gap-3 hover:border-primary/50 transition-all shadow-xl group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Μεταγλωττισμένα Παιδικά</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Σπάνιες κλασικές παιδικές σειρές, κινούμενα σχέδια της παιδικής μας ηλικίας, Disney classics και δημοφιλή anime με αυθεντική ελληνική μεταγλώττιση.
              </p>
              <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs text-primary font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Ελληνικός Ήχος</span>
              </div>
            </div>

            {/* Category 2: Ταινίες με Ελληνικούς Υπότιτλους */}
            <div id="tainies" className="bg-[#12151e]/80 border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col gap-3 hover:border-primary/50 transition-all shadow-xl group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Subtitles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Ταινίες με Ελληνικούς Υπότιτλους</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Πρόσφατα blockbusters, περιπέτειες, θρίλερ, κωμωδίες και βραβευμένες ταινίες με άρτια συγχρονισμένους ελληνικούς υπότιτλους.
              </p>
              <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Full HD & 4K HLS Streams</span>
              </div>
            </div>

            {/* Category 3: Αιτήματα & Προτάσεις Ταινιών/Σειρών */}
            <div className="bg-[#12151e]/80 border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col gap-3 hover:border-emerald-500/50 transition-all shadow-xl group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <MessageSquarePlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Αιτήματα & Προτάσεις</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Δεν βρίσκετε την ταινία ή τη σειρά που ψάχνετε; Μέσα από το προφίλ σας μπορείτε να υποβάλετε αίτημα και η ομάδα μας αναλαμβάνει να την προσθέσει άμεσα!
              </p>
              <div className="mt-auto pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Άμεση Προσθήκη Κατόπιν Αιτήματος</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Installation Instructions */}
      <section id="instructions" className="px-3 sm:px-8 py-12 sm:py-16 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-3xl font-black text-white mb-2">Οδηγίες Εγκατάστασης APK</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Πώς να εγκαταστήσετε την εφαρμογή στη συσκευή σας σε 2 λεπτά.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#1a1d24] p-1 rounded-xl sm:rounded-2xl border border-white/10 grid grid-cols-2 gap-1 w-full max-w-md">
            <button
              onClick={() => setActiveTab('tv')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tv' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Smart TV & TV Box</span>
            </button>
            <button
              onClick={() => setActiveTab('phone')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'phone' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Android Κινητό</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-[#12151e]/90 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          {activeTab === 'tv' ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-emerald-500/40 shadow-sm">1</span>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">Κατεβάστε το APK στο Κινητό σας</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                    Πατήστε το κουμπί <b className="text-white">«Κατεβάστε Επίσημα το APK»</b> πιο πάνω από το κινητό σας τηλέφωνο.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-emerald-500/40 shadow-sm">2</span>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">Εγκαταστήστε το «Send Files to TV»</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                    Κατεβάστε τη δωρεάν εφαρμογή <b className="text-emerald-400">Send Files to TV (SFTV)</b> από το Google Play Store τόσο στο <b className="text-white">κινητό</b> όσο και στην <b className="text-white">Smart TV / Android TV</b> σας.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-emerald-500/40 shadow-sm">3</span>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">Αποστολή (Send) στην Τηλεόραση</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                    Στην TV επιλέξτε <b className="text-emerald-400">Receive</b>. Στο κινητό επιλέξτε <b className="text-emerald-400">Send</b>, επιλέξτε το αρχείο <code className="bg-black/50 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-xs">greek-streaming.apk</code> (από τον φάκελο Downloads) και πατήστε το όνομα της τηλεόρασής σας.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-emerald-500/40 shadow-sm">4</span>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">Εγκατάσταση (Install) & Έναρξη</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">
                    Μόλις ολοκληρωθεί η μεταφορά στην TV (σε 3-5 δευτερόλεπτα), πατήστε πάνω στο αρχείο και επιλέξτε <b className="text-emerald-400">Open / Install</b> για να συνδεθείτε!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-primary/40 shadow-sm">1</span>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">Κατεβάστε το αρχείο APK</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">Πατήστε το κουμπί <b className="text-white">«Κατεβάστε Επίσημα το APK»</b> παραπάνω από το κινητό σας.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-primary/40 shadow-sm">2</span>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">Αποδοχή Άγνωστων Πηγών</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">Αν σας ζητηθεί από το Android, επιτρέψτε την «Εγκατάσταση από άγνωστες πηγές».</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center font-black text-sm sm:text-base shrink-0 border border-primary/40 shadow-sm">3</span>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base">Έτοιμο!</h4>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 leading-relaxed">Ανοίξτε το Greek Streaming και απολαύστε το αγαπημένο σας περιεχόμενο.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="px-3 sm:px-8 py-12 sm:py-16 max-w-4xl mx-auto w-full border-t border-white/5">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-3xl font-black text-white mb-2">Συχνές Ερωτήσεις (FAQ)</h2>
          <p className="text-gray-400 text-xs sm:text-sm">Όλα όσα πρέπει να γνωρίζετε για την εφαρμογή.</p>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[#1a1d24] border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-md">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full px-4 sm:px-6 py-3.5 text-left flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-white hover:text-primary transition-colors cursor-pointer"
              >
                <span className="leading-snug">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180 text-primary' : ''}`} />
              </button>
              {openFaq === idx && (
                <div className="px-4 sm:px-6 pb-4 pt-1 text-[11px] sm:text-xs text-gray-300 leading-relaxed border-t border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#090a0c] px-3 sm:px-8 py-6 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Greek Streaming. Όλα τα δικαιώματα διατηρούνται.</p>

          <p className="text-[11px] text-gray-400">
            Μεταγλωττισμένα Παιδικά & Ταινίες με Ελληνικούς Υπότιτλους
          </p>
        </div>
      </footer>

    </div>
  );
}
