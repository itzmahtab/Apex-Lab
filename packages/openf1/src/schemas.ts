import { z } from "zod";

// Only the fields ApexLab uses. Unknown fields are ignored; nullable where OpenF1 returns nulls.
const num = z.number().nullable();

export const meetingSchema = z.object({
  meeting_key: z.number().int(),
  meeting_name: z.string(),
  meeting_official_name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  country_name: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  circuit_short_name: z.string().nullable().optional(),
  date_start: z.string().nullable().optional(),
  date_end: z.string().nullable().optional(),
  year: z.number().int(),
  is_cancelled: z.boolean().nullable().optional(),
});
export type Meeting = z.infer<typeof meetingSchema>;

export const sessionSchema = z.object({
  session_key: z.number().int(),
  meeting_key: z.number().int(),
  session_name: z.string(),
  session_type: z.string(),
  date_start: z.string().nullable(),
  date_end: z.string().nullable(),
  year: z.number().int(),
  circuit_short_name: z.string().nullable().optional(),
  country_name: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  is_cancelled: z.boolean().nullable().optional(),
});
export type OF1Session = z.infer<typeof sessionSchema>;

export const driverSchema = z.object({
  driver_number: z.number().int(),
  name_acronym: z.string().nullable(),
  full_name: z.string().nullable(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  team_name: z.string().nullable(),
  team_colour: z.string().nullable(),
});
export type OF1Driver = z.infer<typeof driverSchema>;

export const lapSchema = z.object({
  driver_number: z.number().int(),
  lap_number: z.number().int(),
  date_start: z.string().nullable(),
  lap_duration: num,
  duration_sector_1: num,
  duration_sector_2: num,
  duration_sector_3: num,
  is_pit_out_lap: z.boolean().nullable(),
  st_speed: num.optional(),
});
export type OF1Lap = z.infer<typeof lapSchema>;

export const stintSchema = z.object({
  driver_number: z.number().int(),
  stint_number: z.number().int(),
  lap_start: z.number().int().nullable(),
  lap_end: z.number().int().nullable(),
  compound: z.string().nullable(),
  tyre_age_at_start: z.number().int().nullable(),
});
export type OF1Stint = z.infer<typeof stintSchema>;

export const carDataSchema = z.object({
  date: z.string(),
  speed: num,
  throttle: num,
  brake: num,
  n_gear: num,
  rpm: num,
  drs: num,
});
export type OF1CarData = z.infer<typeof carDataSchema>;

export const locationSchema = z.object({ date: z.string(), x: num, y: num });
export type OF1Location = z.infer<typeof locationSchema>;
