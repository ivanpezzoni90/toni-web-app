"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MoldHelperModal from "@/components/MoldHelperModal";
import { makeId, slugify } from "@/lib/slug";
import { formatNumber, fromUnit, toUnit, unitOptions } from "@/lib/units";
import type {
  Dough,
  Ingredient,
  IngredientGroup,
  Recipe,
  RecipeStep,
  Starter,
} from "@/lib/types";
import { normalizeMoldSelection } from "@/lib/moldHelpers";
import styles from "./RecipeForm.module.css";

const categoryOptions: Recipe["category"][] = [
  "Panettone",
  "Pandoro",
  "Panettone Gastronomico",
  "Colomba",
  "Other",
];

const ingredientGroups: IngredientGroup[] = [
  "Starter",
  "Flour",
  "Liquid",
  "Eggs",
  "Fat",
  "Sugar",
  "Salt",
  "Aromatic",
  "Other",
];

const defaultStepOrder = [
  "pre-yeast",
  "flour",
  "liquids",
  "eggs",
  "fat",
  "mix",
  "rest",
  "bake",
];

const defaultIngredient: Ingredient = {
  id: "",
  name: "",
  qty_g: 0,
  unit: "g",
  group: "Flour",
  qty_weight_g: undefined,
};

function createIngredient(): Ingredient {
  return { ...defaultIngredient, id: makeId() };
}

function createDough(name = "Main dough", ingredients?: Ingredient[]): Dough {
  return {
    id: makeId(),
    name,
    ingredients:
      ingredients && ingredients.length ? ingredients : [createIngredient()],
  };
}

function createStarter(name = "Starter", ingredients?: Ingredient[]): Starter {
  return {
    id: makeId(),
    name,
    description: "",
    ingredients:
      ingredients && ingredients.length ? ingredients : [createIngredient()],
  };
}

function createStep(): RecipeStep {
  return { id: makeId(), title: "", phase: "", ingredient_ids: [] };
}

function ingredientGrams(ingredient: Ingredient): number | null {
  if (ingredient.unit === "qty") {
    if (!ingredient.qty_weight_g || ingredient.qty_weight_g <= 0) return null;
    return ingredient.qty_g * ingredient.qty_weight_g;
  }
  return ingredient.qty_g;
}

type RecipeFormProps = {
  mode: "new" | "edit";
  initialRecipe?: Recipe;
  onSave: (recipe: Recipe) => void;
};

export default function RecipeForm({
  mode,
  initialRecipe,
  onSave,
}: RecipeFormProps) {
  const [name, setName] = useState(initialRecipe?.name ?? "");
  const [category, setCategory] = useState<Recipe["category"]>(
    initialRecipe?.category ?? "Panettone"
  );
  const [pieces, setPieces] = useState(initialRecipe?.pieces ?? 1);
  const [doughPerPieceG, setDoughPerPieceG] = useState(
    initialRecipe?.dough_per_piece_g ?? 1100
  );
  const [doughs, setDoughs] = useState<Dough[]>(() => {
    if (initialRecipe?.doughs?.length) return initialRecipe.doughs;
    if (initialRecipe?.ingredients?.length) {
      return [createDough("Main dough", initialRecipe.ingredients)];
    }
    return [createDough()];
  });
  const [starters, setStarters] = useState<Starter[]>(() => {
    if (initialRecipe?.starters?.length) return initialRecipe.starters;
    return [];
  });
  const [steps, setSteps] = useState<RecipeStep[]>(
    initialRecipe?.steps?.length ? initialRecipe.steps : [createStep()]
  );
  const [moldSelection, setMoldSelection] = useState<Recipe["mold_selection"]>(
    () => normalizeMoldSelection(initialRecipe?.mold_selection)
  );
  const [showBakers, setShowBakers] = useState(true);
  const [multipleDoughs, setMultipleDoughs] = useState(
    (initialRecipe?.doughs?.length ?? 1) > 1
  );
  const [showMoldHelper, setShowMoldHelper] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allIngredients = useMemo(
    () => [
      ...doughs.flatMap((dough) => dough.ingredients),
      ...starters.flatMap((starter) => starter.ingredients),
    ],
    [doughs, starters]
  );

  const flourBase = useMemo(
    () =>
      allIngredients
        .filter(
          (ingredient) =>
            ingredient.group === "Flour" && ingredient.unit !== "qty"
        )
        .reduce((sum, ingredient) => sum + ingredient.qty_g, 0),
    [allIngredients]
  );

  const ingredientTotals = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        total_g: number | null;
        total_qty: number;
        units: Set<Ingredient["unit"]>;
      }
    >();
    allIngredients.forEach((ingredient) => {
      const trimmed = ingredient.name.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      const grams = ingredientGrams(ingredient);
      const qtyTotal =
        ingredient.unit === "qty" ? ingredient.qty_g * pieces : 0;
      const entry = map.get(key);
      if (entry) {
        if (grams !== null) {
          entry.total_g = (entry.total_g ?? 0) + grams * pieces;
        }
        entry.total_qty += qtyTotal;
        entry.units.add(ingredient.unit);
      } else {
        map.set(key, {
          name: trimmed,
          total_g: grams !== null ? grams * pieces : null,
          total_qty: qtyTotal,
          units: new Set([ingredient.unit]),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [allIngredients, pieces]);

  const totalDough = pieces * doughPerPieceG;

  const handleIngredientUpdate = (
    doughId: string,
    id: string,
    updates: Partial<Ingredient>
  ) => {
    setDoughs((items) =>
      items.map((dough) =>
        dough.id === doughId
          ? {
              ...dough,
              ingredients: dough.ingredients.map((item) =>
                item.id === id ? { ...item, ...updates } : item
              ),
            }
          : dough
      )
    );
  };

  const handleRemoveIngredient = (doughId: string, id: string) => {
    setDoughs((items) =>
      items.map((dough) =>
        dough.id === doughId
          ? {
              ...dough,
              ingredients: dough.ingredients.filter((item) => item.id !== id),
            }
          : dough
      )
    );
  };

  const handleAddIngredient = (doughId: string) => {
    setDoughs((items) =>
      items.map((dough) =>
        dough.id === doughId
          ? {
              ...dough,
              ingredients: [...dough.ingredients, createIngredient()],
            }
          : dough
      )
    );
  };

  const handleDoughName = (doughId: string, nameValue: string) => {
    setDoughs((items) =>
      items.map((dough) =>
        dough.id === doughId ? { ...dough, name: nameValue } : dough
      )
    );
  };

  const handleAddDough = () => {
    setDoughs((items) => [...items, createDough(`Dough ${items.length + 1}`)]);
  };

  const handleRemoveDough = (doughId: string) => {
    setDoughs((items) => {
      const removed = items.find((dough) => dough.id === doughId);
      if (removed) {
        const removedIds = new Set(removed.ingredients.map((item) => item.id));
        setSteps((current) =>
          current.map((step) => ({
            ...step,
            ingredient_ids: step.ingredient_ids?.filter(
              (id) => !removedIds.has(id)
            ),
          }))
        );
      }
      return items.filter((dough) => dough.id !== doughId);
    });
  };

  const handleToggleDoughMode = () => {
    setMultipleDoughs((prev) => {
      if (prev) {
        setDoughs((items) => {
          if (items.length <= 1) return items;
          const mergedIngredients = items.flatMap((dough) => dough.ingredients);
          return [createDough("Main dough", mergedIngredients)];
        });
      }
      return !prev;
    });
  };

  const handleStarterUpdate = (
    starterId: string,
    id: string,
    updates: Partial<Ingredient>
  ) => {
    setStarters((items) =>
      items.map((starter) =>
        starter.id === starterId
          ? {
              ...starter,
              ingredients: starter.ingredients.map((item) =>
                item.id === id ? { ...item, ...updates } : item
              ),
            }
          : starter
      )
    );
  };

  const handleRemoveStarterIngredient = (starterId: string, id: string) => {
    setStarters((items) =>
      items.map((starter) =>
        starter.id === starterId
          ? {
              ...starter,
              ingredients: starter.ingredients.filter((item) => item.id !== id),
            }
          : starter
      )
    );
  };

  const handleAddStarterIngredient = (starterId: string) => {
    setStarters((items) =>
      items.map((starter) =>
        starter.id === starterId
          ? {
              ...starter,
              ingredients: [...starter.ingredients, createIngredient()],
            }
          : starter
      )
    );
  };

  const handleStarterName = (starterId: string, nameValue: string) => {
    setStarters((items) =>
      items.map((starter) =>
        starter.id === starterId ? { ...starter, name: nameValue } : starter
      )
    );
  };

  const handleStarterDescription = (starterId: string, textValue: string) => {
    setStarters((items) =>
      items.map((starter) =>
        starter.id === starterId ? { ...starter, description: textValue } : starter
      )
    );
  };

  const handleAddStarter = () => {
    setStarters((items) => [
      ...items,
      createStarter(`Starter ${items.length + 1}`),
    ]);
  };

  const handleRemoveStarter = (starterId: string) => {
    setStarters((items) => {
      const removed = items.find((starter) => starter.id === starterId);
      if (removed) {
        const removedIds = new Set(removed.ingredients.map((item) => item.id));
        setSteps((current) =>
          current.map((step) => ({
            ...step,
            ingredient_ids: step.ingredient_ids?.filter(
              (id) => !removedIds.has(id)
            ),
          }))
        );
      }
      return items.filter((starter) => starter.id !== starterId);
    });
  };

  const handleStepUpdate = (id: string, updates: Partial<RecipeStep>) => {
    setSteps((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveStep = (id: string) => {
    setSteps((items) => items.filter((item) => item.id !== id));
  };

  const handleMoveStep = (id: string, direction: "up" | "down") => {
    setSteps((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return items;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= items.length) return items;
      const updated = [...items];
      const [moved] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, moved);
      return updated;
    });
  };

  const applyDoughPerPiece = (value: number) => {
    setDoughPerPieceG((prev) => {
      const safePrev = prev || 1;
      const safeNext = value || 1;
      const ratio = safeNext / safePrev;
      if (ratio !== 1) {
        setDoughs((items) =>
          items.map((dough) => ({
            ...dough,
            ingredients: dough.ingredients.map((item) => ({
              ...item,
              qty_g: Math.max(0, item.qty_g * ratio),
            })),
          }))
        );
        setStarters((items) =>
          items.map((starter) => ({
            ...starter,
            ingredients: starter.ingredients.map((item) => ({
              ...item,
              qty_g: Math.max(0, item.qty_g * ratio),
            })),
          }))
        );
      }
      return safeNext;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please give the recipe a name.");
      return;
    }
    setError(null);
    const now = new Date().toISOString();
    const slug = slugify(name);
    const cleanedDoughs = doughs.map((dough, index) => ({
      ...dough,
      name: dough.name.trim() || `Dough ${index + 1}`,
      ingredients: dough.ingredients.filter((ingredient) =>
        ingredient.name.trim()
      ),
    }));
    const cleanedStarters = starters.map((starter, index) => ({
      ...starter,
      name: starter.name.trim() || `Starter ${index + 1}`,
      description: starter.description?.trim() || "",
      ingredients: starter.ingredients.filter((ingredient) =>
        ingredient.name.trim()
      ),
    }));
    const flattenedIngredients = [
      ...cleanedDoughs.flatMap((dough) => dough.ingredients),
      ...cleanedStarters.flatMap((starter) => starter.ingredients),
    ];
    const recipe: Recipe = {
      id: initialRecipe?.id ?? makeId(),
      name: name.trim(),
      slug,
      category,
      pieces: Math.max(1, pieces),
      dough_per_piece_g: Math.max(1, doughPerPieceG),
      ingredients: flattenedIngredients,
      doughs: cleanedDoughs,
      starters: cleanedStarters,
      steps: steps.filter((step) => step.title.trim()),
      mold_selection: moldSelection,
      created_at: initialRecipe?.created_at ?? now,
      updated_at: now,
    };
    onSave(recipe);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {mode === "new" ? "New recipe" : "Edit recipe"}
          </p>
          <h1 className={styles.title}>{name || "Untitled recipe"}</h1>
          <p className={styles.subtitle}>
            Build a recipe with multiple doughs, then setup the procedure.
          </p>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Recipe basics</h2>
          <p>Define the dough, then scale with pieces and molds.</p>
        </div>
        <div className={styles.gridTwo}>
          <label className={styles.field}>
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Panettone classico"
            />
          </label>
          <label className={styles.field}>
            <span>Category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as Recipe["category"])
              }
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Pieces</span>
            <input
              type="number"
              min={1}
              value={pieces}
              onChange={(event) => setPieces(Number(event.target.value))}
            />
          </label>
          <label className={styles.field}>
            <span>Dough per piece (g)</span>
            <input
              type="number"
              min={1}
              value={doughPerPieceG}
              onChange={(event) =>
                applyDoughPerPiece(Number(event.target.value))
              }
            />
            <div className={styles.helperPrompt}>
              <span>
                Need help calculating the correct weight based on the mold?
              </span>
              <button
                type="button"
                className={styles.helperCta}
                onClick={() => setShowMoldHelper(true)}
              >
                Try the mold helper tool
              </button>
            </div>
          </label>
        </div>
        <div className={styles.metricBar}>
          <div>
            <p>Total dough target</p>
            <strong>{formatNumber(totalDough, 0)} g</strong>
          </div>
          <div>
            <p>Total flour base</p>
            <strong>{formatNumber(flourBase, 0)} g</strong>
          </div>
          <div>
            <p>Suggested order</p>
            <div className={styles.chips}>
              {defaultStepOrder.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <MoldHelperModal
        open={showMoldHelper}
        selection={moldSelection}
        onSelectionChange={setMoldSelection}
        onApply={applyDoughPerPiece}
        onClose={() => setShowMoldHelper(false)}
      />

      <section className={styles.card}>
        <div className={styles.cardHeaderRow}>
          <div>
            <h2>Starters</h2>
            <p>
              Add one or more starter options (sourdough, yeast, lievitino).
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleAddStarter}
          >
            Add starter
          </button>
        </div>
        {starters.length === 0 ? (
          <p className={styles.emptyNote}>No starters yet.</p>
        ) : (
          <div className={styles.doughList}>
            {starters.map((starter, starterIndex) => (
              <div className={styles.doughBlock} key={starter.id}>
                <div className={styles.doughHeader}>
                  <label className={styles.field}>
                    <span>Starter name</span>
                    <input
                      value={starter.name}
                      onChange={(event) =>
                        handleStarterName(starter.id, event.target.value)
                      }
                      placeholder={`Starter ${starterIndex + 1}`}
                    />
                  </label>
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.doughRemove}`}
                    onClick={() => handleRemoveStarter(starter.id)}
                    aria-label="Remove starter"
                  >
                    ×
                  </button>
                </div>
                <label className={styles.field}>
                  <span>Starter description</span>
                  <textarea
                    value={starter.description ?? ""}
                    onChange={(event) =>
                      handleStarterDescription(starter.id, event.target.value)
                    }
                    placeholder="Describe the starter build, timings, and refresh schedule."
                    rows={3}
                  />
                </label>
                <div className={styles.ingredientsTable}>
                  <div
                    className={`${styles.tableHeader} ${
                      showBakers ? "" : styles.noPercent
                    }`}
                  >
                    <span>Ingredient</span>
                    <span>Group</span>
                    <span>Quantity</span>
                    <span>Unit</span>
                    {showBakers ? <span>%</span> : null}
                    <span>Total</span>
                    <span />
                  </div>
                  {starter.ingredients.map((ingredient) => {
                    const displayValue = formatNumber(
                      toUnit(ingredient.qty_g, ingredient.unit),
                      ingredient.unit === "g" || ingredient.unit === "qty"
                        ? 0
                        : 2
                    );
                    const totalValue = ingredient.qty_g * pieces;
                    const gramsPerPiece = ingredientGrams(ingredient);
                    const totalGrams =
                      gramsPerPiece !== null ? gramsPerPiece * pieces : null;
                    const bakersPct =
                      flourBase > 0 && gramsPerPiece !== null
                        ? (gramsPerPiece / flourBase) * 100
                        : null;
                    return (
                      <div
                        className={`${styles.tableRow} ${
                          showBakers ? "" : styles.noPercent
                        }`}
                        key={ingredient.id}
                      >
                        <div className={styles.cell} data-label="Ingredient">
                          <input
                            value={ingredient.name}
                            onChange={(event) =>
                              handleStarterUpdate(starter.id, ingredient.id, {
                                name: event.target.value,
                              })
                            }
                            placeholder="Ingredient"
                          />
                        </div>
                        <div className={styles.cell} data-label="Group">
                          <select
                            value={ingredient.group}
                            onChange={(event) =>
                              handleStarterUpdate(starter.id, ingredient.id, {
                                group: event.target.value as IngredientGroup,
                              })
                            }
                          >
                            {ingredientGroups.map((group) => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={styles.cell} data-label="Quantity">
                          <input
                            type="number"
                            value={displayValue}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              handleStarterUpdate(starter.id, ingredient.id, {
                                qty_g: Math.max(
                                  0,
                                  fromUnit(next, ingredient.unit)
                                ),
                              });
                            }}
                          />
                        </div>
                        <div className={styles.cell} data-label="Unit">
                          <div className={styles.unitStack}>
                            <select
                              value={ingredient.unit}
                              onChange={(event) =>
                                handleStarterUpdate(starter.id, ingredient.id, {
                                  unit: event.target
                                    .value as Ingredient["unit"],
                                })
                              }
                            >
                              {unitOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {ingredient.unit === "qty" ? (
                              <input
                                type="number"
                                min={0}
                                className={styles.unitWeight}
                                value={ingredient.qty_weight_g ?? ""}
                                onChange={(event) =>
                                  handleStarterUpdate(
                                    starter.id,
                                    ingredient.id,
                                    {
                                      qty_weight_g:
                                        event.target.value === ""
                                          ? undefined
                                          : Number(event.target.value),
                                    }
                                  )
                                }
                                placeholder="g per qty"
                              />
                            ) : null}
                          </div>
                        </div>
                        <div className={styles.cell} data-label="Stats">
                          <div className={styles.inlineStats}>
                            {showBakers ? (
                              <div className={styles.statRow}>
                                <span className={styles.statLabel}>
                                  Baker's %
                                </span>
                                <span className={styles.percentCell}>
                                  {bakersPct === null
                                    ? "—"
                                    : `${formatNumber(bakersPct, 1)}%`}
                                </span>
                              </div>
                            ) : null}
                            <div className={styles.statRow}>
                              <span className={styles.statLabel}>Total</span>
                              <span className={styles.totalCell}>
                                {formatNumber(
                                  toUnit(totalValue, ingredient.unit),
                                  ingredient.unit === "g" ||
                                    ingredient.unit === "qty"
                                    ? 0
                                    : 2
                                )}
                                <em>{ingredient.unit}</em>
                                {ingredient.unit === "qty" &&
                                totalGrams !== null ? (
                                  <span className={styles.totalNote}>
                                    ≈ {formatNumber(totalGrams, 0)} g
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`${styles.cell} ${styles.cellAction}`}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() =>
                              handleRemoveStarterIngredient(
                                starter.id,
                                ingredient.id
                              )
                            }
                            aria-label="Remove ingredient"
                          >
                            Remove ingredient
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.ingredientsFooter}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => handleAddStarterIngredient(starter.id)}
                  >
                    Add ingredient
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleAddStarter}
        >
          Add starter
        </button>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeaderRow}>
          <div>
            <h2>Ingredients (per piece)</h2>
          </div>
          <div className={styles.switchGroup}>
            <div className={styles.switchRow}>
              <span>Show baker's %</span>
              <button
                type="button"
                className={showBakers ? styles.switchOn : styles.switchOff}
                onClick={() => setShowBakers((prev) => !prev)}
              >
                <span />
              </button>
            </div>
            <div className={styles.switchRow}>
              <span>Multiple doughs</span>
              <button
                type="button"
                className={multipleDoughs ? styles.switchOn : styles.switchOff}
                onClick={handleToggleDoughMode}
              >
                <span />
              </button>
            </div>
          </div>
        </div>
        <div className={styles.doughList}>
          {doughs.map((dough, doughIndex) => (
            <div className={styles.doughBlock} key={dough.id}>
              <div className={styles.doughHeader}>
                <label className={styles.field}>
                  <span>Dough name</span>
                  <input
                    value={dough.name}
                    onChange={(event) =>
                      handleDoughName(dough.id, event.target.value)
                    }
                    placeholder={`Dough ${doughIndex + 1}`}
                  />
                </label>
                {multipleDoughs && doughs.length > 1 ? (
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.doughRemove}`}
                    onClick={() => handleRemoveDough(dough.id)}
                    aria-label="Remove dough"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className={styles.ingredientsTable}>
                <div
                  className={`${styles.tableHeader} ${
                    showBakers ? "" : styles.noPercent
                  }`}
                >
                  <span>Ingredient</span>
                  <span>Group</span>
                  <span>Quantity</span>
                  <span>Unit</span>
                  {showBakers ? <span>%</span> : null}
                  <span>Total</span>
                  <span />
                </div>
                {dough.ingredients.map((ingredient) => {
                  const displayValue = formatNumber(
                    toUnit(ingredient.qty_g, ingredient.unit),
                    ingredient.unit === "g" || ingredient.unit === "qty" ? 0 : 2
                  );
                  const totalValue = ingredient.qty_g * pieces;
                  const gramsPerPiece = ingredientGrams(ingredient);
                  const totalGrams =
                    gramsPerPiece !== null ? gramsPerPiece * pieces : null;
                  const bakersPct =
                    flourBase > 0 && gramsPerPiece !== null
                      ? (gramsPerPiece / flourBase) * 100
                      : null;
                  return (
                    <div
                      className={`${styles.tableRow} ${
                        showBakers ? "" : styles.noPercent
                      }`}
                      key={ingredient.id}
                    >
                      <div className={styles.cell} data-label="Ingredient">
                        <input
                          value={ingredient.name}
                          onChange={(event) =>
                            handleIngredientUpdate(dough.id, ingredient.id, {
                              name: event.target.value,
                            })
                          }
                          placeholder="Ingredient"
                        />
                      </div>
                      <div className={styles.cell} data-label="Group">
                        <select
                          value={ingredient.group}
                          onChange={(event) =>
                            handleIngredientUpdate(dough.id, ingredient.id, {
                              group: event.target.value as IngredientGroup,
                            })
                          }
                        >
                          {ingredientGroups.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.cell} data-label="Quantity">
                        <input
                          type="number"
                          value={displayValue}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            handleIngredientUpdate(dough.id, ingredient.id, {
                              qty_g: Math.max(
                                0,
                                fromUnit(next, ingredient.unit)
                              ),
                            });
                          }}
                        />
                      </div>
                      <div className={styles.cell} data-label="Unit">
                        <div className={styles.unitStack}>
                          <select
                            value={ingredient.unit}
                            onChange={(event) =>
                              handleIngredientUpdate(dough.id, ingredient.id, {
                                unit: event.target.value as Ingredient["unit"],
                              })
                            }
                          >
                            {unitOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {ingredient.unit === "qty" ? (
                            <input
                              type="number"
                              min={0}
                              className={styles.unitWeight}
                              value={ingredient.qty_weight_g ?? ""}
                              onChange={(event) =>
                                handleIngredientUpdate(
                                  dough.id,
                                  ingredient.id,
                                  {
                                    qty_weight_g:
                                      event.target.value === ""
                                        ? undefined
                                        : Number(event.target.value),
                                  }
                                )
                              }
                              placeholder="g per qty"
                            />
                          ) : null}
                        </div>
                      </div>
                      <div className={styles.cell} data-label="Stats">
                        <div className={styles.inlineStats}>
                          {showBakers ? (
                            <div className={styles.statRow}>
                              <span className={styles.statLabel}>
                                Baker's %
                              </span>
                              <span className={styles.percentCell}>
                                {bakersPct === null
                                  ? "—"
                                  : `${formatNumber(bakersPct, 1)}%`}
                              </span>
                            </div>
                          ) : null}
                          <div className={styles.statRow}>
                            <span className={styles.statLabel}>Total</span>
                            <span className={styles.totalCell}>
                              {formatNumber(
                                toUnit(totalValue, ingredient.unit),
                                ingredient.unit === "g" ||
                                  ingredient.unit === "qty"
                                  ? 0
                                  : 2
                              )}
                              <em>{ingredient.unit}</em>
                              {ingredient.unit === "qty" &&
                              totalGrams !== null ? (
                                <span className={styles.totalNote}>
                                  ≈ {formatNumber(totalGrams, 0)} g
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={`${styles.cell} ${styles.cellAction}`}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() =>
                            handleRemoveIngredient(dough.id, ingredient.id)
                          }
                          aria-label="Remove ingredient"
                        >
                          Remove ingredient
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.ingredientsFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleAddIngredient(dough.id)}
                >
                  Add ingredient
                </button>
              </div>
            </div>
          ))}
        </div>
        {multipleDoughs ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleAddDough}
          >
            Add dough
          </button>
        ) : null}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Total ingredients</h2>
          <p>Recap across starters and doughs, scaled by pieces.</p>
        </div>
        <div className={styles.recapTable}>
          <div className={styles.recapHeader}>
            <span>Ingredient</span>
            <span>Total (g)</span>
            <span>Total (unit)</span>
          </div>
          {ingredientTotals.length === 0 ? (
            <p className={styles.recapEmpty}>Add ingredients to see totals.</p>
          ) : (
            ingredientTotals.map((item) => {
              const unit =
                item.units.size === 1 ? Array.from(item.units)[0] : "g";
              const isQty = unit === "qty";
              const totalGrams =
                item.total_g !== null && Number.isFinite(item.total_g)
                  ? item.total_g
                  : null;
              return (
                <div className={styles.recapRow} key={item.name}>
                  <span>{item.name}</span>
                  <span>
                    {totalGrams === null ? "—" : formatNumber(totalGrams, 0)}
                  </span>
                  <span>
                    {isQty
                      ? `${formatNumber(item.total_qty, 0)} ${unit}`
                      : `${formatNumber(
                          toUnit(totalGrams ?? 0, unit),
                          unit === "g" ? 0 : 2
                        )} ${unit}`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Procedure builder</h2>
          <p>Drag the flow by order and detail timings or temps per step.</p>
        </div>
        <div className={styles.stepsList}>
          {steps.map((step, index) => (
            <div className={styles.stepCard} key={step.id}>
              <div className={styles.stepHeader}>
                <span>Step {index + 1}</span>
                <div>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => handleMoveStep(step.id, "up")}
                    aria-label="Move step up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => handleMoveStep(step.id, "down")}
                    aria-label="Move step down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => handleRemoveStep(step.id)}
                    aria-label="Remove step"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={styles.gridTwo}>
                <label className={styles.field}>
                  <span>Action</span>
                  <input
                    value={step.title}
                    onChange={(event) =>
                      handleStepUpdate(step.id, { title: event.target.value })
                    }
                    placeholder="Mix first dough"
                  />
                </label>
                <label className={styles.field}>
                  <span>Phase</span>
                  <input
                    value={step.phase ?? ""}
                    onChange={(event) =>
                      handleStepUpdate(step.id, { phase: event.target.value })
                    }
                    placeholder="First dough"
                  />
                </label>
                <label className={styles.field}>
                  <span>Duration (min)</span>
                  <input
                    type="number"
                    min={0}
                    value={step.duration_min ?? ""}
                    onChange={(event) =>
                      handleStepUpdate(step.id, {
                        duration_min:
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Temperature (C)</span>
                  <input
                    type="number"
                    min={0}
                    value={step.temp_c ?? ""}
                    onChange={(event) =>
                      handleStepUpdate(step.id, {
                        temp_c:
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span>Notes</span>
                <textarea
                  value={step.notes ?? ""}
                  onChange={(event) =>
                    handleStepUpdate(step.id, { notes: event.target.value })
                  }
                  placeholder="Add proofing notes, dough temp, or rest cues."
                  rows={8}
                />
              </label>
              <div className={styles.stepIngredients}>
                <span>Ingredients used</span>
                <div className={styles.checkboxGrid}>
                  {allIngredients
                    .filter((ingredient) => ingredient.name.trim())
                    .map((ingredient) => (
                      <label key={ingredient.id} className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={
                            step.ingredient_ids?.includes(ingredient.id) ??
                            false
                          }
                          onChange={(event) => {
                            const current = step.ingredient_ids ?? [];
                            const next = event.target.checked
                              ? [...current, ingredient.id]
                              : current.filter(
                                  (item) => item !== ingredient.id
                                );
                            handleStepUpdate(step.id, { ingredient_ids: next });
                          }}
                        />
                        <span>{ingredient.name}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setSteps((items) => [...items, createStep()])}
        >
          Add step
        </button>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.ghostButton} href="/">
          Cancel
        </Link>
        <button className={styles.primaryButton} type="submit">
          {mode === "new" ? "Save recipe" : "Update recipe"}
        </button>
      </footer>
      <button className={styles.mobileStickySave} type="submit">
        {mode === "new" ? "Save recipe" : "Update recipe"}
      </button>
    </form>
  );
}
