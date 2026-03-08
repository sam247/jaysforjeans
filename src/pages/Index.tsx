import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Instagram, Twitter, Facebook, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const FloatingIcon = ({ delay, x, y, children }: { delay: number; x: string; y: string; children: React.ReactNode }) => (
  <motion.div
    className="absolute text-primary/20 pointer-events-none"
    style={{ left: x, top: y }}
    animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

const Logo = () => (
  <motion.div
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
    className="relative"
  >
    <div className="bg-primary px-8 py-4 sm:px-14 sm:py-6 rounded-2xl shadow-[0_8px_40px_hsl(48_100%_55%/0.4)] relative overflow-hidden">
      {/* Decorative corner dots */}
      <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-secondary/30" />
      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-secondary/30" />
      <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-secondary/30" />
      <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-secondary/30" />
      
      <div className="text-center" style={{ fontFamily: "'Fredoka One', cursive" }}>
        <div className="text-secondary text-5xl sm:text-7xl leading-none tracking-tight">
          JAYS
        </div>
        <div className="text-accent-foreground text-xl sm:text-2xl italic font-normal my-[-2px]" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          for
        </div>
        <div className="text-secondary text-5xl sm:text-7xl leading-none tracking-tight">
          JEANS
        </div>
        <div className="text-accent-foreground text-sm sm:text-base mt-1 tracking-widest opacity-70" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          .co.uk
        </div>
      </div>
    </div>
  </motion.div>
);

const Index = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxnyFFSFRLTTCPp1ccKkfTx53FYYukxOrVWRL9B1ipB9hz1gY8wlVGzGH2lntr9DniVZQ/exec";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const url = `${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(email.trim())}`;
      await fetch(url, { mode: "no-cors" });
      toast({ title: "🎉 You're on the list!", description: "We'll let you know when we launch." });
      setEmail("");
    } catch {
      toast({ title: "Oops!", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(var(--denim-dark))] via-background to-[hsl(var(--denim-mid))]">
      {/* Floating decorative icons */}
      <FloatingIcon delay={0} x="10%" y="15%"><Shirt size={40} /></FloatingIcon>
      <FloatingIcon delay={1} x="85%" y="20%"><Shirt size={32} /></FloatingIcon>
      <FloatingIcon delay={2} x="5%" y="70%"><Shirt size={28} /></FloatingIcon>
      <FloatingIcon delay={0.5} x="90%" y="65%"><Shirt size={36} /></FloatingIcon>
      <FloatingIcon delay={1.5} x="20%" y="85%"><Shirt size={24} /></FloatingIcon>
      <FloatingIcon delay={2.5} x="75%" y="80%"><Shirt size={30} /></FloatingIcon>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg w-full">
        <Logo />

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center space-y-3"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive" }}>
            Something Cool is Coming!
          </h1>
          <p className="text-muted-foreground text-lg">
            We're stitching things together behind the scenes. Stay tuned! 👖✨
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
        >
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-12 px-6 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_hsl(48_100%_55%/0.3)] disabled:opacity-50"
          >
            {loading ? "Sending..." : "Notify Me! 🔔"}
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex gap-4 mt-4"
        >
          {[
            { icon: Instagram, label: "Instagram" },
            { icon: Twitter, label: "Twitter" },
            { icon: Facebook, label: "Facebook" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              aria-label={label}
              className="w-11 h-11 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-110"
            >
              <Icon size={20} />
            </button>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 text-muted-foreground text-sm"
      >
        © 2026 jaysforjeans.co.uk
      </motion.footer>
    </div>
  );
};

export default Index;
