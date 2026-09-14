import { z } from "zod";

/**
 * Zod schemas for the Open-Meteo Forecast API (hourly UV block).
 * Weather APIs return nulls in unexpected places (a documented Open-Meteo
 * quirk for hours outside a variable's valid range) — every external
 * response gets validated here before touching the dose engine.
 * https://open-meteo.com/en/docs
 */
export const OpenMeteoHourlySchema = z.object({
  time: z.array(z.string()),
  uv_index: z.array(z.number().nullable()),
  uv_index_clear_sky: z.array(z.number().nullable()),
  cloud_cover: z.array(z.number().nullable()).optional(),
});

export const OpenMeteoForecastResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  elevation: z.number().optional(),
  hourly: OpenMeteoHourlySchema,
});

export type OpenMeteoForecastResponse = z.infer<typeof OpenMeteoForecastResponseSchema>;

/** EPA Envirofacts UV API — hourly UV index by ZIP, used for cross-validation. */
export const EpaUvHourSchema = z.object({
  ZIP: z.string(),
  DATE_TIME: z.string(),
  UV_VALUE: z.coerce.number(),
});

export const EpaUvResponseSchema = z.array(EpaUvHourSchema);
export type EpaUvResponse = z.infer<typeof EpaUvResponseSchema>;
