const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');

const app = express();
app.use(cors({
  origin: '*',
}));

// We use express to define our various API endpoints and
// provide their handlers that we implemented in routes.js
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

app.listen(config.server_port, () => {
  console.log(`Server running at http://${config.server_host}:${config.server_port}/`)
});

module.exports = app;
