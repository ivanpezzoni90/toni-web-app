"use client";

import { useMemo } from "react";
import { moldPresets } from "@lib/molds";
import type { Recipe } from "@lib/types";
import { sizeKey, sizeLabel } from "@lib/moldHelpers";
import styles from "./MoldHelperModal.module.scss";

type MoldHelperModalProps = {
  open: boolean;
  selection?: Recipe["mold_selection"];
  onSelectionChange: (selection: Recipe["mold_selection"]) => void;
  onApply: (weight: number) => void;
  onClose: () => void;
};

export default function MoldHelperModal({
  open,
  selection,
  onSelectionChange,
  onApply,
  onClose,
}: MoldHelperModalProps) {
  const productTypes = useMemo(
    () => Array.from(new Set(moldPresets.map((preset) => preset.product_type))),
    []
  );

  const sizeOptions = useMemo(() => {
    if (!selection?.product_type)
      return [] as { value: string; label: string }[];
    return moldPresets
      .filter((preset) => preset.product_type === selection.product_type)
      .map((preset) => ({ value: sizeKey(preset), label: sizeLabel(preset) }));
  }, [selection?.product_type]);

  const selectedPreset = useMemo(() => {
    if (!selection?.product_type || !selection.mold_rating) return null;
    return (
      moldPresets.find(
        (preset) =>
          preset.product_type === selection.product_type &&
          (sizeKey(preset) === selection.mold_rating ||
            preset.mold_rating === selection.mold_rating)
      ) ?? null
    );
  }, [selection]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3>Mold helper</h3>
            <p>Pick a mold and apply the suggested dough weight.</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Close mold helper"
          >
            ×
          </button>
        </div>
        <div className={styles.gridThree}>
          <label className={styles.field}>
            <span>Product type</span>
            <select
              value={selection?.product_type ?? ""}
              onChange={(event) =>
                onSelectionChange({
                  product_type: event.target.value,
                  mold_rating: "",
                })
              }
            >
              <option value="">Select product</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Size (H × Ø or W × L)</span>
            <select
              value={selection?.mold_rating ?? ""}
              onChange={(event) =>
                onSelectionChange({
                  product_type: selection?.product_type ?? "",
                  mold_rating: event.target.value,
                })
              }
            >
              <option value="">Select size</option>
              {sizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {selectedPreset ? (
            <div className={styles.moldDetails}>
              <div>
                <p>Notes</p>
                <span>{selectedPreset.notes}</span>
              </div>
            </div>
          ) : null}
          <div className={styles.helperBox}>
            <p>Suggested dough range</p>
            <strong>
              {selectedPreset
                ? selectedPreset.suggested_dough_weight_min_g ===
                  selectedPreset.suggested_dough_weight_max_g
                  ? `${selectedPreset.suggested_dough_weight_min_g} g`
                  : `${selectedPreset.suggested_dough_weight_min_g}-${selectedPreset.suggested_dough_weight_max_g} g`
                : "Pick a mold"}
            </strong>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!selectedPreset}
              onClick={() => {
                if (!selectedPreset) return;
                const average =
                  (selectedPreset.suggested_dough_weight_min_g +
                    selectedPreset.suggested_dough_weight_max_g) /
                  2;
                onApply(Math.round(average));
                onClose();
              }}
            >
              Add dough weight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
