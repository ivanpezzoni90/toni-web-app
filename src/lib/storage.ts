import { slugify } from "./slug";
import type { Recipe } from "./types";

const STORAGE_KEY = "toni-pastry-recipes";

export function loadRecipes(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Recipe[];
    if (!Array.isArray(parsed)) return [];
    let changed = false;
    const normalized = parsed.map((recipe) => {
      const next = { ...recipe };
      if (!next.slug) {
        next.slug = slugify(next.name ?? "");
        changed = true;
      }
      if (!next.doughs || next.doughs.length === 0) {
        next.doughs = [
          {
            id: `dough-${next.id}`,
            name: "Main dough",
            ingredients: next.ingredients ?? [],
          },
        ];
        changed = true;
      }
      if (!next.starters || !Array.isArray(next.starters)) {
        next.starters = [];
        changed = true;
      }
      next.starters = next.starters.map((starter) => ({
        ...starter,
        description: starter.description ?? "",
      }));
      if (!Array.isArray(next.ingredients)) {
        next.ingredients = [];
        changed = true;
      }
      return next;
    });
    if (changed) {
      saveRecipes(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

export function saveRecipes(recipes: Recipe[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function upsertRecipe(recipe: Recipe): Recipe[] {
  const recipes = loadRecipes();
  const index = recipes.findIndex((item) => item.id === recipe.id);
  if (index >= 0) {
    recipes[index] = recipe;
  } else {
    recipes.unshift(recipe);
  }
  saveRecipes(recipes);
  return recipes;
}

export function deleteRecipeById(id: string): Recipe[] {
  const recipes = loadRecipes().filter((item) => item.id !== id);
  saveRecipes(recipes);
  return recipes;
}

export function findRecipeBySlug(slug: string): Recipe | null {
  return loadRecipes().find((item) => item.slug === slug) ?? null;
}

export function findRecipeByIdentifier(identifier: string): Recipe | null {
  if (!identifier) return null;
  const safeIdentifier = String(identifier);
  const decoded = decodeURIComponent(safeIdentifier).toLowerCase();
  const normalized = safeIdentifier.toLowerCase();
  return (
    loadRecipes().find((item) => {
      const slug = (item.slug ?? "").toLowerCase();
      const name = (item.name ?? "").toLowerCase();
      return (
        slug === normalized ||
        slug === decoded ||
        name === decoded ||
        slugify(name) === normalized
      );
    }) ?? null
  );
}
