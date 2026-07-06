/**
 * Models a product category (e.g. "Toys", "Books"), used to classify
 * items in the catalog and by the categories management admin page.
 */
export interface Category {
  id_categories: number;
  name: string;
  description: string | null;
  icon?: string; // Optional icon identifier/URL for display.
}
