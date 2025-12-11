const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors({ origin: '*' }));

// Register API routes (MUST match your frontend & MS4)
app.get('/top_breed_per_state', routes.top_breed_per_state);
app.get('/recommend_breeds', routes.recommend_breeds);
app.get('/shelter', routes.shelter);
app.get('/supply_income', routes.supply_income);
app.get('/over_represented', routes.over_represented);
app.get('/user_preferred', routes.user_preferred);
app.get('/income_recommend', routes.income_recommend);
app.get('/city_breeds', routes.city_breeds);
app.get('/sample_dogs', routes.sample_dogs);
app.get('/dogs_by_city', routes.dogs_by_city);

// Render requires this:
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;


