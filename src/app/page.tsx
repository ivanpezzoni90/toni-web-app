"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Recipe } from "@lib/types";
import { deleteRecipeById, loadRecipes } from "@lib/storage";
import styles from "./page.module.scss";
import { mergeClassNames } from "@/lib/helpers";

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const [activeCategories, setActiveCategories] = useState<
    Array<"Panettone" | "Pandoro" | "Gastronomico" | "Colomba">
  >([]);
  const [sortOrder, setSortOrder] = useState<"New" | "Old" | "Last edit">(
    "New"
  );
  const recipeHeaderSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecipes(loadRecipes());
  }, []);

  useEffect(() => {
    const sentinel = recipeHeaderSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderSticky(!entry.isIntersecting);
      },
      { threshold: 1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const stats = useMemo(() => {
    const total = recipes.length;
    const categories = recipes.reduce<Record<string, number>>((acc, recipe) => {
      acc[recipe.category] = (acc[recipe.category] ?? 0) + 1;
      return acc;
    }, {});
    return { total, categories };
  }, [recipes]);

  const visibleRecipes = useMemo(() => {
    const filtered =
      activeCategories.length === 0
        ? recipes
        : recipes.filter((recipe) => {
            return activeCategories.some((category) => {
              if (category === "Gastronomico") {
                return recipe.category === "Panettone Gastronomico";
              }
              return recipe.category === category;
            });
          });

    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === "Old") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      if (sortOrder === "Last edit") {
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return sorted;
  }, [activeCategories, recipes, sortOrder]);

  const toggleCategory = (
    category: "Panettone" | "Pandoro" | "Gastronomico" | "Colomba"
  ) => {
    setActiveCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  const handleDelete = (recipe: Recipe) => {
    const ok = window.confirm(`Delete ${recipe.name}?`);
    if (!ok) return;
    setRecipes(deleteRecipeById(recipe.id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoWrap}>
            <img src="/toni-logo-alt.svg" alt="Toni logo" />
          </div>
          <p className={styles.eyebrow}>Toni</p>
          <div />
        </div>
      </header>

      <section className={styles.body}>
        <section className={styles.title}>
          <div>
            <h1>Recipes for Panettone, Pandoro & Lievitati</h1>
            <p>
              Build formulas, track steps, and keep your festive bakes
              consistent.
            </p>
          </div>
        </section>

        <section className={styles.recipeList}>
          <div ref={recipeHeaderSentinelRef} aria-hidden="true" />
          <div
            className={`${styles.recipeListHeader} ${
              isHeaderSticky ? styles.recipeListHeaderSticky : ""
            }`}
          >
            <div
              className={mergeClassNames(
                styles.filtersGroup,
                styles.filtersFilters
              )}
            >
              <p className={styles.filtersLabel}>Filters</p>
              <div className={styles.filterButtons}>
                {(
                  ["Panettone", "Pandoro", "Gastronomico", "Colomba"] as const
                ).map((category) => (
                  <button
                    key={category}
                    className={`${styles.filterButton} ${
                      activeCategories.includes(category)
                        ? styles.filterActive
                        : ""
                    }`}
                    type="button"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div
              className={mergeClassNames(
                styles.filtersGroup,
                styles.filtersOrder
              )}
            >
              <p className={styles.filtersLabel}>Order</p>
              <div className={styles.filterButtons}>
                {(["New", "Old", "Last edit"] as const).map((order) => (
                  <button
                    key={order}
                    className={`${styles.filterButton} ${
                      sortOrder === order ? styles.filterActive : ""
                    }`}
                    type="button"
                    onClick={() => setSortOrder(order)}
                  >
                    {order}
                  </button>
                ))}
              </div>
            </div>
            <Link
              className={mergeClassNames(
                styles.secondaryButton,
                styles.createRecipeButton
              )}
              href="/new"
            >
              Create new
            </Link>
          </div>
          {visibleRecipes.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No recipes yet</h3>
              <p>
                Start with a base dough, then build your procedure step by step.
              </p>
              <Link className={styles.primaryButton} href="/new">
                Create your first recipe
              </Link>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {visibleRecipes.map((recipe) => (
                <article key={recipe.id} className={styles.recipeCard}>
                  <div>
                    <p className={styles.cardCategory}>{recipe.category}</p>
                    <h3>{recipe.name}</h3>
                    <p className={styles.cardMeta}>
                      {recipe.pieces} pieces · {recipe.dough_per_piece_g} g per
                      piece
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
      </section>

      <Link className={styles.mobileStickyCreate} href="/new">
        New recipe
      </Link>
    </div>
  );
}
