'use client';

import Link from 'next/link';
import { motion, spring } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Twitter,
  Github,
  Linkedin,
  ArrowUpRight,
  Code2,
  Shield,
  FileText,
  Users,
  Zap,
  Building2,
} from 'lucide-react';
import { Logo } from './tlg';

const footerLinks = {
  product: [
    { title: 'Features', href: '#', icon: Zap },
    { title: 'Pricing', href: '#', icon: FileText },
    { title: 'Integrations', href: '#', icon: Code2 },
    { title: 'API Docs', href: '#', icon: FileText },
  ],
  company: [
    { title: 'About Us', href: '#', icon: Building2 },
    { title: 'Careers', href: '#', icon: Briefcase },
    { title: 'Blog', href: '#', icon: FileText },
    { title: 'Press Kit', href: '#', icon: Users },
  ],
  support: [
    { title: 'Help Center', href: '#', icon: Shield },
    { title: 'Community', href: '#', icon: Users },
    { title: 'Contact', href: '#', icon: FileText },
    { title: 'Status', href: '#', icon: Shield },
  ],
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Github, href: 'https://github.com/cloodei/resumemo', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
];

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: spring, stiffness: 100 },
  },
};

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-surface">
      {/* Brand-themed background gradients */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-brand/15 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-32 w-[90%] rounded-full bg-brand/8 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-brand/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid gap-10 py-16 lg:grid-cols-12"
        >
          {/* Brand Section */}
          <motion.div variants={itemVariants} className="space-y-6 lg:col-span-4">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Logo className="size-10 rounded-2xl" />
                <div>
                  <p className="text-lg font-semibold text-white">Resumemo</p>
                  <p className="text-sm text-slate-400">AI Talent Suite</p>
                </div>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                Precision-grade resume intelligence for ambitious talent teams. Discover, assess, and hire with confidence.
              </p>
            </div>

            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:border-brand/40 hover:bg-brand/10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="size-4 text-slate-400 transition-colors group-hover:text-brand" />
                  <span className="sr-only">{label}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Sections */}
          <motion.div variants={itemVariants} className="lg:col-span-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {Object.entries(footerLinks).map(([category, links]) => (
                <div key={category}>
                  <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-brand/70">
                    {category}
                  </h3>
                  <ul className="space-y-2">
                    {links.map(({ title, href }) => (
                      <li key={title}>
                        <Link
                          href={href}
                          className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
                        >
                          <span>{title}</span>
                          <ArrowUpRight className="size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col gap-4 border-t border-white/10 py-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 sm:justify-start">
            <span>© {new Date().getFullYear()} Resumemo. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <Link href="/privacy" className="transition-colors hover:text-slate-300">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/terms" className="transition-colors hover:text-slate-300">
              Terms
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Built with care by the Resumemo Team
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
