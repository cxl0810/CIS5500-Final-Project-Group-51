import React, { useState } from 'react';
import { 
  Container, TextField, Button, Typography, Grid, Card, CardContent, 
  Chip, Alert, Box, Divider 
} from '@mui/material';
import axios from 'axios';

function cleanDogName(name) {
  if (!name) return "Unknown Name";
  let cleaned = String(name).trim();
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/^\\+/, '').trim();
  const csvMatch = cleaned.match(/^"?(?:\\)?([^",]+)"?,/);
  if (csvMatch && csvMatch[1]) {
    cleaned = csvMatch[1].trim();
  }
  const quoteMatch = cleaned.match(/"([^"]+)"/);
  if (quoteMatch && quoteMatch[1].length <= 40) {
    cleaned = quoteMatch[1].trim();
  }
  cleaned = cleaned.replace(/\(.*?\)/g, '').trim();
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0].trim();
  }
  if (cleaned.includes('-')) {
    cleaned = cleaned.split('-')[0].trim();
  }
  cleaned = cleaned.trim();
  if (!cleaned) return "Unknown Name";
  return cleaned;
}

function cleanBreed(breed) {
  if (!breed || String(breed).trim() === "") return "Unknown Breed";
  return String(breed).trim();
}

export default function ExplorePage() {
  const [city, setCity] = useState('');
  const [results, setResults] = useState([]);
  const [cityStats, setCityStats] = useState(null);   // Route 8
  const [stateStats, setStateStats] = useState(null); // Route 1
  const [overRepStats, setOverRepStats] = useState([]); // Route 5
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!city) return;
    setHasSearched(true);
    setResults([]);
    setCityStats(null);
    setStateStats(null);
    setOverRepStats([]);

    try {
      const dogsRes = await axios.get(`http://localhost:8080/dogs_by_city`, { 
        params: { city } 
      });
      setResults(dogsRes.data);

      if (dogsRes.data.length === 0) return;

      const currentState = dogsRes.data[0].state;
      const cityTrendsRes = await axios.get(`http://localhost:8080/city_breeds`);
      const matchedCityStat = cityTrendsRes.data.find(r => 
        r.city && r.city.toLowerCase() === city.toLowerCase()
      );
      if (matchedCityStat) setCityStats(matchedCityStat);
      const stateTrendsRes = await axios.get(`http://localhost:8080/top_breed_per_state`);
      const matchedStateStat = stateTrendsRes.data.find(r => 
        r.state === currentState
      );
      if (matchedStateStat) setStateStats(matchedStateStat);

      const overRepRes = await axios.get(`http://localhost:8080/over_represented`);
      const stateOverRep = overRepRes.data.filter(r => r.state === currentState);
      setOverRepStats(stateOverRep);

    } catch (err) {
      console.error(err);
      alert("Search failed. Ensure backend is running.");
    }
  };

  return (
    <Container sx={{ mt: 5, mb: 10 }}>
      <Typography variant="h3" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold' }}>
        City Explorer
      </Typography>
      
      {}
      <Box sx={{ maxWidth: 600, mx: 'auto', mb: 5, display: 'flex', gap: 2 }}>
        <TextField 
          label="Enter City Name" 
          placeholder="e.g. Seattle" 
          variant="outlined" 
          fullWidth
          value={city} 
          onChange={(e) => setCity(e.target.value)} 
        />
        <Button variant="contained" size="large" onClick={handleSearch}>
          Explore
        </Button>
      </Box>

      {}
      {(cityStats || stateStats || overRepStats.length > 0) && (
        <Alert 
          severity="info" 
          icon={false} 
          sx={{ 
            maxWidth: 900, 
            mx: 'auto', 
            mb: 4, 
            p: 3, 
            bgcolor: '#eaf6ff', 
            borderRadius: 2 
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            👀 Did you know?
          </Typography>

          {/* Route 8: City Stats */}
          {cityStats && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>
                Most Popular in <strong>{cityStats.city}</strong>:
              </Typography>
              <Chip 
                label={cityStats.breed_primary} 
                color="primary"
                sx={{ fontSize: '1rem', py: 0.5 }}
              />
            </Box>
          )}

          {/* Route 1: State Stats */}
          {stateStats && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>
                State Favorite (<strong>{stateStats.state}</strong>):
              </Typography>
              <Chip 
                label={stateStats.breed_primary} 
                color="secondary"
                sx={{ fontSize: '1rem', py: 0.5 }}
              />
            </Box>
          )}

          {/* Route 5: Over-represented Breeds (High Supply) */}
          {overRepStats.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" sx={{ fontSize: '1.1rem', mb: 1, color: '#e65100', fontWeight: 'bold' }}>
                📈 High Supply Breeds in {stateStats?.state || "this State"}:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {overRepStats.map((stat, idx) => (
                  <Chip 
                    key={idx}
                    label={`${stat.breed_primary} (${(stat.breed_share * 100).toFixed(1)}%)`}
                    variant="outlined"
                    color="warning"
                    size="small"
                  />
                ))}
              </Box>
            </>
          )}
        </Alert>
      )}

      {}
      <Grid container spacing={3}>
        {results.map((dog) => (
          <Grid item xs={12} sm={6} md={4} key={dog.dog_id}>
            <Card elevation={3} sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold">
                  {cleanDogName(dog.dog_name)}
                </Typography>

                <Typography color="primary" gutterBottom>
                  {cleanBreed(dog.breed_primary)}
                </Typography>

                <Box sx={{ my: 1 }}>
                  <Chip size="small" label={dog.dog_sex || "Unknown"} sx={{ mr: 1 }} />
                  <Chip size="small" label={dog.dog_age || "Unknown"} variant="outlined" />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  📍 {dog.city}, {dog.state}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {hasSearched && results.length === 0 && (
          <Typography variant="h6" color="text.secondary" align="center" sx={{ width: '100%', mt: 4 }}>
            No dogs found in this city.
          </Typography>
        )}
      </Grid>
    </Container>
  );
}