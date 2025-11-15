'use client';

import { ArrowRight, Sparkles, Zap, Stars } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const features = [
    { icon: Sparkles, text: 'AI-Powered', color: 'from-purple-400 to-indigo-400' },
    { icon: Zap, text: 'Lightning Fast', color: 'from-indigo-400 to-purple-400' },
    { icon: Stars, text: 'Simply Magic', color: 'from-purple-400 to-pink-400' },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0f]">
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_top,rgba(99,102,241,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.1)_0%,transparent_60%)]"></div>
      
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20">
        
        <div className="mb-8 animate-bounce">
          <div className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-black/30 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-400">Something exciting is here</span>
          </div>
        </div>

        <h1 className="mb-4 text-center text-6xl font-bold tracking-tight text-white md:text-8xl">
          <span className="inline-block hover:animate-pulse">R</span>
          <span className="inline-block hover:animate-pulse">e</span>
          <span className="inline-block hover:animate-pulse">s</span>
          <span className="inline-block hover:animate-pulse">u</span>
          <span className="bg-linear-to-br from-purple-400 to-indigo-400 bg-clip-text text-transparent hover:animate-pulse">
            Memo
          </span>
        </h1>

        <p className="mb-12 max-w-2xl text-center text-xl text-gray-400 md:text-2xl">
          Your resume, but{' '}
          <span className="bg-linear-to-br from-purple-400 to-indigo-400 bg-clip-text font-semibold text-transparent">
            actually interesting
          </span>
        </p>

        <div className="mb-12 flex flex-wrap items-center justify-center gap-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredCard(idx)}
                onMouseLeave={() => setHoveredCard(null)}
                className="group relative cursor-pointer transition-transform hover:scale-105"
              >
                <div className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-black/40 px-6 py-3 backdrop-blur-sm transition-all hover:border-purple-500/40 hover:bg-black/60">
                  <Icon 
                    className={`h-5 w-5 transition-all ${
                      hoveredCard === idx ? 'rotate-12 scale-110' : ''
                    }`}
                    style={{
                      background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  />
                  <span className="text-sm font-medium text-gray-300">{feature.text}</span>
                </div>
                {hoveredCard === idx && (
                  <div className="absolute -inset-1 -z-10 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 blur-xl"></div>
                )}
              </div>
            );
          })}
        </div>

        <button className="group relative overflow-hidden rounded-lg border border-purple-500/20 bg-black/50 px-8 py-4 backdrop-blur-sm transition-all hover:border-purple-500/40 hover:bg-black/70">
          <div className="absolute inset-0 -z-10 bg-linear-to-br from-purple-500/0 to-indigo-500/0 opacity-0 transition-opacity group-hover:opacity-20"></div>
          <div className="flex items-center gap-2 text-white">
            <span className="font-semibold">Get Started</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <div className="mt-20 text-center">
          <p className="text-sm text-gray-600">
            No boring templates. No generic layouts. Just{' '}
            <span className="text-purple-400">✨ vibes ✨</span>
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute left-10 top-20 h-32 w-32 animate-pulse rounded-full bg-purple-500/5 blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-20 right-10 h-40 w-40 animate-pulse rounded-full bg-indigo-500/5 blur-3xl" style={{ animationDelay: '1s' }}></div>
    </main>
  );
}
