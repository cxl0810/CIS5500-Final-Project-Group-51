const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors({
  origin: '*',   // allow all origins for now
}));

// Register API routes
app.get('/top-breed-per-state', routes.top_breed_per_state);
app.get('/recommend-breeds', routes.recommend_breeds);
app.get('/shelter', routes.shelter);
app.get('/supply-income', routes.supply_income);
app.get('/over-represented', routes.over_represented);
app.get('/user-preferred', routes.user_preferred);
app.get('/income-recommend', routes.income_recommend);
app.get('/city-breeds', routes.city_breeds);
app.get('/sample-dogs', routes.sample_dogs);
app.get('/dogs-by-city', routes.dogs_by_city);

// ******** IMPORTANT FOR RENDER ********
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

