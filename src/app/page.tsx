"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Recipe } from "@/lib/types";
import { deleteRecipeById, loadRecipes } from "@/lib/storage";
import styles from "./page.module.css";

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    setRecipes(loadRecipes());
  }, []);

  const stats = useMemo(() => {
    const total = recipes.length;
    const categories = recipes.reduce<Record<string, number>>((acc, recipe) => {
      acc[recipe.category] = (acc[recipe.category] ?? 0) + 1;
      return acc;
    }, {});
    return { total, categories };
  }, [recipes]);

  const handleDelete = (recipe: Recipe) => {
    const ok = window.confirm(`Delete ${recipe.name}?`);
    if (!ok) return;
    setRecipes(deleteRecipeById(recipe.id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <div className={styles.brand}>
            <div className={styles.logoWrap}>
              <img src="/toni-logo.svg" alt="Toni logo" />
            </div>
            <p className={styles.eyebrow}>Toni</p>
            <div />
          </div>
          <h1>Panettone and Pandoro recipe vault.</h1>
          <p>
            Build precise doughs, scale by pieces, and lean on mold guidance for
            flawless festive bakes.
          </p>
        </div>
        <div className={styles.heroCard}>
          <h3>Recipe stats</h3>
          <div className={styles.statsGrid}>
            <div>
              <span>Total recipes</span>
              <strong>{stats.total}</strong>
            </div>
            <div>
              <span>Panettone + Pandoro</span>
              <strong>
                {(stats.categories["Panettone"] ?? 0) +
                  (stats.categories["Pandoro"] ?? 0)}
              </strong>
            </div>
          </div>
          <Link className={styles.primaryButton} href="/new">
            New recipe
          </Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Your recipes</h2>
          <Link className={styles.secondaryButton} href="/new">
            Create new
          </Link>
        </div>
        {recipes.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No recipes yet</h3>
            <p>Start with a base dough, then build your procedure step by step.</p>
            <Link className={styles.primaryButton} href="/new">
              Create your first recipe
            </Link>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {recipes.map((recipe) => (
              <article key={recipe.id} className={styles.recipeCard}>
                <div>
                  <p className={styles.cardCategory}>{recipe.category}</p>
                  <h3>{recipe.name}</h3>
                  <p className={styles.cardMeta}>
                    {recipe.pieces} pieces · {recipe.dough_per_piece_g} g per piece
                  </p>
                </div>
                <div className={styles.cardActions}>
                  <Link
                    className={styles.ghostButton}
                    href={`/edit?recipe=${encodeURIComponent(
                      recipe.slug || recipe.name
                    )}`}
                  >
                    Edit
                  </Link>
                  <Link
                    className={styles.secondaryButton}
                    href={`/view?recipe=${encodeURIComponent(
                      recipe.slug || recipe.name
                    )}`}
                  >
                    View
                  </Link>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => handleDelete(recipe)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <Link className={styles.mobileStickyCreate} href="/new">
        New recipe
      </Link>
    </div>
  );
}
