import type { IngredientUnit } from "./types";

const UNIT_TO_GRAMS: Record<IngredientUnit, number> = {
  g: 1,
  oz: 28.3495,
  lb: 453.592,
  cup: 120,
  qty: 1,
};

export const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: "g", label: "g" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
  { value: "cup", label: "cup (est.)" },
  { value: "qty", label: "qty" },
];

export function toUnit(grams: number, unit: IngredientUnit): number {
  const factor = UNIT_TO_GRAMS[unit] ?? 1;
  return grams / factor;
}

export function fromUnit(value: number, unit: IngredientUnit): number {
  const factor = UNIT_TO_GRAMS[unit] ?? 1;
  return value * factor;
}

export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(digits).replace(/\.0+$/, "");
}
