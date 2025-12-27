"use client";

import { useRouter } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import type { Recipe } from "@/lib/types";
import { upsertRecipe } from "@/lib/storage";
import styles from "./page.module.css";

export default function NewRecipePage() {
  const router = useRouter();

  const handleSave = (recipe: Recipe) => {
    upsertRecipe(recipe);
    router.push(
      `/edit?recipe=${encodeURIComponent(recipe.slug || recipe.name)}`
    );
  };

  return (
    <div className={styles.page}>
      <RecipeForm mode="new" onSave={handleSave} />
    </div>
  );
}
