-- Migration: Weekly reports archiving system
-- This enables tracking historical weekly hours and automatic Sunday reset

-- Step 0: Ensure shifts table has created_at column (required for week filtering)
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 1: Create weekly_reports table to store historical data
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  shift_count INTEGER NOT NULL DEFAULT 0,
  working_days TEXT[] NOT NULL DEFAULT '{}',
  shifts_data JSONB, -- Store detailed shift information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, week_start)
);

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_reports_employee ON weekly_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_business ON weekly_reports(business_id);

-- Step 3: Function to get current week start (Monday)
CREATE OR REPLACE FUNCTION get_week_start(check_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
  RETURN check_date - (EXTRACT(DOW FROM check_date)::INTEGER + 6) % 7;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Function to archive current week's data
CREATE OR REPLACE FUNCTION archive_weekly_reports()
RETURNS TABLE (
  archived_count INTEGER,
  week_start DATE,
  week_end DATE
) AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_count INTEGER := 0;
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
        'hours', s.hours_worked
      ) ORDER BY 
        CASE s.day_of_week
          WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
          WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6
          WHEN 'Sun' THEN 7 ELSE 8
        END,
        CASE s.shift_time WHEN 'morning' THEN 1 ELSE 2 END
    ) as shifts_data
  FROM shifts s
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
  
  RETURN QUERY SELECT v_count, v_week_start, v_week_end;
END;
$$ LANGUAGE plpgsql;

-- Step 5: View to get current week's hours (non-archived)
CREATE OR REPLACE VIEW current_week_hours AS
SELECT 
  e.id as employee_id,
  e.name as employee_name,
  (array_agg(s.business_id))[1] as business_id,
  (array_agg(b.name))[1] as business_name,
  COALESCE(SUM(s.hours_worked), 0) as total_hours,
  COUNT(s.id) as shift_count,
  array_agg(DISTINCT s.day_of_week ORDER BY s.day_of_week) FILTER (WHERE s.day_of_week IS NOT NULL) as working_days,
  get_week_start(CURRENT_DATE) as week_start,
  get_week_start(CURRENT_DATE) + INTERVAL '6 days' as week_end
FROM employees e
INNER JOIN shifts s ON e.id = s.employee_id 
  AND s.created_at >= get_week_start(CURRENT_DATE)
  AND s.created_at < get_week_start(CURRENT_DATE) + INTERVAL '7 days'
LEFT JOIN businesses b ON s.business_id = b.id
GROUP BY e.id, e.name;

-- Step 6: Function to get all weeks with data (current + archived)
CREATE OR REPLACE FUNCTION get_all_report_weeks(bus_id UUID DEFAULT NULL)
RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  is_current BOOLEAN,
  employee_count BIGINT,
  total_shifts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  -- Current week
  SELECT 
    get_week_start(CURRENT_DATE) as week_start,
    (get_week_start(CURRENT_DATE) + INTERVAL '6 days')::DATE as week_end,
    true as is_current,
    COUNT(DISTINCT s.employee_id) as employee_count,
    COUNT(s.id)::INTEGER as total_shifts
  FROM shifts s
  WHERE (bus_id IS NULL OR s.business_id = bus_id)
    AND s.created_at >= get_week_start(CURRENT_DATE)
    AND s.created_at < get_week_start(CURRENT_DATE) + INTERVAL '7 days'
  HAVING COUNT(s.id) > 0
  
  UNION ALL
  
  -- Archived weeks
  SELECT 
    wr.week_start,
    wr.week_end,
    false as is_current,
    COUNT(DISTINCT wr.employee_id) as employee_count,
    SUM(wr.shift_count)::INTEGER as total_shifts
  FROM weekly_reports wr
  WHERE (bus_id IS NULL OR wr.business_id = bus_id)
  GROUP BY wr.week_start, wr.week_end
  
  ORDER BY week_start DESC;
END;
$$ LANGUAGE plpgsql;

-- Verification queries
-- SELECT * FROM current_week_hours;
-- SELECT * FROM get_all_report_weeks();
-- SELECT * FROM archive_weekly_reports(); -- Run this on Sunday night/Monday morning
