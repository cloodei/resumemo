import type { NextConfig } from "next";

export default {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
    ],
  },
} satisfies NextConfig;
