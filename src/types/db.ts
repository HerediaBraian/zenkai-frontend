import type { Tables } from "@/integrations/supabase/types";

/** Schedule row with nested activity from `select('*, activities(...)')` */
export type ScheduleWithActivity = Tables<"schedules"> & {
  activities?: Pick<Tables<"activities">, "name" | "color" | "max_capacity"> | null;
};

export type EnrollmentWithClients = Tables<"enrollments"> & {
  activities?: Pick<Tables<"activities">, "name"> | null;
  clients?: Pick<Tables<"clients">, "name" | "last_name"> | null;
};

export type IncomeWithClient = Tables<"income"> & {
  clients?: Pick<Tables<"clients">, "name" | "last_name"> | null;
};

export type WodResultWithRelations = Tables<"wod_results"> & {
  wods?: Pick<Tables<"wods">, "name"> | null;
  clients?: Pick<Tables<"clients">, "name" | "last_name"> | null;
};
