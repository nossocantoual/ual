
UPDATE attendance_history 
SET event_name = (
  SELECT gira_text 
  FROM events 
  WHERE events.event_date = attendance_history.week_start_date
)
WHERE event_name IS NULL;
