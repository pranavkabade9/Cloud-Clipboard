import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  UserCircle2, 
  ArrowRight, 
  Zap, 
  Shield, 
  Smartphone, 
  Cloud, 
  Copy, 
  Pencil, 
  Layout, 
  Search, 
  Bell, 
  Settings,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  Layers,
  Fingerprint,
  Star,
  Image as ImageIcon
} from 'lucide-react';
import { signInWithGoogle } from '../services/auth';
import { useStore } from '../store/useStore';
import { cn } from '../utils/utils';

const LandingPage = () => {
  const { setIsGuest, theme, toggleTheme } = useStore();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const handleGuestMode = () => {
    setIsGuest(true);
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Sign in failed", error);
      const { toast } = await import('sonner');
      if (error.code === 'auth/unauthorized-domain') {
        toast.error("Domain Error", {
          description: "This domain is not authorized in Firebase Console. Please add it to your Authorized Domains list.",
          duration: 6000
        });
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.info("Login cancelled", { description: "The sign-in popup was closed." });
      } else {
        toast.error("Sign in failed", { description: error.message || "An unexpected error occurred during sign-in." });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const FeatureCard = ({ icon: Icon, title, desc, delay = 0 }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group relative p-8 rounded-[32px] border border-border-primary bg-bg-secondary shadow-xl shadow-neutral-200/50 dark:shadow-none hover:border-blue-500/50 transition-all duration-500 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="mb-6 inline-flex p-4 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
           <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-text-primary tracking-tight">{title}</h3>
        <p className="text-text-secondary font-medium text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );

  return (
    <div ref={containerRef} className="relative w-full font-['Poppins']">
      {/* Absolute Header */}
      <header className="fixed top-0 left-0 w-full z-[100] px-8 py-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-text-primary">CloudClip</span>
        </div>
        
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-full border border-border-primary bg-bg-secondary/50 backdrop-blur-xl text-text-primary hover:scale-110 transition-all shadow-lg"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('auth-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:flex px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all active:scale-95 shadow-xl shadow-blue-500/20"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 overflow-hidden">
        {/* Cinematic Blur Backgrounds */}
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 dark:bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 w-full max-w-6xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border dark:border-blue-500/20 border-blue-500/10 bg-blue-500/5 mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Universal Cloud Sync</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-8xl lg:text-9xl font-extrabold text-text-primary tracking-tight leading-[0.95] mb-8"
          >
            Your Clipboard. <br />
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Reimagined.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl font-medium text-text-secondary leading-relaxed mb-12"
          >
            A universal clipboard workspace for screenshots, notes, drawings, and instant sync across devices.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
             <button 
              onClick={() => {
                const el = document.getElementById('auth-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group w-full sm:w-auto px-10 py-5 rounded-[24px] bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/40 active:scale-95 flex items-center justify-center gap-3"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={handleGuestMode}
              className="w-full sm:w-auto px-10 py-5 rounded-[24px] border border-border-primary bg-bg-secondary font-bold text-lg text-text-primary transition-all hover:bg-bg-primary"
            >
              Continue as Guest
            </button>
          </motion.div>
        </motion.div>

        {/* Floating Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: "circOut" }}
          className="relative mt-20 w-full max-w-5xl mx-auto hidden md:block"
        >
           <div className="relative p-2 rounded-[40px] bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-2xl backdrop-blur-3xl">
              <div className="absolute inset-0 bg-blue-500/10 blur-[80px] -z-10" />
              <div className="rounded-[32px] overflow-hidden border dark:border-neutral-800 border-neutral-200 bg-neutral-950/90 aspect-[16/9] shadow-inner">
                 {/* Fake Dashboard Preview */}
                 <div className="w-full h-full p-8 flex flex-col gap-8 bg-neutral-950">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                             <Zap className="h-4 w-4 text-white" />
                          </div>
                          <div className="h-3 w-32 bg-neutral-800 rounded-full" />
                       </div>
                       <div className="flex gap-4">
                          <div className="h-9 w-9 rounded-xl bg-neutral-800 border border-white/5" />
                          <div className="h-9 w-32 rounded-xl bg-blue-500 border border-blue-400/20" />
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6 flex-1">
                       {/* Realistic Pinned Card */}
                       <div className="col-span-1 rounded-3xl bg-white/5 border border-white/10 p-5 space-y-4 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-3">
                             <Star className="h-3 w-3 text-orange-500 fill-current" />
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="p-1 px-2 rounded-md bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase">Strategy</div>
                          </div>
                          <p className="text-[11px] font-bold text-neutral-300 leading-relaxed">
                            Drafting the new brand strategy for 2026. Focus on cinematic minimalism and motion design.
                          </p>
                          <div className="h-[1px] w-full bg-white/5" />
                          <div className="flex items-center justify-between text-[8px] font-black text-neutral-600 uppercase">
                             <span>Just now</span>
                             <span>1.2 KB</span>
                          </div>
                       </div>

                       {/* Realistic Screenshot Card */}
                       <div className="col-span-1 rounded-3xl bg-white/5 border border-white/10 p-5 space-y-4 shadow-2xl overflow-hidden group">
                          <div className="flex items-center gap-2">
                             <div className="p-1 px-2 rounded-md bg-purple-500/20 text-purple-400 text-[8px] font-black uppercase">Clip</div>
                          </div>
                          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-neutral-900 relative">
                             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-600/30 opacity-60" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-white/20" />
                             </div>
                             <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-2/3 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                             </div>
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-black text-neutral-600 uppercase">
                             <span>2m ago</span>
                             <span>2.4 MB</span>
                          </div>
                       </div>

                       {/* Realistic Sketch Card */}
                       <div className="col-span-1 rounded-3xl bg-white/5 border border-white/10 p-5 space-y-4 shadow-2xl overflow-hidden group">
                          <div className="flex items-center gap-2">
                             <div className="p-1 px-2 rounded-md bg-orange-500/20 text-orange-400 text-[8px] font-black uppercase">Sketch</div>
                          </div>
                          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-white p-2 relative shadow-inner">
                             <svg className="w-full h-full text-blue-500/40" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 50 Q 50 10 80 50 T 20 50" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M20 70 L 80 70" strokeOpacity="0.3" strokeLinecap="round" />
                                <circle cx="50" cy="50" r="1.5" fill="currentColor" />
                             </svg>
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-black text-neutral-600 uppercase">
                             <span>10m ago</span>
                             <span>45 KB</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-bg-primary">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-20">
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500 mb-4 block">Modern Productivity</span>
             <h2 className="text-4xl md:text-6xl font-bold text-text-primary mb-6 tracking-tight">Save Everything. Instantly.</h2>
             <p className="text-lg font-medium text-text-secondary leading-relaxed">
               CloudClip is designed to be the bridge between your devices. Copy on your phone, annotate on your tablet, and paste on your desktop in milliseconds.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Smartphone} 
              title="Instant Sync" 
              desc="Real-time synchronization across all your platforms with speed and reliability."
              delay={0.1}
            />
            <FeatureCard 
              icon={Pencil} 
              title="Creative Canvas" 
              desc="Integrated drawing suite for sketching quick ideas or annotating screenshots beautifully."
              delay={0.2}
            />
            <FeatureCard 
              icon={Shield} 
              title="Privacy First" 
              desc="End-to-end security via Firebase. Your snippets are your business, and ours are protected."
              delay={0.3}
            />
            <FeatureCard 
              icon={Cloud} 
              title="5 GB Storage" 
              desc="Massive persistent storage for all your high-res screenshots and complex drawing notes."
              delay={0.4}
            />
            <FeatureCard 
              icon={Layout} 
              title="Smart Labels" 
              desc="Use semantic organization and pinned items to keep your vault organized and accessible."
              delay={0.5}
            />
            <FeatureCard 
              icon={Search} 
              title="Global Search" 
              desc="Lightning-fast history search to find exactly what you need when you need it."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Authentication Section (Split Screen inspired) */}
      <section id="auth-section" className="relative min-h-screen py-32 overflow-hidden flex flex-col lg:flex-row items-center">
         {/* Background Decor */}
         <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-500/5 -z-10 hidden lg:block" />
         
         <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* Left side: Cinematic content */}
            <div className="space-y-12">
               <div>
                  <h2 className="text-5xl md:text-7xl font-extrabold text-text-primary mb-8 tracking-tighter leading-tight">Elevate <br /> your workflow.</h2>
                  <p className="text-xl font-medium text-text-secondary leading-relaxed max-w-lg">
                    Join thousands of designers, developers, and creators who use CloudClip to manage their digital fragments.
                  </p>
               </div>

               <div className="space-y-6">
                  {[
                    { icon: Sparkles, text: "AI-enhanced organization coming soon" },
                    { icon: Layers, text: "Unlimited clipboard history" },
                    { icon: Fingerprint, text: "Universal access via Google Auth" }
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      className="flex items-center gap-4 text-neutral-600 dark:text-neutral-400 font-semibold"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                       <div className="h-10 w-10 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center text-blue-500 shadow-sm">
                          <item.icon className="h-5 w-5" />
                       </div>
                       {item.text}
                    </motion.div>
                  ))}
               </div>
            </div>

            {/* Right side: Auth card */}
            <div className="flex justify-center lg:justify-end">
               <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="w-full max-w-md rounded-[48px] border border-border-primary bg-bg-secondary/40 p-12 backdrop-blur-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] relative"
               >
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-blue-500/10 blur-[40px]" />
                  <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-purple-500/10 blur-[40px]" />

                  <div className="text-center mb-12">
                     <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl shadow-blue-500/20 mb-6 group-hover:scale-110 transition-transform">
                        <Zap className="h-8 w-8 text-white fill-white/20" />
                     </div>
                     <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">Welcome Back</h2>
                     <p className="mt-2 text-text-secondary font-medium">Continue your journey with CloudClip</p>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                      className="group flex w-full items-center justify-center gap-4 rounded-3xl border border-border-primary bg-bg-primary px-8 py-5 font-bold text-text-primary transition-all hover:bg-bg-secondary hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.98] shadow-sm disabled:opacity-50"
                    >
                      {isSigningIn ? (
                        <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      ) : (
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-6 w-6 group-hover:scale-110 transition-transform" alt="Google" />
                      )}
                      {isSigningIn ? "Signing you in..." : "Continue with Google"}
                    </button>
                    
                    <div className="relative my-10 flex items-center justify-center">
                      <div className="h-[1px] w-full bg-border-primary" />
                      <span className="absolute bg-bg-secondary px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">Secure Access</span>
                    </div>

                    <button 
                      onClick={handleGuestMode}
                      className="flex w-full items-center justify-center gap-4 rounded-3xl border border-border-primary bg-bg-primary px-8 py-5 font-bold text-text-muted transition-all hover:bg-bg-secondary active:scale-[0.98] shadow-sm"
                    >
                      <UserCircle2 className="h-6 w-6" />
                      Continue as Guest
                    </button>
                  </div>

                  <p className="mt-10 text-center text-[10px] font-semibold text-text-muted uppercase tracking-widest leading-relaxed">
                    No signup hidden costs. <br />
                    Just universal cloud sync.
                  </p>
               </motion.div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-border-primary">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tighter text-text-primary">CloudClip</span>
           </div>
           <p className="text-sm font-medium text-text-muted">© 2026 CloudClip Studios. Vault Clipboard SaaS.</p>
           <div className="flex items-center gap-8">
              <button className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-blue-500 transition-colors">Privacy</button>
              <button className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-blue-500 transition-colors">Terms</button>
              <button className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-blue-500 transition-colors">Support</button>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
