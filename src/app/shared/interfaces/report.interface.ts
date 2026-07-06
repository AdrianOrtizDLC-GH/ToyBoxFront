import { DateString, User, UserSummary } from './user.interface';
import { ReportStatus } from '../enums/report-status.enum';
import { ModerationDecision } from '../enums/moderation-decision.enum';
import { Item } from './item.interface';

/**
 * Models a report filed against a product listing, backing
 * ReportsService's moderation workflow. `resolution_date` is null while
 * the report is still pending.
 */
export interface Report {
  id_reports: number;
  reason: string;
  status: ReportStatus;
  report_date: DateString;
  resolution_date: DateString | null;
  fk_items_id: number;
  fk_user_reported: number;
  fk_user_reports_received: number;
  fk_moderator_id: number;

  // Optional relations, populated depending on the endpoint/join used.
  item?: Item;
  reportedUser?: UserSummary;
  moderator?: UserSummary;
}

/**
 * Flattened view model of a Report for list rendering
 * (e.g. moderator reports-list page).
 */
export interface ReportItem {
  id_reports: number;
  itemTitle: string;
  reporter: string;
  reportedUser: string;
  reason: string;
  status: ReportStatus;
  date: DateString;
}

/**
 * Full detail view model of a Report, used on the moderator report-detail
 * page. Requires the item and both involved users' full profiles.
 */
export interface ReportDetail extends Report {
  item: Item;
  reporterUser: User;
  reportedUserDetails: User;
}

// Payload used to file a new report against a product.
export interface ReportFormData {
  reason: string;
  fk_items_id: number;
  fk_user_reported: number;
}

/**
 * Models a moderator's resolution action taken on a report (approve/withdraw),
 * recording the decision and whether a notification was sent to the affected user.
 */
export interface ModerationAction {
  id_action: number;
  decision: ModerationDecision;
  notification_sent: boolean;
  action_date: DateString;
  fk_moderator_id: number;
  fk_reports_id: number;

  // Optional relations, populated depending on the endpoint/join used.
  moderator?: UserSummary;
  report?: Report;
}
