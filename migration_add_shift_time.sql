-- Migration: Add shift_time column to availability table
-- This allows workers to set availability for morning and afternoon shifts separately

-- Step 1: Add the shift_time column (defaults to 'morning' for existing records)
ALTER TABLE availability 
ADD COLUMN IF NOT EXISTS shift_time TEXT DEFAULT 'morning';

-- Step 2: Drop the old unique constraint (if it exists)
ALTER TABLE availability 
DROP CONSTRAINT IF EXISTS availability_employee_id_day_of_week_key;

-- Step 3: Create new unique constraint including shift_time
ALTER TABLE availability 
ADD CONSTRAINT availability_employee_id_day_shift_key 
UNIQUE (employee_id, day_of_week, shift_time);

-- Step 4: For each existing availability record, create an afternoon duplicate
-- This ensures all workers have both morning and afternoon availability set
INSERT INTO availability (employee_id, day_of_week, shift_time, is_available)
SELECT 
    employee_id, 
    day_of_week, 
    'afternoon' as shift_time,
    is_available
FROM availability
WHERE shift_time = 'morning'
ON CONFLICT (employee_id, day_of_week, shift_time) DO NOTHING;

-- Verification query (run this after to check)
-- SELECT employee_id, day_of_week, shift_time, is_available 
-- FROM availability 
-- ORDER BY employee_id, day_of_week, shift_time;
