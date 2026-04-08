import { supabase } from "@/integrations/supabase/client";

export interface PublicAppConfig {
  notification_sound_url?: string;
  topup_account_name?: string;
  topup_bank_name?: string;
  topup_account_type?: string;
  topup_account_number?: string;
  topup_routing_ach?: string;
  topup_routing_wire?: string;
}

export const DEFAULT_NOTIFICATION_SOUND_URL = "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg";

export const fetchPublicAppConfig = async (): Promise<PublicAppConfig> => {
  const { data, error } = await supabase.functions.invoke("public-app-config");

  if (error) {
    throw error;
  }

  return (data?.config ?? {}) as PublicAppConfig;
};