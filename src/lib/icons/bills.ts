// Curated icon registry for recurring bill templates.
//
// The DB stores a string key (e.g. "home"). At render time, we look the
// key up in `BILL_ICONS` to get the lucide-react component. Adding a
// new icon = add an entry here; no schema migration needed.

import {
  Baby,
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
  Music,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Utensils,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

type LucideIcon = React.ComponentType<{
  className?: string;
  strokeWidth?: number;
}>;

type BillIconEntry = {
  Icon: LucideIcon;
  label: string;     // Portuguese label shown in the picker
  category: string;  // group heading in the picker
};

// Order matters — the picker renders items in this order, grouped by
// category in insertion order.
export const BILL_ICONS: Record<string, BillIconEntry> = {
  home: { Icon: Home, label: "Casa", category: "Moradia" },
  building: { Icon: Building, label: "Condomínio", category: "Moradia" },
  wifi: { Icon: Wifi, label: "Internet", category: "Moradia" },
  smartphone: { Icon: Smartphone, label: "Celular", category: "Moradia" },
  zap: { Icon: Zap, label: "Energia", category: "Moradia" },
  wrench: { Icon: Wrench, label: "Manutenção", category: "Moradia" },

  heart: { Icon: Heart, label: "Saúde", category: "Saúde" },
  stethoscope: { Icon: Stethoscope, label: "Médico", category: "Saúde" },
  brain: { Icon: Brain, label: "Terapia", category: "Saúde" },
  dumbbell: { Icon: Dumbbell, label: "Academia", category: "Saúde" },

  car: { Icon: Car, label: "Carro", category: "Transporte" },
  plane: { Icon: Plane, label: "Viagem", category: "Transporte" },

  utensils: { Icon: Utensils, label: "Alimentação", category: "Consumo" },
  coffee: { Icon: Coffee, label: "Café", category: "Consumo" },
  "shopping-cart": { Icon: ShoppingCart, label: "Compras", category: "Consumo" },
  shirt: { Icon: Shirt, label: "Roupas", category: "Consumo" },

  baby: { Icon: Baby, label: "Creche", category: "Família" },
  dog: { Icon: Dog, label: "Pet", category: "Família" },
  "graduation-cap": { Icon: GraduationCap, label: "Educação", category: "Família" },

  music: { Icon: Music, label: "Música", category: "Lazer" },
  film: { Icon: Film, label: "Streaming", category: "Lazer" },

  "credit-card": { Icon: CreditCard, label: "Cartão", category: "Financeiro" },
  "piggy-bank": { Icon: PiggyBank, label: "Poupança", category: "Financeiro" },
  briefcase: { Icon: Briefcase, label: "Trabalho", category: "Financeiro" },
};

export type BillIconKey = keyof typeof BILL_ICONS;

export function isBillIconKey(s: unknown): s is BillIconKey {
  return typeof s === "string" && s in BILL_ICONS;
}

// Returns the icon component for a key, or the fallback Receipt icon
// if the key is null/unknown.
export function iconFor(key: string | null | undefined): LucideIcon {
  if (key && key in BILL_ICONS) return BILL_ICONS[key as BillIconKey].Icon;
  return Receipt;
}

// Convenience grouping for the picker: orders categories by their
// first appearance in BILL_ICONS, and items within a category by
// insertion order.
export type BillIconGroup = {
  category: string;
  items: { key: BillIconKey; label: string; Icon: LucideIcon }[];
};

export function getBillIconGroups(): BillIconGroup[] {
  const groups = new Map<string, BillIconGroup>();
  for (const [key, entry] of Object.entries(BILL_ICONS)) {
    if (!groups.has(entry.category)) {
      groups.set(entry.category, { category: entry.category, items: [] });
    }
    groups.get(entry.category)!.items.push({
      key: key as BillIconKey,
      label: entry.label,
      Icon: entry.Icon,
    });
  }
  return Array.from(groups.values());
}
