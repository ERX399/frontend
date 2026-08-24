import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 手机上卡片一律 full-bleed：`-mx-4` 抵消页面容器的 `px-4`，让边框与底色铺到
 * 屏幕边缘，同时去掉左右竖边 —— 竖边在 375px 上只是把正文又挤窄 2px，而那层
 * 框本来就不承载信息。子元素保持 `px-(--card-spacing)`（16px，正好等于页面
 * 的 px-4），所以文字仍落在与页面其它内容同一条竖线上。`sm` 起恢复成正常盒子。
 *
 * 这原本是 12 个调用点各自写一遍 `border-x-0 sm:border-x` +
 * `px-0 sm:px-(--card-spacing)` —— 但那套只去掉了竖边，底色仍停在 px-4 处，
 * 手机上看就是一块「没贴到边」的浮块。既然人人都要，就做成默认。
 *
 * 注意：调用点若自己传 `mx-*`（如浮层里的 `mx-auto`），tailwind-merge 会把
 * 这里的 `-mx-4` 顶掉 —— 那种场景要自己决定贴边方式，见 cookie-consent。
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card -mx-4 flex flex-col gap-(--card-spacing) overflow-hidden border border-x-0 border-border bg-card py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 sm:mx-0 sm:border-x",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-mono text-base leading-snug font-medium tracking-tight group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-border bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
