"use client";

import { HeroCurrent } from "./hero-current";
import { HeroEditorial } from "./hero-editorial";
import { HeroNeon } from "./hero-neon";
import { HeroSynth } from "./hero-synth";

type HeroVariant = "current" | "neon" | "editorial" | "synth";

const ACTIVE_HERO: HeroVariant = "current";
// const ACTIVE_HERO: HeroVariant = "neon";
// const ACTIVE_HERO: HeroVariant = "editorial";
// const ACTIVE_HERO: HeroVariant = "synth";

export default function HeroPage() {
  switch (ACTIVE_HERO) {
    case "current":
      return <HeroCurrent />;
    case "neon":
      return <HeroNeon />;
    case "editorial":
      return <HeroEditorial />;
    case "synth":
      return <HeroSynth />;
    default:
      return <HeroCurrent />;
  }
}
