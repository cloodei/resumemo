import { useEffect } from "react"

type RouteTitleProps = {
  title: string
}

export function RouteTitle({ title }: RouteTitleProps) {
  useEffect(() => {
    document.title = title
  }, [title])

  return null
}
