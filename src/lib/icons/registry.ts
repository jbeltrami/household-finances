// The app's icon registry.
//
// The DB stores a short string key (e.g. "home"). At render time we look it
// up here to get the lucide component. Adding an icon is an entry in this
// map — no schema migration, because no column constrains the value.
//
// This file used to be `bills.ts`, and used to do a second job: each entry
// carried a `category`, and `categoryFor(icon)` was the authoritative source
// of an entry's Categoria. Picking the wifi icon silently filed a Conta under
// "Moradia", and there was no way to have one without the other. Categorias
// are user-managed now, so the derivation is gone and an icon is only ever an
// icon — chosen independently, and falling back to the Categoria's own when a
// row has none.
//
// The list is flat for the same reason. The old picker grouped icons under
// headings taken from those hardcoded category names, which would now tell a
// user "Moradia" while their own list says "Casa".

import {
  Baby,
  Banknote,
  Brain,
  Briefcase,
  Building,
  Car,
  Coffee,
  CreditCard,
  Dog,
  Dumbbell,
  Film,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Laptop,
  Music,
  PiggyBank,
  Plane,
  Receipt,
  RotateCcw,
  Shirt,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Tag,
  TrendingUp,
  Utensils,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

type LucideIcon = React.ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

type IconEntry = {
  Icon: LucideIcon;
  label: string; // Portuguese label, shown as the picker's tooltip
};

// Insertion order is render order in the picker. Loosely themed so related
// icons sit near each other, but the grouping is presentational only and
// carries no meaning the app reads.
export const ICONS: Record<string, IconEntry> = {
  home: { Icon: Home, label: "Casa" },
  building: { Icon: Building, label: "Condomínio" },
  wifi: { Icon: Wifi, label: "Internet" },
  smartphone: { Icon: Smartphone, label: "Celular" },
  zap: { Icon: Zap, label: "Energia" },
  wrench: { Icon: Wrench, label: "Manutenção" },

  heart: { Icon: Heart, label: "Saúde" },
  stethoscope: { Icon: Stethoscope, label: "Médico" },
  brain: { Icon: Brain, label: "Terapia" },
  dumbbell: { Icon: Dumbbell, label: "Academia" },

  car: { Icon: Car, label: "Carro" },
  plane: { Icon: Plane, label: "Viagem" },

  utensils: { Icon: Utensils, label: "Alimentação" },
  coffee: { Icon: Coffee, label: "Café" },
  "shopping-cart": { Icon: ShoppingCart, label: "Compras" },
  shirt: { Icon: Shirt, label: "Roupas" },

  baby: { Icon: Baby, label: "Creche" },
  dog: { Icon: Dog, label: "Pet" },
  "graduation-cap": { Icon: GraduationCap, label: "Educação" },

  music: { Icon: Music, label: "Música" },
  film: { Icon: Film, label: "Streaming" },

  "credit-card": { Icon: CreditCard, label: "Cartão" },
  "piggy-bank": { Icon: PiggyBank, label: "Poupança" },
  briefcase: { Icon: Briefcase, label: "Trabalho" },

  banknote: { Icon: Banknote, label: "Salário" },
  laptop: { Icon: Laptop, label: "Freelance" },
  landmark: { Icon: Landmark, label: "Governo" },
  tag: { Icon: Tag, label: "Vendas" },
  "trending-up": { Icon: TrendingUp, label: "Investimentos" },
  "rotate-ccw": { Icon: RotateCcw, label: "Reembolso" },
};

export type IconKey = keyof typeof ICONS;

export function isIconKey(s: unknown): s is IconKey {
  return typeof s === "string" && s in ICONS;
}

// The icon component for a key, or the fallback Receipt when the key is
// null or unregistered.
export function iconFor(key: string | null | undefined): LucideIcon {
  if (key && key in ICONS) return ICONS[key as IconKey].Icon;
  return Receipt;
}

export function getIconList(): { key: IconKey; label: string; Icon: LucideIcon }[] {
  return Object.entries(ICONS).map(([key, entry]) => ({
    key: key as IconKey,
    label: entry.label,
    Icon: entry.Icon,
  }));
}
