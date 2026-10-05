export const id = "007_correct_weekday_assignments";

export const sql = `
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
  WHERE
    jsonb_array_length(quantitative_study_days_json::jsonb) +
    jsonb_array_length(verbal_study_days_json::jsonb) <> 5;
`;
