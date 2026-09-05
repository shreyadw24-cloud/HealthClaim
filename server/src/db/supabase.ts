import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// History-saving is a best-effort side feature — it should never take the
// whole verify-claim pipeline down. If these aren't set, `supabase` stays
// null and callers (see db/verifications.ts) just skip the save with a
// warning instead of crashing the process on startup.
if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[HealthClaim] SUPABASE_URL or SUPABASE_SERVICE_KEY is missing — verification history will not be saved. Add both to server/.env to enable it."
  );
}

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;