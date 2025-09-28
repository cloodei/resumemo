import type { NextConfig } from "next";

export default {
  // experimental: {
  //   reactCompiler: true
  // },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true
      }
    ]
  },
  outputFileTracingRoot: "E:\\New folder\\any-nextjs\\resumemo\\frontend"
} satisfies NextConfig;
