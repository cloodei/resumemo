'use client';

import Link from 'next/link';
import { motion, spring, easeInOut } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Twitter,
  Github,
  Linkedin,
  Mail,
  Heart,
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
    { title: 'Help Center', href: '#', icon: Heart },
    { title: 'Community', href: '#', icon: Users },
    { title: 'Contact', href: '#', icon: Mail },
    { title: 'Status', href: '#', icon: Shield },
  ],
  legal: [
    { title: 'Privacy Policy', href: '#', icon: Shield },
    { title: 'Terms of Service', href: '#', icon: FileText },
    { title: 'Cookie Policy', href: '#', icon: Shield },
    { title: 'Security', href: '#', icon: Shield },
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

const glowVariants = {
  animate: {
    opacity: [0.3, 0.6, 0.3],
    scale: [1, 1.2, 1],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-[#05050a]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-32 w-[90%] rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid gap-10 lg:grid-cols-12"
        >
          {/* Brand Section */}
          <motion.div variants={itemVariants} className="space-y-6 rounded-3xl border border-white/5 bg-white/5/10 p-6 backdrop-blur lg:col-span-4">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Logo className="size-11 rounded-2xl" />
                <div>
                  <p className="text-base font-semibold uppercase tracking-[0.28em] text-gray-500">Resumemo</p>
                  <p className="text-2xl font-semibold text-white">AI Talent Suite</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Precision-grade resume intelligence for ambitious talent teams. Discover, assess, and hire with confidence.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Teams onboarded', value: '280+' },
                { label: 'Avg. time saved', value: '32 hrs/wk' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-gray-400">
                  <p className="text-xs uppercase tracking-widest text-gray-500">{metric.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:border-purple-400/40 hover:bg-purple-500/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-white" />
                  <span className="sr-only">{label}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Sections */}
          <motion.div variants={itemVariants} className="lg:col-span-5">
            <div className="grid gap-8 sm:grid-cols-2">
              {Object.entries(footerLinks).map(([category, links]) => (
                <div key={category}>
                  <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-purple-300/70">
                    {category}
                  </h3>
                  <ul className="space-y-2">
                    {links.map(({ title, href, icon: Icon }) => (
                      <li key={title}>
                        <Link
                          href={href}
                          className="group relative flex items-center gap-2 rounded-xl px-2 py-1 text-sm text-gray-400 transition-all hover:bg-white/5 hover:text-white"
                        >
                          <Icon className="h-3.5 w-3.5 text-gray-600 transition-colors group-hover:text-purple-300" />
                          <span>{title}</span>
                          <ArrowUpRight className="ml-auto h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.3),transparent_55%)] p-6 lg:col-span-3">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
            <div className="relative space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-purple-200">newsletter</p>
              <h3 className="text-2xl font-semibold text-white">Signal over noise hiring intel</h3>
              <p className="text-sm text-gray-400">
                Monthly drops on AI sourcing playbooks, ethical automation, and changelog-first product updates.
              </p>
              <form className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="work@email.com"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-400/60 focus:bg-white/10"
                />
                <Button type="submit" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90">
                  Stay in the loop
                </Button>
              </form>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="h-3.5 w-3.5 text-purple-300" />
                Zero spam — unsubscribe anytime.
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-14 flex flex-col gap-6 border-t border-white/5 py-8 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 lg:justify-start">
            <span>© {new Date().getFullYear()} Resumemo. All rights reserved.</span>
            <span className="hidden lg:inline">•</span>
            <Link href="/sitemap" className="transition-colors hover:text-gray-300">
              Sitemap
            </Link>
            <span>•</span>
            <Link href="/accessibility" className="transition-colors hover:text-gray-300">
              Accessibility
            </Link>
            <span>•</span>
            <Link href="/changelog" className="transition-colors hover:text-gray-300">
              Changelog
            </Link>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
            Made with <Heart className="h-3 w-3 fill-purple-400 text-purple-400" /> by Resumemo Team
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
