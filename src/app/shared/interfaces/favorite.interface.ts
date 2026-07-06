import { Item } from './item.interface';
import { DateString, UserSummary } from './user.interface';

/**
 * Models a user's bookmark of a product listing ("favorite"), linking a
 * user to an item. Optional relations are populated depending on the
 * endpoint used (FavoritesService).
 */
export interface Favorite {
  id_favorite: number;
  saved_date: DateString;
  fk_users_id: number;
  fk_items_id: number;

  // Optional relations, populated when the API includes joined data.
  item?: Item;
  user?: UserSummary;
}
