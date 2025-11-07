'use client';

import Link from 'next/link';
import { motion, spring, easeInOut } from 'motion/react';
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

const footerLinks = {
  product: [
    { title: 'Features', href: '/features', icon: Zap },
    { title: 'Pricing', href: '/pricing', icon: FileText },
    { title: 'Integrations', href: '/integrations', icon: Code2 },
    { title: 'API Docs', href: '/api-docs', icon: FileText },
  ],
  company: [
    { title: 'About Us', href: '/about', icon: Building2 },
    { title: 'Careers', href: '/careers', icon: Briefcase },
    { title: 'Blog', href: '/blog', icon: FileText },
    { title: 'Press Kit', href: '/press', icon: Users },
  ],
  support: [
    { title: 'Help Center', href: '/help', icon: Heart },
    { title: 'Community', href: '/community', icon: Users },
    { title: 'Contact', href: '/contact', icon: Mail },
    { title: 'Status', href: '/status', icon: Shield },
  ],
  legal: [
    { title: 'Privacy Policy', href: '/privacy', icon: Shield },
    { title: 'Terms of Service', href: '/terms', icon: FileText },
    { title: 'Cookie Policy', href: '/cookies', icon: Shield },
    { title: 'Security', href: '/security', icon: Shield },
  ],
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
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
    <footer className="relative mt-auto overflow-hidden border-t border-white/5 bg-black pt-16 pb-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--tw-gradient-stops))] from-purple-900/10 via-black to-black" />
        <motion.div
          variants={glowVariants}
          animate="animate"
          className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-purple-600/10 blur-[100px]"
        />
        <motion.div
          variants={glowVariants}
          animate="animate"
          className="absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-blue-600/10 blur-[80px]"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-20" />
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
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-linear-to-r from-purple-600 to-blue-600 blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-r from-purple-600 to-blue-600">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-white">Resumemo</span>
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
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-300">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map(({ title, href, icon: Icon }) => (
                  <li key={title}>
                    <Link
                      href={href}
                      className="group flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
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

        {/* Newsletter Section */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 rounded-2xl border border-purple-500/20 bg-linear-to-r from-purple-500/10 via-transparent to-blue-500/10 p-6"
        >
          <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Stay ahead in recruitment
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Get weekly insights on AI hiring trends and best practices.
              </p>
            </div>
            <div className="flex w-full max-w-sm gap-2 lg:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-purple-500/50 focus:bg-white/10"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full bg-linear-to-r from-purple-600 to-blue-600 px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-purple-600/25"
              >
                Subscribe
              </motion.button>
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
            <span>© 2025 Resumemo. All rights reserved.</span>
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
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Made with</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Heart className="h-3 w-3 fill-red-500 text-red-500" />
            </motion.div>
            <span>by the Resumemo team</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
