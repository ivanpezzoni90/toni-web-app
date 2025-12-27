export type MoldPreset = {
  product_type: string;
  mold_rating: string;
  height_cm: number | null;
  diameter_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  suggested_dough_weight_min_g: number;
  suggested_dough_weight_max_g: number;
  notes: string;
};

export type IngredientGroup =
  | "Flour"
  | "Starter"
  | "Liquid"
  | "Eggs"
  | "Fat"
  | "Sugar"
  | "Salt"
  | "Aromatic"
  | "Other";

export type IngredientUnit = "g" | "oz" | "lb" | "cup" | "qty";

export type Ingredient = {
  id: string;
  name: string;
  qty_g: number;
  unit: IngredientUnit;
  group: IngredientGroup;
  qty_weight_g?: number;
  notes?: string;
};

export type Dough = {
  id: string;
  name: string;
  ingredients: Ingredient[];
};

export type Starter = {
  id: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
};

export type RecipeStep = {
  id: string;
  title: string;
  phase?: string;
  duration_min?: number;
  temp_c?: number;
  notes?: string;
  ingredient_ids?: string[];
};

export type Recipe = {
  id: string;
  name: string;
  slug: string;
  category:
    | "Panettone"
    | "Pandoro"
    | "Panettone Gastronomico"
    | "Colomba"
    | "Other";
  pieces: number;
  dough_per_piece_g: number;
  ingredients: Ingredient[];
  doughs: Dough[];
  starters: Starter[];
  steps: RecipeStep[];
  mold_selection?: {
    product_type: string;
    mold_rating: string;
  };
  created_at: string;
  updated_at: string;
};
