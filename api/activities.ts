import { supabase } from '../lib/supabase';

export async function fetchSimilarActivities(activityId: string, limit = 10) {
  const { data, error } = await supabase.functions.invoke(
    'zigzag-process-activity',
    {
      body: { activityId, limit },
    },
  );

  if (error) throw error;
  return data;
}
