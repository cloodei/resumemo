import { cn } from "@/lib/utils";

export type LogoProps = React.SVGProps<SVGSVGElement> & {
  backgroundFill?: string
  backgroundStroke?: string
  backgroundStrokeWidth?: number
  backgroundClassName?: string
  glyphFill?: string
  glyphClassName?: string
  cornerRadius?: number
}

export function Logo({
  className,
  backgroundFill = "#140005",
  backgroundStroke,
  backgroundStrokeWidth = 1,
  backgroundClassName,
  glyphFill = "#C95D42",
  glyphClassName,
  cornerRadius = 12,
  ...props
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-4", className)}
      aria-label="Résumé Ranker logo"
      {...props}
    >
      <rect
        width="64"
        height="64"
        rx={cornerRadius}
        fill={backgroundFill}
        stroke={backgroundStroke}
        strokeWidth={backgroundStroke ? backgroundStrokeWidth : undefined}
        className={backgroundClassName}
      />
      <path
        d="M32.2317 14.2343C32.2333 12.4585 30.8286 11.0176 29.0942 11.0161L18.8879 11.0071L14.9625 11.0036C12.7945 11.0017 11.0354 12.7996 11.0334 15.0195L11.0034 48.9833C11.0015 51.2032 12.7574 53.0043 14.9254 53.0062L49.077 53.0363C51.245 53.0382 53.0041 51.2403 53.006 49.0204L53.036 15.0566C53.038 12.8367 51.2821 11.0357 49.1141 11.0337L47.0417 11.0319C45.9824 11.031 44.9678 11.4684 44.2281 12.2448L25.8886 31.4965C24.6077 32.8411 24.6198 34.99 25.9158 36.3193C27.224 37.6613 29.3471 37.6631 30.6577 36.3235L38.6686 28.1355C41.1438 25.6056 45.3704 27.4027 45.3673 30.9836L45.3578 41.7788C45.3558 43.9987 43.5967 45.7966 41.4288 45.7947L21.6051 45.7772C19.4371 45.7753 17.6812 43.9742 17.6832 41.7544L17.7004 22.2603C17.7023 20.0405 19.4614 18.2424 21.6294 18.2444L28.3027 18.2503C30.4707 18.2522 32.2298 16.4542 32.2317 14.2343Z"
        fill={glyphFill}
        className={glyphClassName}
      />
    </svg>
  )
}
