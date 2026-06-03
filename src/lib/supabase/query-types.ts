/**
 * Typed shapes for Supabase join queries.
 *
 * Supabase JS v2 cannot infer nested-select types automatically, so we define
 * them here. Each type mirrors the exact columns declared in the matching
 * .select() call, making accidental field access a compile error instead of
 * a silent undefined at runtime.
 */
import type { Database } from './database.types';

type T = Database['public']['Tables'];

type ActivityRow = T['activities']['Row'];
type LocationRow = T['locations']['Row'];
type ActivityTypeRow = T['activity_types']['Row'];
type ActivityParticipantRow = T['activity_participants']['Row'];
type ActivityPhotoRow = T['activity_photos']['Row'];
type SignatureRow = T['signatures']['Row'];
type ProfileRow = T['profiles']['Row'];

/** Activity with all relations — used in detail page and single-activity PDF. */
export type ActivityWithRelations = ActivityRow & {
  locations: Pick<LocationRow, 'name' | 'kind'> | null;
  activity_types: Pick<ActivityTypeRow, 'label_pt' | 'label_en' | 'label_es'> | null;
  activity_participants: Pick<ActivityParticipantRow, 'name' | 'role'>[];
  activity_photos: Pick<ActivityPhotoRow, 'id' | 'storage_path' | 'caption'>[];
  signatures: SignatureRow[];
  supervisor?: Pick<ProfileRow, 'full_name'> | null;
  client?: Pick<ProfileRow, 'full_name'> | null;
};

/** Activity list item for the /atividades page. */
export type ActivityListItem = Pick<
  ActivityRow,
  'id' | 'description' | 'status' | 'started_at' | 'supervisor_id'
> & {
  locations: Pick<LocationRow, 'name' | 'kind'> | null;
  activity_types: Pick<ActivityTypeRow, 'label_pt' | 'label_en' | 'label_es'> | null;
};

/** Activity shape used by the single-activity PDF route. */
export type ActivityForPdf = ActivityRow & {
  locations: Pick<LocationRow, 'name'> | null;
  activity_types: Pick<ActivityTypeRow, 'label_pt'> | null;
  activity_participants: Pick<ActivityParticipantRow, 'name' | 'role'>[];
  activity_photos: Pick<ActivityPhotoRow, 'id' | 'storage_path' | 'caption'>[];
  signatures: SignatureRow[];
};

/** Activity shape used inside the daily-report PDF (no photos — fetched separately). */
export type ActivityForDailyReportPdf = Pick<
  ActivityRow,
  'id' | 'description' | 'started_at' | 'notes'
> & {
  locations: (Pick<LocationRow, 'name'> & { sort_order?: number | null }) | null;
  activity_types: Pick<ActivityTypeRow, 'label_pt'> | null;
  activity_participants: Pick<ActivityParticipantRow, 'name' | 'role'>[];
};

/**
 * Activity shape for CSV and monthly-PDF exports.
 * Uses PostgREST FK-alias syntax: supervisor / client instead of profiles.
 */
export type ActivityForExport = Pick<
  ActivityRow,
  'id' | 'status' | 'description' | 'started_at' | 'ended_at' | 'submitted_at'
> & {
  locations: Pick<LocationRow, 'name'> | null;
  activity_types: Pick<ActivityTypeRow, 'label_pt'> | null;
  supervisor: Pick<ProfileRow, 'full_name'> | null;
  client: Pick<ProfileRow, 'full_name'> | null;
  signatures: Pick<SignatureRow, 'signed_at' | 'verification_code' | 'signer_name'>[];
};

/** Activity shape for the monthly PDF report. */
export type ActivityForMonthlyReport = Pick<
  ActivityRow,
  'id' | 'description' | 'started_at' | 'status'
> & {
  locations: Pick<LocationRow, 'name'> | null;
  activity_types: Pick<ActivityTypeRow, 'label_pt'> | null;
  supervisor: Pick<ProfileRow, 'full_name'> | null;
  client: Pick<ProfileRow, 'full_name'> | null;
  signatures: Pick<SignatureRow, 'signed_at'>[];
};

/** Minimal row for status-count aggregation in reports. */
export type ActivityStatusRow = Pick<ActivityRow, 'status'>;

/** Row for location-count aggregation in reports. */
export type ActivityLocationRow = { locations: Pick<LocationRow, 'name'> | null };

/** Row for monthly-count aggregation in reports. */
export type ActivityMonthRow = Pick<ActivityRow, 'started_at'>;

/** Row for average-time-to-sign computation in reports. */
export type ActivityTimeToSignRow = Pick<ActivityRow, 'submitted_at'> & {
  signatures: Pick<SignatureRow, 'signed_at'>[];
};

/** Activity row for the daily-report detail page (included activities list + available picker). */
export type ActivityForReportList = Pick<
  ActivityRow,
  'id' | 'description' | 'status' | 'started_at'
> & {
  locations: (Pick<LocationRow, 'name'> & { sort_order?: number | null }) | null;
  activity_types: Pick<ActivityTypeRow, 'label_pt'> | null;
};

/** Profile photo row (activity_photos with a runtime-added signed URL). */
export type ActivityPhotoWithUrl = Pick<ActivityPhotoRow, 'id' | 'storage_path' | 'caption'> & {
  url: string;
};
