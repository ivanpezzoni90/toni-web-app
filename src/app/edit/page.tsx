"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import {
  findRecipeByIdentifier,
  loadRecipes,
  upsertRecipe,
} from "@/lib/storage";
import type { Recipe } from "@/lib/types";
import styles from "./page.module.css";

export default function EditIndexPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    setRecipes(loadRecipes());
  }, []);

  useEffect(() => {
    const key = searchParams.get("recipe");
    if (!key) {
      setActiveRecipe(null);
      return;
    }
    setActiveRecipe(findRecipeByIdentifier(key));
  }, [searchParams]);

  const sortedRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes]
  );

  const handleSelect = (recipe: Recipe) => {
    router.push(
      `/edit?recipe=${encodeURIComponent(recipe.slug || recipe.name)}`
    );
  };

  const handleSave = (recipe: Recipe) => {
    const updated = upsertRecipe(recipe);
    setRecipes(updated);
    router.replace(
      `/edit?recipe=${encodeURIComponent(recipe.slug || recipe.name)}`
    );
  };

  return (
    <div className={styles.page}>
      {/* <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Edit recipes</p>
          <h1>Pick a recipe to refine.</h1>
          <p>Use the list to select a recipe, then edit in place.</p>
        </div>
      </header> */}

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
        <RecipeForm
          mode="edit"
          initialRecipe={activeRecipe}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
