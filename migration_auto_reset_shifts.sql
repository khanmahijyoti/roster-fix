-- Migration: Update archive_weekly_reports to reset shifts after archiving
-- This automatically deletes all shift assignments after saving the weekly report

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS archive_weekly_reports();

CREATE OR REPLACE FUNCTION archive_weekly_reports()
RETURNS TABLE (
  archived_count INTEGER,
  week_start DATE,
  week_end DATE,
  shifts_deleted INTEGER
) AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_count INTEGER := 0;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Calculate last week's date range (Monday to Sunday)
  v_week_start := get_week_start(CURRENT_DATE - INTERVAL '7 days');
  v_week_end := v_week_start + INTERVAL '6 days';
  
  -- Archive data for each employee who worked last week
  INSERT INTO weekly_reports (
    employee_id,
    business_id,
    week_start,
    week_end,
    total_hours,
    shift_count,
    working_days,
    shifts_data
  )
  SELECT 
    s.employee_id,
    s.business_id,
    v_week_start,
    v_week_end,
    COALESCE(SUM(s.hours_worked), 0) as total_hours,
    COUNT(*) as shift_count,
    array_agg(DISTINCT s.day_of_week ORDER BY s.day_of_week) as working_days,
    jsonb_agg(
      jsonb_build_object(
        'day', s.day_of_week,
        'shift_time', s.shift_time,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'hours', s.hours_worked,
        'business_name', b.name
      ) ORDER BY 
        CASE s.day_of_week
          WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
          WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6
          WHEN 'Sun' THEN 7 ELSE 8
        END,
        CASE s.shift_time WHEN 'morning' THEN 1 ELSE 2 END
    ) as shifts_data
  FROM shifts s
  LEFT JOIN businesses b ON s.business_id = b.id
  WHERE s.created_at >= v_week_start 
    AND s.created_at <= v_week_end + INTERVAL '1 day'
  GROUP BY s.employee_id, s.business_id
  ON CONFLICT (employee_id, week_start) 
  DO UPDATE SET
    total_hours = EXCLUDED.total_hours,
    shift_count = EXCLUDED.shift_count,
    working_days = EXCLUDED.working_days,
    shifts_data = EXCLUDED.shifts_data;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Now delete all shifts from last week after archiving
  DELETE FROM shifts
  WHERE created_at >= v_week_start 
    AND created_at <= v_week_end + INTERVAL '1 day';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Also reset all employee availability for the new week
  DELETE FROM availability;
  
  RETURN QUERY SELECT v_count, v_week_start, v_week_end, v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Test query (DO NOT run in production without backup):
-- SELECT * FROM archive_weekly_reports();
