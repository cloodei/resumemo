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
    <footer className="relative overflow-hidden border-t border-white/5 bg-[#0a0a0f]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid gap-8 lg:grid-cols-5"
        >
          {/* Brand Section */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <Logo className="size-10 rounded-full" />
              <p className="text-xl font-bold text-white">Resumemo</p>
            </div>
            <p className="mb-6 max-w-xs text-sm text-gray-400">
              Transform your hiring process with AI-powered resume analysis. Find the perfect candidate 10x faster.
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all hover:border-purple-500/30 hover:bg-purple-500/10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-purple-400" />
                  <span className="sr-only">{label}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <motion.div key={category} variants={itemVariants}>
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-purple-400/70">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map(({ title, href, icon: Icon }) => (
                  <li key={title}>
                    <Link
                      href={href}
                      className="group relative flex items-center gap-2 text-sm text-gray-400 transition-all hover:text-white"
                    >
                      <Icon className="h-3 w-3 text-gray-600 transition-colors group-hover:text-purple-400" />
                      <span>{title}</span>
                      <ArrowUpRight className="ml-auto h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Simplified Newsletter Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="border-t border-white/5 py-8"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
              <div className="text-center lg:text-left">
                <h3 className="text-lg font-medium text-white">Join our newsletter</h3>
                <p className="mt-1 text-sm text-gray-400">AI recruiting insights delivered monthly.</p>
              </div>
              <form className="flex w-full max-w-md gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none backdrop-blur-sm transition-all focus:border-white/20 focus:bg-white/10"
                />
                <Button type="submit" className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90">
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-center lg:flex-row lg:text-left"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 lg:justify-start">
            <span> 2025 Resumemo. All rights reserved.</span>
            <span className="hidden lg:inline">•</span>
            <Link href="/sitemap" className="hover:text-gray-300 transition-colors">
              Sitemap
            </Link>
            <span>•</span>
            <Link href="/accessibility" className="hover:text-gray-300 transition-colors">
              Accessibility
            </Link>
            <span>•</span>
            <Link href="/changelog" className="hover:text-gray-300 transition-colors">
              Changelog
            </Link>
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-500">
            Made with <Heart className="h-3 w-3 fill-purple-400 text-purple-400" /> by Resumemo Team
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
