import path from "path";
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
  turbopack: {
    root: path.resolve(__dirname, './'),
  },
} satisfies NextConfig;
