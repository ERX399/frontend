import { useTheme } from "@/components/theme/ThemeProvider"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Icon } from "@/components/ui/icon"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <Icon icon="mdi:check-circle-outline" className="size-4 text-emerald-500" />,
        info: <Icon icon="mdi:information-outline" className="size-4 text-sky-400" />,
        warning: <Icon icon="mdi:alert-outline" className="size-4 text-amber-500" />,
        error: <Icon icon="mdi:alert-circle-outline" className="size-4 text-destructive" />,
        loading: <Spinner className="size-4" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0px",
          fontFamily: "var(--font-geist-sans)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      swipeDirections={['left', 'right']}
      closeButton
      {...props}
    />
  )
}

export { Toaster }
