"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { findRecipeByIdentifier, loadRecipes } from "@lib/storage";
import type { Ingredient, Recipe } from "@lib/types";
import { formatNumber, toUnit } from "@lib/units";
import MoldHelperModal from "@components/MoldHelperModal";
import { normalizeMoldSelection } from "@lib/moldHelpers";
import styles from "./page.module.scss";

function ingredientGrams(
  ingredient: Ingredient,
  qtyValue: number
): number | null {
  if (ingredient.unit === "qty") {
    if (!ingredient.qty_weight_g || ingredient.qty_weight_g <= 0) return null;
    return qtyValue * ingredient.qty_weight_g;
  }
  return qtyValue;
}

function buildTotals(
  recipe: Recipe,
  pieces: number,
  scaleFactor: number,
  starterIngredients: Ingredient[]
) {
  const items = [
    ...(recipe.doughs && recipe.doughs.length
      ? recipe.doughs.flatMap((dough) => dough.ingredients)
      : recipe.ingredients ?? []),
    ...starterIngredients,
  ];
  const map = new Map<
    string,
    { name: string; total_g: number | null; total_qty: number; unit: string }
  >();
  items.forEach((ingredient) => {
    const name = ingredient.name.trim();
    if (!name) return;
    const key = name.toLowerCase();
    const scaledQty = ingredient.qty_g * scaleFactor;
    const grams = ingredientGrams(ingredient, scaledQty);
    const qtyTotal = ingredient.unit === "qty" ? scaledQty * pieces : 0;
    const entry = map.get(key);
    if (entry) {
      if (grams !== null) {
        entry.total_g = (entry.total_g ?? 0) + grams * pieces;
      }
      entry.total_qty += qtyTotal;
    } else {
      map.set(key, {
        name,
        total_g: grams !== null ? grams * pieces : null,
        total_qty: qtyTotal,
        unit: ingredient.unit,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function ViewRecipePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [viewPieces, setViewPieces] = useState(1);
  const [viewWeight, setViewWeight] = useState(1000);
  const [showMoldHelper, setShowMoldHelper] = useState(false);
  const [moldSelection, setMoldSelection] =
    useState<Recipe["mold_selection"]>();
  const [selectedStarterId, setSelectedStarterId] = useState<string>("");

  useEffect(() => {
    setRecipes(loadRecipes());
  }, []);

  useEffect(() => {
    const key = searchParams.get("recipe");
    if (!key) {
      setActiveRecipe(null);
      return;
    }
    const found = findRecipeByIdentifier(key);
    setActiveRecipe(found);
    if (found) {
      setViewPieces(found.pieces);
      setViewWeight(found.dough_per_piece_g);
      setMoldSelection(normalizeMoldSelection(found.mold_selection));
      setSelectedStarterId(found.starters?.[0]?.id ?? "");
    }
  }, [searchParams]);

  const scaleFactor = useMemo(() => {
    if (!activeRecipe) return 1;
    const base = activeRecipe.dough_per_piece_g || 1;
    return viewWeight > 0 ? viewWeight / base : 1;
  }, [activeRecipe, viewWeight]);

  const sortedRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes]
  );

  const totals = useMemo(() => {
    if (!activeRecipe) return [];
    const starterIngredients =
      activeRecipe.starters?.find((starter) => starter.id === selectedStarterId)
        ?.ingredients ?? [];
    return buildTotals(
      activeRecipe,
      viewPieces,
      scaleFactor,
      starterIngredients
    );
  }, [activeRecipe, viewPieces, scaleFactor, selectedStarterId]);

  const selectedStarter = useMemo(() => {
    if (!activeRecipe || !selectedStarterId) return null;
    return (
      activeRecipe.starters?.find(
        (starter) => starter.id === selectedStarterId
      ) ?? null
    );
  }, [activeRecipe, selectedStarterId]);

  const ingredientLookup = useMemo(() => {
    const items =
      activeRecipe?.doughs && activeRecipe.doughs.length
        ? activeRecipe.doughs.flatMap((dough) => dough.ingredients)
        : activeRecipe?.ingredients ?? [];
    const starterItems = selectedStarter?.ingredients ?? [];
    return new Map(
      [...items, ...starterItems].map((item) => [item.id, item.name])
    );
  }, [activeRecipe, selectedStarter]);

  const handleSelect = (recipe: Recipe) => {
    router.push(
      `/view?recipe=${encodeURIComponent(recipe.slug || recipe.name)}`
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Recipe view</p>
          <h1>Review the recipe and prep your shopping list.</h1>
        </div>
      </header>

      {/* <section className={styles.listSection}>
        <h2>Recipe list</h2>
        {sortedRecipes.length === 0 ? (
          <p className={styles.empty}>No recipes yet. Create one first.</p>
        ) : (
          <div className={styles.list}>
            {sortedRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                className={styles.listItem}
                onClick={() => handleSelect(recipe)}
              >
                <span>{recipe.name}</span>
                <em>{recipe.category}</em>
              </button>
            ))}
          </div>
        )}
      </section> */}

      {searchParams.get("recipe") && !activeRecipe ? (
        <div className={styles.notFound}>
          <p>Recipe not found. Pick another from the list.</p>
        </div>
      ) : null}

      {activeRecipe ? (
        <div className={styles.content}>
          <section className={styles.heroCard}>
            <div>
              <p className={styles.category}>{activeRecipe.category}</p>
              <h2>{activeRecipe.name}</h2>
              <p className={styles.meta}>
                Base recipe: {activeRecipe.pieces} pieces ·{" "}
                {activeRecipe.dough_per_piece_g} g per piece
              </p>
            </div>
            <div className={styles.stats}>
              <div>
                <span>Total dough</span>
                <strong>{viewPieces * viewWeight} g</strong>
              </div>
              <div>
                <span>Steps</span>
                <strong>{activeRecipe.steps.length}</strong>
              </div>
            </div>
          </section>
          <section className={styles.scaleCard}>
            <div>
              <h3>Scale recipe and choose starter</h3>
              <p>
                Adjust pieces or dough weight, choose your starter and the
                totals update live.
              </p>
            </div>
            <div className={styles.scaleControls}>
              <div className={styles.scaleInputs}>
                {activeRecipe.starters && activeRecipe.starters.length > 0 ? (
                  <label>
                    <span>Starter</span>
                    <select
                      value={selectedStarterId}
                      onChange={(event) =>
                        setSelectedStarterId(event.target.value)
                      }
                    >
                      <option value="">No starter</option>
                      {activeRecipe.starters.map((starter) => (
                        <option key={starter.id} value={starter.id}>
                          {starter.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label>
                  <span>Pieces</span>
                  <input
                    type="number"
                    min={1}
                    value={viewPieces}
                    onChange={(event) =>
                      setViewPieces(Number(event.target.value) || 1)
                    }
                  />
                </label>
                <label>
                  <span>Weight per piece (g)</span>
                  <input
                    type="number"
                    min={1}
                    value={viewWeight}
                    onChange={(event) =>
                      setViewWeight(Number(event.target.value) || 1)
                    }
                  />
                  <div className={styles.helperPrompt}>
                    <span>
                      Need help calculating the correct weight based on the
                      mold?
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
              <div className={styles.scaleNote}>
                <span>Scale factor</span>
                <strong>{formatNumber(scaleFactor, 2)}x</strong>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Total ingredients</h3>
              <p>Shopping list scaled for the full batch.</p>
            </div>
            <div className={styles.recap}>
              {totals.length === 0 ? (
                <p className={styles.empty}>Add ingredients to see totals.</p>
              ) : (
                totals.map((item) => {
                  const isQty = item.unit === "qty";
                  const totalGrams =
                    item.total_g !== null && Number.isFinite(item.total_g)
                      ? item.total_g
                      : null;
                  const unitDisplay = isQty
                    ? `${formatNumber(item.total_qty, 0)} (${formatNumber(
                        totalGrams ?? 0,
                        0
                      )} g)`
                    : item.unit === "g"
                    ? `${formatNumber(totalGrams ?? 0, 0)} g`
                    : `${formatNumber(
                        toUnit(
                          totalGrams ?? 0,
                          item.unit as Ingredient["unit"]
                        ),
                        2
                      )} ${item.unit}`;
                  return (
                    <div className={styles.recapRow} key={item.name}>
                      <span>{item.name}</span>
                      <span>
                        {totalGrams === null && !isQty ? "—" : unitDisplay}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Ingredients by dough</h3>
              <p>Each dough phase with scaled totals.</p>
            </div>
            <div className={styles.doughs}>
              {selectedStarter ? (
                <div className={styles.doughCard}>
                  <h4>Starter: {selectedStarter.name}</h4>
                  {selectedStarter.description ? (
                    <p className={styles.starterDescription}>
                      {selectedStarter.description}
                    </p>
                  ) : null}
                  <div className={styles.doughList}>
                    {selectedStarter.ingredients.map((ingredient) => {
                      const scaledQty = ingredient.qty_g * scaleFactor;
                      const totalValue = scaledQty * viewPieces;
                      const grams = ingredientGrams(ingredient, scaledQty);
                      const totalGrams =
                        grams !== null ? grams * viewPieces : null;
                      const isQty = ingredient.unit === "qty";
                      const displayValue = isQty
                        ? `${formatNumber(totalValue, 0)} (${formatNumber(
                            totalGrams ?? 0,
                            0
                          )} g)`
                        : `${formatNumber(
                            toUnit(totalValue, ingredient.unit),
                            ingredient.unit === "g" ? 0 : 2
                          )} ${ingredient.unit}`;
                      return (
                        <div className={styles.doughRow} key={ingredient.id}>
                          <span>{ingredient.name}</span>
                          <span className={styles.valueRight}>
                            {displayValue}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {(activeRecipe.doughs?.length
                ? activeRecipe.doughs
                : [
                    {
                      id: `dough-${activeRecipe.id}`,
                      name: "Main dough",
                      ingredients: activeRecipe.ingredients ?? [],
                    },
                  ]
              ).map((dough) => (
                <div className={styles.doughCard} key={dough.id}>
                  <h4>{dough.name}</h4>
                  <div className={styles.doughList}>
                    {dough.ingredients.map((ingredient) => {
                      const scaledQty = ingredient.qty_g * scaleFactor;
                      const totalValue = scaledQty * viewPieces;
                      const grams = ingredientGrams(ingredient, scaledQty);
                      const totalGrams =
                        grams !== null ? grams * viewPieces : null;
                      const isQty = ingredient.unit === "qty";
                      const displayValue = isQty
                        ? `${formatNumber(totalValue, 0)} (${formatNumber(
                            totalGrams ?? 0,
                            0
                          )} g)`
                        : `${formatNumber(
                            toUnit(totalValue, ingredient.unit),
                            ingredient.unit === "g" ? 0 : 2
                          )} ${ingredient.unit}`;
                      return (
                        <div className={styles.doughRow} key={ingredient.id}>
                          <span>{ingredient.name}</span>
                          <span className={styles.valueRight}>
                            {displayValue}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Procedure</h3>
              <p>Step-by-step flow with phases and ingredient references.</p>
            </div>
            <div className={styles.steps}>
              {activeRecipe.steps.length === 0 ? (
                <p className={styles.empty}>No steps yet.</p>
              ) : (
                activeRecipe.steps.map((step, index) => (
                  <div className={styles.stepCard} key={step.id}>
                    <div className={styles.stepHeader}>
                      <span>Step {index + 1}</span>
                      {step.phase ? <em>{step.phase}</em> : null}
                    </div>
                    <h4>{step.title}</h4>
                    {step.notes ? <p>{step.notes}</p> : null}
                    {step.ingredient_ids && step.ingredient_ids.length > 0 ? (
                      <div className={styles.stepIngredients}>
                        <span>Ingredients:</span>
                        <div>
                          {step.ingredient_ids
                            .map((id) => ingredientLookup.get(id))
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
      {activeRecipe ? (
        <button
          type="button"
          className={styles.mobileStickyEdit}
          onClick={() =>
            router.push(
              `/edit?recipe=${encodeURIComponent(
                activeRecipe.slug || activeRecipe.name
              )}`
            )
          }
        >
          Edit recipe
        </button>
      ) : null}
      <MoldHelperModal
        open={showMoldHelper}
        selection={moldSelection}
        onSelectionChange={setMoldSelection}
        onApply={(weight) => setViewWeight(weight)}
        onClose={() => setShowMoldHelper(false)}
      />
    </div>
  );
}
