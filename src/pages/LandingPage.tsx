import React, { useState } from 'react';
import { 
  Download, 
  Tv, 
  Smartphone, 
  ShieldCheck, 
  Sparkles, 
  ArrowDownCircle, 
  Copy, 
  Check, 
  Lock, 
  ExternalLink,
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
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'tv' | 'phone'>('tv');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Direct APK links
  const apkDownloadPath = '/downloads/greek-streaming.apk';
  const fullApkUrl = 'https://greek-streaming.com/downloads/greek-streaming.apk';

  const copyDownloaderText = () => {
    navigator.clipboard.writeText(fullApkUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

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
      q: 'Πώς κάνω εγκατάσταση στην Smart TV ή στο Amazon FireStick;',
      a: 'Ανοίγετε την εφαρμογή Downloader στην τηλεόρασή σας, πληκτρολογείτε τη διεύθυνση https://greek-streaming.com/downloads/greek-streaming.apk, πατάτε Go και ολοκληρώνετε την εγκατάσταση σε 1 λεπτό.'
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

      {/* Hero Section - Padding top added to offset fixed header */}
      <section className="relative px-4 sm:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12 min-h-[calc(100vh-62px)] max-w-2xl mx-auto flex flex-col items-center justify-center text-center z-10 w-full my-auto">
        
        {/* SEO Tag Badge - Designer Pill */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-primary/15 via-amber-500/10 to-primary/5 border border-primary/25 text-primary text-[10px] sm:text-xs font-semibold mb-4 max-w-full backdrop-blur-md shadow-sm">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse shrink-0 text-amber-400" />
          <span className="truncate">#1 Ελληνική Πλατφόρμα Streaming • Android & Mobile</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.2] mb-3 max-w-xl px-1">
          Μεταγλωττισμένα <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-400 to-orange-500">Παιδικά</span> & Ταινίες με <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-500 to-primary-dark">Ελληνικούς Υπότιτλους</span>
        </h1>

        <p className="text-gray-300 text-xs sm:text-sm max-w-md leading-relaxed mb-6 sm:mb-8 px-2 font-normal opacity-90">
          Η μεγαλύτερη συλλογή από παιδικές σειρές με ελληνική μεταγλώττιση, κινούμενα σχέδια, καθώς και ταινίες με ελληνικούς υπότιτλους σε Full HD & 4K.
        </p>

        {/* Ultra-Minimal, Compact Download Section */}
        <div id="download" className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-3.5 text-center">
          
          {/* Main Compact Download Button */}
          <a
            href={apkDownloadPath}
            download="greek-streaming.apk"
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary via-amber-600 to-primary-dark hover:brightness-110 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xl shadow-primary/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.97] cursor-pointer group hover:shadow-primary/40"
          >
            <ArrowDownCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 group-hover:scale-110 transition-transform" />
            <span>Κατεβάστε Επίσημα το APK</span>
          </a>

          {/* Minimalist Downloader Link Field for Smart TV */}
          <div className="w-full flex flex-col items-center gap-1.5 pt-0.5">
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium flex items-center gap-1">
              <Tv className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Σύνδεσμος Downloader για Smart TV & FireStick:</span>
            </span>

            <div className="w-full flex items-center gap-1.5 bg-[#0f1117]/90 border border-white/10 hover:border-primary/40 rounded-xl p-1.5 transition-all min-w-0 shadow-inner backdrop-blur-md">
              <a 
                href={apkDownloadPath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-mono text-[11px] font-semibold flex-1 min-w-0 truncate flex items-center gap-1 pl-2 text-left"
                title="Πατήστε για άμεση λήψη"
              >
                <span className="truncate">{fullApkUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
              </a>
              
              <button
                type="button"
                onClick={copyDownloaderText}
                className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/35 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer active:scale-95"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 opacity-80 pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Ασφαλές APK &bull; DRM Protected</span>
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
        <div className="bg-[#1a1d24] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl">
          {activeTab === 'tv' ? (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-primary/30">1</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Κατεβάστε την εφαρμογή Downloader</h4>
                  <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">Ανοίξτε το Google Play Store ή το Amazon Appstore στην τηλεόρασή σας και κατεβάστε τη δωρεάν εφαρμογή <b>Downloader by AFTVnews</b>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-primary/30">2</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-sm">Πληκτρολογήστε τη διεύθυνση λήψης</h4>
                  <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5 mb-2">Στο πεδίο URL του Downloader πληκτρολογήστε το σύνδεσμο:</p>
                  
                  <div className="flex items-center gap-2 bg-[#090a0c] border border-primary/40 rounded-xl p-2 min-w-0 max-w-md">
                    <code className="text-primary font-mono text-[11px] font-bold flex-1 truncate min-w-0">
                      {fullApkUrl}
                    </code>
                    <button
                      onClick={copyDownloaderText}
                      className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{copiedUrl ? 'OK' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-primary/30">3</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Εγκατάσταση & Σύνδεση</h4>
                  <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">Μόλις ολοκληρωθεί η λήψη, πατήστε <b>Install</b>, ανοίξτε την εφαρμογή και συνδεθείτε.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-primary/30">1</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Κατεβάστε το αρχείο APK</h4>
                  <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">Πατήστε το κουμπί <b>«Κατεβάστε Επίσημα το APK»</b> παραπάνω από το κινητό σας.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-primary/30">2</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Αποδοχή Άγνωστων Πηγών</h4>
                  <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">Αν σας ζητηθεί από το σύστημα Android, επιτρέψτε την «Εγκατάσταση από άγνωστες πηγές».</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-primary/30">3</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Έτοιμο!</h4>
                  <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">Ανοίξτε το Greek Streaming και απολαύστε το αγαπημένο σας περιεχόμενο.</p>
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
