export const id = "006_student_weekday_assignments";

export const sql = `
  ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS quantitative_study_days_json TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS verbal_study_days_json TEXT NOT NULL DEFAULT '[]';

  UPDATE student_profiles AS profile
  SET
    quantitative_study_days_json = (
      SELECT COALESCE(
        json_agg(day ORDER BY day) FILTER (WHERE position % 2 = 1),
        '[]'::json
      )::text
      FROM (
        SELECT day, row_number() OVER (ORDER BY day) AS position
        FROM generate_series(0, 6) AS day
        WHERE day <> profile.weekly_rest_day
          AND day <> profile.weekly_review_day
      ) AS available_days
    ),
    verbal_study_days_json = (
      SELECT COALESCE(
        json_agg(day ORDER BY day) FILTER (WHERE position % 2 = 0),
        '[]'::json
      )::text
      FROM (
        SELECT day, row_number() OVER (ORDER BY day) AS position
        FROM generate_series(0, 6) AS day
        WHERE day <> profile.weekly_rest_day
          AND day <> profile.weekly_review_day
      ) AS available_days
    )
  WHERE quantitative_study_days_json = '[]' OR verbal_study_days_json = '[]';
`;
