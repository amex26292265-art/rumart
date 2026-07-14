import {
  Gamepad2,
  Gamepad,
  Swords,
  Crosshair,
  MessageCircle,
  Send,
  Sparkles,
  Music,
  Blocks,
  Box,
  Castle,
  AtSign,
  Gift,
  Trophy,
  Car,
  Shield,
  Package,
  type LucideIcon,
} from "lucide-react";

/** Static map keeps only icons we actually use in the bundle, with a fallback. */
const ICONS: Record<string, LucideIcon> = {
  Gamepad2,
  Gamepad,
  Swords,
  Crosshair,
  MessageCircle,
  Send,
  Sparkles,
  Music,
  Blocks,
  Box,
  Castle,
  AtSign,
  Gift,
  Trophy,
  Car,
  Shield,
};

export function CategoryIcon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = (name && ICONS[name]) || Package;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
