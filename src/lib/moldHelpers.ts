import { moldPresets } from "./molds";
import type { MoldPreset } from "./types";

export function sizeKey(preset: MoldPreset): string {
  if (preset.diameter_cm) {
    return `H${preset.height_cm}-D${preset.diameter_cm}`;
  }
  if (preset.length_cm) {
    return `W${preset.width_cm}-L${preset.length_cm}`;
  }
  if (preset.width_cm) {
    return `H${preset.height_cm}-W${preset.width_cm}`;
  }
  return preset.mold_rating;
}

export function sizeLabel(preset: MoldPreset): string {
  if (preset.diameter_cm) {
    return `H ${preset.height_cm} cm × Ø ${preset.diameter_cm} cm`;
  }
  if (preset.length_cm) {
    return `W ${preset.width_cm} cm × L ${preset.length_cm} cm`;
  }
  if (preset.width_cm) {
    return `H ${preset.height_cm} cm × W ${preset.width_cm} cm`;
  }
  return preset.mold_rating;
}

export function normalizeMoldSelection(selection?: {
  product_type: string;
  mold_rating: string;
}): { product_type: string; mold_rating: string } | undefined {
  if (!selection) return selection;
  const found = moldPresets.find(
    (preset) =>
      preset.product_type === selection.product_type &&
      preset.mold_rating === selection.mold_rating
  );
  if (!found) return selection;
  return {
    product_type: selection.product_type,
    mold_rating: sizeKey(found),
  };
}
