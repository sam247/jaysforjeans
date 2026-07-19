"use client";

import React from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Facebook, Instagram, Mail, Shirt, Twitter } from "lucide-react";
import { toast } from "sonner";

import { buildLeadCapturePayload, submitLeadCapture } from "@/lib/lead-capture";

type FloatingShirtProps = {
  delay: number;
  x: string;
  y: string;
  size: number;
};

type ComingSoonLandingProps = {
  initialStatus?: "success" | "error";
};

const socialPlatforms = [
  { label: "Instagram", icon: Instagram },
  { label: "Twitter", icon: Twitter },
  { label: "Facebook", icon: Facebook },
];

function FloatingShirt({ delay, x, y, size }: FloatingShirtProps) {
  return (
    <motion.div
      className="pointer-events-none absolute text-primary/20"
      style={{ left: x, top: y }}
      animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
      transition={{ duration: 4, delay, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
    >
      <Shirt size={size} />
    </motion.div>
  );
}

export function ComingSoonLanding({ initialStatus }: ComingSoonLandingProps) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(
    initialStatus === "success"
      ? {
          tone: "success",
          text: "Thanks, you're on the list. We'll let you know when we launch.",
        }
      : initialStatus === "error"
        ? {
            tone: "error",
            text: "Something went wrong. Please try again in a moment.",
          }
        : null,
  );

  async function submitForm() {
    if (!email || loading) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const payload = buildLeadCapturePayload(email, website, {
        href: window.location.href,
        referrer: document.referrer || undefined,
        hostname: window.location.hostname,
      });

      await submitLeadCapture(payload);
      toast.success("You're on the list!", {
        description: "We'll let you know when we launch.",
      });
      setFeedback({
        tone: "success",
        text: "Thanks, you're on the list. We'll let you know when we launch.",
      });
      setEmail("");
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again in a moment.",
      });
      setFeedback({
        tone: "error",
        text: "Something went wrong. Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm();
  }

  async function handleButtonClick() {
    await submitForm();
  }

  async function handleEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    await submitForm();
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-denim-dark via-background to-denim-mid px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsla(48,_100%,_55%,_0.18),_transparent_35%),radial-gradient(circle_at_bottom,_hsla(0,_80%,_45%,_0.16),_transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(hsla(48,_100%,_96%,_0.05)_1px,transparent_1px),linear-gradient(90deg,hsla(48,_100%,_96%,_0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <FloatingShirt delay={0} x="10%" y="15%" size={40} />
      <FloatingShirt delay={1} x="85%" y="20%" size={32} />
      <FloatingShirt delay={2} x="5%" y="70%" size={28} />
      <FloatingShirt delay={0.5} x="90%" y="65%" size={36} />
      <FloatingShirt delay={1.5} x="20%" y="85%" size={24} />
      <FloatingShirt delay={2.5} x="75%" y="80%" size={30} />

      <section className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="relative"
        >
          <img
            src="/jaysforjeans-logo.png"
            alt="Jays for Jeans"
            className="h-auto w-full max-w-[min(90vw,520px)] drop-shadow-[0_8px_40px_hsla(48,_100%,_55%,_0.4)]"
          />
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="space-y-3"
        >
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">
            Something Cool is Coming!
          </h1>
          <p className="text-lg text-muted-foreground">
            We&apos;re stitching things together behind the scenes. Stay tuned!{" "}
            <span aria-hidden="true">👖✨</span>
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          action="/api/lead"
          method="post"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            aria-hidden="true"
          />

          <div className="relative flex-1">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={handleEmailKeyDown}
              className="flex h-12 w-full rounded-xl border border-border bg-muted/50 px-3 pl-10 text-base text-foreground placeholder:text-muted-foreground ring-offset-background transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              required
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleButtonClick}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-[0_4px_20px_hsla(48,_100%,_55%,_0.3)] transition-colors duration-300 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Sending..." : "Notify Me! 🔔"}
          </button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: feedback ? 1 : 0 }}
          className={`min-h-6 text-sm ${
            feedback?.tone === "error" ? "text-red-200" : "text-primary"
          }`}
          aria-live="polite"
        >
          {feedback?.text ?? ""}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-4 flex gap-4"
        >
          {socialPlatforms.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground"
            >
              <Icon size={20} />
            </button>
          ))}
        </motion.div>
      </section>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 z-10 text-sm text-muted-foreground"
      >
        © 2026 jaysforjeans.co.uk
      </motion.footer>
    </main>
  );
}
