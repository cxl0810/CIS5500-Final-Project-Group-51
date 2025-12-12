const { Pool, types } = require('pg');
types.setTypeParser(20, val => parseInt(val, 10));

const connection = new Pool({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB,
  port: process.env.RDS_PORT || 5432,
  ssl: { 
    rejectUnauthorized: false 
  }
});

connection.connect((err) => err && console.log(err));

// Route 1: GET /top-breed-per-state
const top_breed_per_state = async function(req, res) {
  const state = req.query.state || null;
  let whereClause = "";
  let params = [];

  if (state) {
    params.push(state);
    whereClause = "WHERE s.state = $1";
  }

  const query = `
    WITH breed_counts AS (
      SELECT
        s.state,
        b.breed_primary,
        COUNT(*) AS adoption_count,
        RANK() OVER (
          PARTITION BY s.state
          ORDER BY COUNT(*) DESC
        ) AS breed_rank
      FROM Dogs d
      JOIN DogBreeds b ON d.dog_id = b.dog_id
      JOIN Shelters s ON d.org_id = s.org_id
      ${whereClause}
      GROUP BY s.state, b.breed_primary
    )
    SELECT state, breed_primary, adoption_count
    FROM breed_counts
    WHERE breed_rank = 1;`;

  connection.query(query, params, (err, data) => {
    if (err) {
      console.log(err);
      res.json([]);
    } else {
      res.json(data.rows);
    }
  });
};

// Route 2: GET /recommend-breeds
const recommend_breeds = async function(req, res) {
  const county = req.query.county;

  if (!county) {
      return res.status(400).send("Missing required query parameter: county");
  }

  const query = `
    WITH target_county_input AS (
        SELECT $1::text AS county
    ),
    target_county_stats AS (
        SELECT
            mcn.county,
            mcn.norm_income,
            mcn.norm_poverty
        FROM mv_county_norms mcn
        JOIN target_county_input tci
          ON LOWER(mcn.county) = LOWER(tci.county)
    ),
    score_calc AS (
        SELECT
            bt.breed,
            tc.county,
            bt.popularity_count,
            (
                0.40 * (1 - COALESCE(bt.pct_special_needs, 0)) +
                0.25 * COALESCE(bt.pct_fixed, 0) +
                0.10 * (1 - COALESCE(bt.pct_long_coat, 0)) +
                0.15 * COALESCE(tc.norm_income, 0) +
                0.10 * (1 - COALESCE(tc.norm_poverty, 0)) +
                (0.0001 * LEAST(bt.popularity_count, 500))
            ) AS raw_score
        FROM mv_breed_traits bt
        CROSS JOIN target_county_stats tc
    )
    SELECT
        breed,
        county,
        LEAST(100, ROUND((POWER(raw_score::numeric, 6) * 100), 1)) AS match_score
    FROM score_calc
    ORDER BY raw_score DESC
    LIMIT 30;
  `;

  connection.query(query, [county], (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "Database error" });
    } else {
      res.json(data.rows);
    }
  });
}

// Route 3: GET /shelter
const shelter = async function(req, res) {
  const query = `
    WITH gold_shelters AS (
    SELECT s.org_id
    FROM Shelters s
    WHERE NOT EXISTS (
        SELECT 1
        FROM Dogs d
        JOIN DogAttributes da ON d.dog_id = da.dog_id
        WHERE d.org_id = s.org_id
          AND da.shots_current = FALSE
    )
),
state_metrics AS (
    SELECT
        t.state AS state_full_name,
        AVG(e.income) AS avg_income,
        AVG(e.unemployment) AS avg_unemployment,
        AVG(e.poverty) AS avg_poverty,
        AVG(e.mean_commute) AS avg_commute,
        AVG(e.income_per_cap) AS avg_income_per_capita
    FROM Tracts t
    JOIN EconomicsHousing e ON t.tract_id = e.tract_id
    GROUP BY t.state
)
SELECT
    s.org_id,
    s.city,
    s.state,
    sm.avg_income,
    sm.avg_unemployment,
    sm.avg_poverty AS avg_poverty_rate,
    sm.avg_commute AS avg_commute_time,
    sm.avg_income_per_capita
FROM Shelters s
JOIN gold_shelters gs ON s.org_id = gs.org_id
JOIN States st ON s.state = st.state_abbrev
JOIN state_metrics sm ON st.state_name = sm.state_full_name
ORDER BY sm.avg_income DESC;
  `;

  connection.query(query, (err, data) => {
    if (err) {
      console.log(err);
      res.json({});
    } else {
      const result = data.rows.map(row => ({
        org_id: row.org_id,
        city: row.city,
        state: row.state,
        avg_income: row.avg_income,
        avg_unemployment: row.avg_unemployment,
        avg_poverty_rate: row.avg_poverty_rate,
        avg_commute_time: row.avg_commute_time,
        avg_income_per_capita: row.avg_income_per_capita
      }));

      res.json(result);
    }
  });
};

// Route 4: GET /supply-income
const supply_income = async function(req, res) {
  connection.query(`
    WITH state_income AS (
      SELECT
        s.state_abbrev,
        AVG(eh.income) AS median_income
      FROM Tracts t
      JOIN EconomicsHousing eh ON eh.tract_id = t.tract_id
      JOIN States s ON s.state_name = t.state
      GROUP BY s.state_abbrev
    ),
    state_dogs AS (
      SELECT
        sh.state,
        COUNT(*) AS num_dogs
      FROM Dogs d
      JOIN Shelters sh ON sh.org_id = d.org_id
      GROUP BY sh.state
    )
    SELECT
      sd.state,
      si.median_income,
      sd.num_dogs,
      RANK() OVER (ORDER BY sd.num_dogs / si.median_income DESC) AS supply_income_rank
    FROM state_dogs sd
    JOIN state_income si ON si.state_abbrev = sd.state
    ORDER BY supply_income_rank;
  `, (err, data) => {
    if (err) {
      console.log(err);
      res.json([]);
    } else {
      res.json(data.rows);
    }
  });
}

// Route 5: GET /over-represented
const over_represented = async function(req, res) {

  const query = `
    WITH ranked AS (
        SELECT
            breed_primary,
            state,
            breed_count_in_state,
            total_dogs_in_state,
            breed_share,
            ROW_NUMBER() OVER (
                PARTITION BY breed_primary
                ORDER BY breed_share DESC
            ) AS rn
        FROM mv_breed_state_share
    )
    SELECT
        breed_primary,
        state,
        breed_count_in_state,
        total_dogs_in_state,
        ROUND(breed_share::numeric, 4) AS breed_share
    FROM ranked
    WHERE rn <= 5
    ORDER BY breed_primary, breed_share DESC;
  `;

  connection.query(query, (err, data) => {
    if (err) {
      console.log(err);
      res.json([]);
    } else {
      res.json(data.rows);
    }
  });
};


// Route 6: GET /user-preferred
const user_preferred = async function(req, res) {
  const {
    pref_color, pref_size, pref_breed, pref_age, pref_sex,
    pref_coat, pref_fixed, pref_house_trained, pref_shots_current
  } = req.query;

  // Convert "true"/"false" strings to actual booleans or null
  const fixedBool = pref_fixed === 'true' ? true : null;
  const houseBool = pref_house_trained === 'true' ? true : null;
  const shotsBool = pref_shots_current === 'true' ? true : null;

  const params = [
    pref_color || null,
    pref_size || null,
    pref_breed || null,
    pref_age || null,
    pref_sex || null,
    fixedBool,
    houseBool,
    pref_coat || null,
    shotsBool
  ];

  const query = `
    WITH FriendlyDogs AS (
    SELECT dog_id, description
    FROM DogDescriptions
    WHERE to_tsvector('english', description) @@ plainto_tsquery('english', 'friendly')
),
ScoredDogs AS (
    SELECT
        d.dog_id,
        d.name,
        d.age,
        d.sex,
        d.size,
        da.color_primary,
        da.coat,
        da.fixed,
        da.house_trained,
        da.shots_current,
        db.breed_primary,
        fd.description,
        (
          CASE WHEN $1::text IS NULL OR da.color_primary = $1::text THEN 1 ELSE 0 END +
          CASE WHEN $2::text IS NULL OR d.size = $2::text THEN 1 ELSE 0 END +
          CASE WHEN $3::text IS NULL OR db.breed_primary = $3::text THEN 1 ELSE 0 END +
          CASE WHEN $4::text IS NULL OR d.age = $4::text THEN 1 ELSE 0 END +
          CASE WHEN $5::text IS NULL OR d.sex = $5::text THEN 1 ELSE 0 END +
          CASE WHEN $6::boolean IS NULL OR da.fixed = $6::boolean THEN 1 ELSE 0 END +
          CASE WHEN $7::boolean IS NULL OR da.house_trained = $7::boolean THEN 1 ELSE 0 END +
          CASE WHEN $8::text IS NULL OR da.coat = $8::text THEN 1 ELSE 0 END +
          CASE WHEN $9::boolean IS NULL OR da.shots_current = $9::boolean THEN 1 ELSE 0 END
        ) AS match_score

    FROM FriendlyDogs fd
    JOIN Dogs d           ON d.dog_id = fd.dog_id
    JOIN DogAttributes da ON d.dog_id = da.dog_id
    JOIN DogBreeds db     ON d.dog_id = db.dog_id
)
SELECT *
FROM ScoredDogs
ORDER BY match_score DESC
LIMIT 10;
  `;

  connection.query(query, params, (err, data) => {
    if (err || !data) {
      console.error("Route 6 Error:", err);
      res.json([]); 
    } else {
      res.json(data.rows);
    }
  });
};

// Route 7: GET /income-recommend
const income_recommend = async function(req, res) {
  
  // 1. Initialize with 'let' so we can change it
  let userIncome = parseFloat(req.query.income);

  // 2. Safety Check
  if (isNaN(userIncome)) {
    return res.status(400).json({ error: "Invalid or missing 'income' query parameter" });
  }

  // 3. Clamp the values
  const MAX_STATE_AVG_INCOME = 85000;
  if (userIncome > MAX_STATE_AVG_INCOME) {
    userIncome = MAX_STATE_AVG_INCOME;
  }
  
  const MIN_STATE_AVG_INCOME = 30000;
  if (userIncome < MIN_STATE_AVG_INCOME) {
    userIncome = MIN_STATE_AVG_INCOME;
  }

  const query = `
    WITH StateSocio AS (
      SELECT
        t.state,
        AVG(e.income) AS avg_income
      FROM Tracts t
      JOIN EconomicsHousing e ON t.tract_id = e.tract_id
      GROUP BY t.state
    ),
    DogByState AS (
      SELECT
        st.state_name,
        b.breed_primary,
        COUNT(*) AS num_adoptions
      FROM Dogs d
      JOIN DogBreeds b   ON d.dog_id  = b.dog_id
      JOIN Shelters s    ON d.org_id  = s.org_id
      JOIN States st     ON s.state   = st.state_abbrev
      GROUP BY st.state_name, b.breed_primary
    )
    SELECT
      dbs.breed_primary,
      SUM(dbs.num_adoptions)            AS total_adoptions,
      AVG(ss.avg_income)                AS avg_income_for_breed
    FROM DogByState dbs
    JOIN StateSocio ss ON dbs.state_name = ss.state
    WHERE ss.avg_income BETWEEN $1 - 20000 AND $1 + 20000
    GROUP BY dbs.breed_primary
    ORDER BY total_adoptions DESC
    LIMIT 10;
  `;

  connection.query(query, [userIncome], (err, data) => {
    if (err || !data) {
      console.error("Database Error:", err);
      res.json([]);
    } else {
      const result = data.rows.map(row => ({
        breed_primary: row.breed_primary,
        total_adoptions: row.total_adoptions,
        avg_income_for_breed: parseFloat(row.avg_income_for_breed)
      }));
      res.json(result);
    }
  });
};

// Route 8: GET /city-breeds
const city_breeds = async function(req, res) {
  connection.query(`
    SELECT
      s.city,
      b.breed_primary,
      COUNT(*) AS adoption_count,
      RANK() OVER (PARTITION BY s.city ORDER BY COUNT(*) DESC) AS breed_rank
    FROM Dogs d
    JOIN DogBreeds b ON d.dog_id = b.dog_id
    JOIN Shelters s  ON d.org_id = s.org_id
    GROUP BY s.city, b.breed_primary
    ORDER BY s.city, breed_rank;
  `, (err, data) => {
    if (err) {
      console.log(err);
      res.json([]);
    } else {
      res.json(data.rows);
    }
  });
}

// Route 9: GET /sample-dogs
const sample_dogs = async function(req, res) {
  // Add wildcards for partial matching
  const targetState = req.query.target_state_abbrev ? `%${req.query.target_state_abbrev}%` : '%';
  const chosenBreed = req.query.chosen_breed ? `%${req.query.chosen_breed}%` : '%';

  const query = `
    SELECT
      d.dog_id,
      d.name,
      d.age,
      d.sex,
      d.size,
      s.city,
      s.state,
      db.breed_primary,
      da.fixed,
      da.house_trained,
      da.env_children,
      da.special_needs,
      da.description
    FROM Dogs d
    JOIN Shelters s       ON d.org_id = s.org_id
    JOIN DogBreeds db     ON d.dog_id = db.dog_id
    LEFT JOIN DogAttributes da ON d.dog_id = da.dog_id
    WHERE s.state ILIKE $1
      AND db.breed_primary ILIKE $2
    ORDER BY da.env_children DESC, da.fixed DESC, d.name
    LIMIT 50;
  `;

  connection.query(query, [targetState, chosenBreed], (err, data) => {
    if (err || !data) {
      console.error(err);
      res.json([]);
    } else {
      const result = data.rows.map(row => ({
        dog_id: row.dog_id,
        name: row.name,
        age: row.age,
        sex: row.sex,
        size: row.size,
        city: row.city,
        state: row.state,
        breed_primary: row.breed_primary, 
        fixed: row.fixed,
        house_trained: row.house_trained,
        env_children: row.env_children,
        special_needs: row.special_needs,
        description: row.description
      }));

      res.json(result);
    }
  });
};

// Route 10: GET /dogs-by-city
const dogs_by_city = async function(req, res) {
  const city = req.query.city;

  if (!city) {
    return res.status(400).send("Missing required query parameter: city");
  }

  connection.query(`
    SELECT
      s.org_id,
      s.city,
      s.state,
      s.zip,
      d.dog_id,
      d.name AS dog_name,
      d.age AS dog_age,
      d.sex AS dog_sex,
      d.size AS dog_size,
      db.breed_primary,
      db.breed_secondary,
      db.breed_mixed,
      da.color_primary,
      da.color_secondary,
      da.coat,
      da.fixed,
      da.house_trained,
      da.special_needs,
      da.shots_current,
      da.env_children
    FROM Shelters s
    JOIN Dogs d ON s.org_id = d.org_id
    LEFT JOIN DogBreeds db ON d.dog_id = db.dog_id
    LEFT JOIN DogAttributes da ON d.dog_id = da.dog_id
    WHERE s.city = $1
    ORDER BY s.org_id, d.dog_id;
  `, [city], (err, data) => {
    if (err) {
      console.log(err);
      res.json([]);
    } else {
      res.json(data.rows);
    }
  });
}

module.exports = {
  top_breed_per_state,
  recommend_breeds,
  shelter,
  supply_income,
  over_represented,
  user_preferred,
  income_recommend,
  city_breeds,
  sample_dogs,
  dogs_by_city
}
