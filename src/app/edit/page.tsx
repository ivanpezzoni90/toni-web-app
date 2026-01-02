"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RecipeForm from "@components/RecipeForm";
import {
  findRecipeByIdentifier,
  loadRecipes,
  upsertRecipe,
} from "@lib/storage";
import type { Recipe } from "@lib/types";
import styles from "./page.module.scss";

function EditRecipeContent() {
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

export default function EditIndexPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <EditRecipeContent />
    </Suspense>
  );
}
