-- Migration: Add shift time tracking and hours calculation
-- This enables admin to set specific times for shifts and track worker hours

-- Step 1: Add time columns to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(5,2) GENERATED ALWAYS AS (
  EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
) STORED;

-- Step 2: Set default times for existing shifts based on shift_time
UPDATE shifts 
SET 
  start_time = CASE 
    WHEN shift_time = 'morning' THEN '08:00:00'::TIME
    WHEN shift_time = 'afternoon' THEN '14:00:00'::TIME
    ELSE '08:00:00'::TIME
  END,
  end_time = CASE 
    WHEN shift_time = 'morning' THEN '14:00:00'::TIME
    WHEN shift_time = 'afternoon' THEN '23:00:00'::TIME
    ELSE '17:00:00'::TIME
  END
WHERE start_time = '08:00:00'::TIME AND end_time = '17:00:00'::TIME;

-- Step 3: Create a view for weekly hours calculation per employee
CREATE OR REPLACE VIEW employee_weekly_hours AS
SELECT 
  employee_id,
  SUM(hours_worked) as total_hours,
  COUNT(*) as shift_count,
  array_agg(DISTINCT day_of_week ORDER BY day_of_week) as working_days
FROM shifts
GROUP BY employee_id;

-- Step 4: Create function to get employee weekly hours
CREATE OR REPLACE FUNCTION get_employee_weekly_hours(emp_id UUID)
RETURNS TABLE (
  total_hours DECIMAL,
  shift_count BIGINT,
  working_days TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.hours_worked), 0) as total_hours,
    COUNT(*) as shift_count,
    array_agg(DISTINCT s.day_of_week ORDER BY s.day_of_week) as working_days
  FROM shifts s
  WHERE s.employee_id = emp_id;
END;
$$ LANGUAGE plpgsql;

-- Verification queries (run these after to check)
-- SELECT * FROM shifts LIMIT 5;
-- SELECT * FROM employee_weekly_hours;
-- SELECT * FROM get_employee_weekly_hours('YOUR_EMPLOYEE_ID');
