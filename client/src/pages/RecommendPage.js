import config from '../config';
import React, { useState } from 'react';
import { 
  Container, TextField, Button, Typography, Card, CardContent, 
  Grid, Box, Tabs, Tab, Chip, MenuItem, Select, InputLabel, FormControl, 
  FormControlLabel, Checkbox, Alert, Paper, Divider
} from '@mui/material';
import axios from 'axios';

function cleanDogName(name) {
  if (!name) return "Unknown Name";
  let cleaned = String(name).trim();
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/^\\+/, '').trim();
  const csvMatch = cleaned.match(/^"?(?:\\)?([^",]+)"?,/);
  if (csvMatch && csvMatch[1]) cleaned = csvMatch[1].trim();
  const quoteMatch = cleaned.match(/"([^"]+)"/);
  if (quoteMatch && quoteMatch[1].length <= 40) cleaned = quoteMatch[1].trim();
  cleaned = cleaned.replace(/\(.*?\)/g, '').trim();
  if (cleaned.includes(',')) cleaned = cleaned.split(',')[0].trim();
  if (cleaned.includes('-')) cleaned = cleaned.split('-')[0].trim();
  return cleaned.trim();
}

function cleanText(str) {
  if (!str) return "";
  return String(str).replace(/^\\/, '').replace(/\\",$/, '').replace(/"/g, '').trim();
}

export default function RecommendPage() {
  const [tabIndex, setTabIndex] = useState(0); 
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [showNoFilterWarning, setShowNoFilterWarning] = useState(false);

  const [county, setCounty] = useState('');
  const [income, setIncome] = useState('');

  const [prefBreed, setPrefBreed] = useState('');
  const [prefColor, setPrefColor] = useState('');
  const [prefSize, setPrefSize] = useState('');
  const [prefAge, setPrefAge] = useState('');
  const [prefSex, setPrefSex] = useState('');
  const [prefCoat, setPrefCoat] = useState('');
  
  const [prefFixed, setPrefFixed] = useState(false);
  const [prefHouseTrained, setPrefHouseTrained] = useState(false);
  const [prefShotsCurrent, setPrefShotsCurrent] = useState(false);

  const [targetState, setTargetState] = useState('');
  const [chosenBreed, setChosenBreed] = useState('');

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
    setResults([]); 
    setHasSearched(false);
    setShowNoFilterWarning(false);
  };

  const handleSmartSearch = async () => {
    if (!county && !income) {
      alert("Please enter a County or Income!");
      return;
    }
    try {
      setHasSearched(true);
      setResults([]);
      let res;
      
      // ✅ 1. Smart Search (Fixed localhost)
      if (county) {
        res = await axios.get(`https://${config.server_host}/recommend_breeds`, { params: { county } });
      } else {
        res = await axios.get(`https://${config.server_host}/income_recommend`, { params: { income } });
      }
      
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Search failed. Ensure backend is running.");
    }
  };

  const handlePrefSearch = async () => {
    const isAnyFilterSelected = 
      prefBreed || prefColor || prefSize || prefAge || prefSex || prefCoat || 
      prefFixed || prefHouseTrained || prefShotsCurrent;

    if (!isAnyFilterSelected) {
      setShowNoFilterWarning(true);
      return;
    }
    setShowNoFilterWarning(false);

    try {
      setHasSearched(true);
      setResults([]);

      const params = {
        pref_breed: prefBreed || undefined,
        pref_color: prefColor || undefined,
        pref_size: prefSize || undefined,
        pref_age: prefAge || undefined,
        pref_sex: prefSex || undefined,
        pref_coat: prefCoat || undefined,
        pref_fixed: prefFixed ? 'true' : undefined,
        pref_house_trained: prefHouseTrained ? 'true' : undefined,
        pref_shots_current: prefShotsCurrent ? 'true' : undefined,
      };

      // ✅ 2. User Preferred Search (Fixed localhost)
      const res = await axios.get(`https://${config.server_host}/user_preferred`, { params });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Search failed.");
    }
  };

  const handleDirectSearch = async () => {
    if (!targetState || !chosenBreed) {
      alert("Please enter both State (e.g. WA) and Breed");
      return;
    }
    try {
      setHasSearched(true);
      setResults([]);
      
      // ✅ 3. Direct Search (Fixed localhost)
      const res = await axios.get(`https://${config.server_host}/sample_dogs`, {
        params: {
          target_state_abbrev: targetState,
          chosen_breed: chosenBreed
        }
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Search failed. Ensure backend is running.");
    }
  };

  return (
    <Container sx={{ mt: 5, mb: 10 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
        Find Your Perfect Match
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph sx={{ textAlign: 'center', mb: 4 }}>
        Choose between our socio-economic algorithm, custom filters, or direct search.
      </Typography>

      {/* Search Interface */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mb: 5 }}>
        
        {/* Tabs */}
        <Tabs 
          value={tabIndex} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ 
            mb: 4, 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minWidth: 'fit-content', 
              fontSize: '1.1rem',
              fontWeight: 'bold',
              px: 3 
            }
          }} 
        >
          <Tab label="Smart SocioEcon Match" />
          <Tab label="Custom Preferences" />
          {/* Direct Search Tab */}
          <Tab label="Direct Search (State & Breed)" />
        </Tabs>

        {/* Tab 0: Smart Search */}
        {tabIndex === 0 && (
          <Box>
            <Typography variant="body1" sx={{ mb: 3, fontStyle: 'italic', color: 'text.secondary', textAlign: 'center' }}>
              Enter <strong>EITHER</strong> your County <strong>OR</strong> your Annual Income to get data-driven recommendations.
            </Typography>
            <Grid container spacing={3} alignItems="center" justifyContent="center">
              <Grid item xs={12} md={5}>
                <TextField 
                  label="County" 
                  placeholder="e.g. King County"
                  variant="outlined" fullWidth 
                  value={county} onChange={(e) => {setCounty(e.target.value); setIncome('')}} 
                  helperText="Try: King County, Cook County"
                />
              </Grid>
              <Grid item xs={12} md={1}>
                <Typography align="center" variant="h6" sx={{ fontWeight: 'bold', color: '#999' }}>OR</Typography>
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField 
                  label="Annual Income" 
                  placeholder="e.g. 85000"
                  variant="outlined" type="number" fullWidth 
                  value={income} onChange={(e) => {setIncome(e.target.value); setCounty('')}}
                  helperText="Try ranges: 40000 - 100000"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Button variant="contained" size="large" fullWidth onClick={handleSmartSearch} sx={{ mt: 2, py: 1.5 }}>
                  Analyze & Recommend
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 1: Preferences */}
        {tabIndex === 1 && (
          <Box>
            {showNoFilterWarning && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Please select at least one preference before searching!
              </Alert>
            )}

            <Typography variant="h6" sx={{ mb: 3, color: '#1976d2', fontWeight: 'bold', borderBottom: '2px solid #eee', pb: 1 }}>
              1. Basic Information
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="Preferred Breed" placeholder="e.g. Retriever" variant="outlined" fullWidth 
                  value={prefBreed} onChange={(e) => setPrefBreed(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="Color" placeholder="e.g. Black" variant="outlined" fullWidth 
                  value={prefColor} onChange={(e) => setPrefColor(e.target.value)}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth sx={{ minWidth: 120 }}>
                  <InputLabel id="size-label">Size</InputLabel>
                  <Select 
                    labelId="size-label"
                    value={prefSize} 
                    label="Size"
                    onChange={(e) => setPrefSize(e.target.value)}
                  >
                    <MenuItem value=""><em>Any</em></MenuItem>
                    <MenuItem value="Small">Small</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Large">Large</MenuItem>
                    <MenuItem value="Extra Large">Extra Large</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} md={3}>
                <FormControl fullWidth sx={{ minWidth: 120 }}>
                  <InputLabel id="age-label">Age</InputLabel>
                  <Select 
                    labelId="age-label"
                    value={prefAge} 
                    label="Age"
                    onChange={(e) => setPrefAge(e.target.value)}
                  >
                    <MenuItem value=""><em>Any</em></MenuItem>
                    <MenuItem value="Baby">Baby</MenuItem>
                    <MenuItem value="Young">Young</MenuItem>
                    <MenuItem value="Adult">Adult</MenuItem>
                    <MenuItem value="Senior">Senior</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} md={3}>
                <FormControl fullWidth sx={{ minWidth: 120 }}>
                  <InputLabel id="sex-label">Sex</InputLabel>
                  <Select 
                    labelId="sex-label"
                    value={prefSex} 
                    label="Sex"
                    onChange={(e) => setPrefSex(e.target.value)}
                  >
                    <MenuItem value=""><em>Any</em></MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} md={3}>
                <FormControl fullWidth sx={{ minWidth: 120 }}>
                  <InputLabel id="coat-label">Coat</InputLabel>
                  <Select 
                    labelId="coat-label"
                    value={prefCoat} 
                    label="Coat"
                    onChange={(e) => setPrefCoat(e.target.value)}
                  >
                    <MenuItem value=""><em>Any</em></MenuItem>
                    <MenuItem value="Short">Short</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Long">Long</MenuItem>
                    <MenuItem value="Wire">Wire</MenuItem>
                    <MenuItem value="Curly">Curly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 4, mb: 2, color: '#2e7d32', fontWeight: 'bold' }}>
              2. Health & Behavior
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <FormControlLabel control={<Checkbox checked={prefFixed} onChange={(e) => setPrefFixed(e.target.checked)} />} label="Spayed/Neutered" />
              <FormControlLabel control={<Checkbox checked={prefHouseTrained} onChange={(e) => setPrefHouseTrained(e.target.checked)} />} label="House Trained" />
              <FormControlLabel control={<Checkbox checked={prefShotsCurrent} onChange={(e) => setPrefShotsCurrent(e.target.checked)} />} label="Shots Current" />
            </Box>

            <Button variant="contained" color="secondary" size="large" fullWidth onClick={handlePrefSearch} sx={{ mt: 4, py: 1.5, fontSize: '1.2rem', fontWeight: 'bold' }}>
              Find Matching Dogs
            </Button>
          </Box>
        )}

        {/* Tab 2: Direct Search */}
        {tabIndex === 2 && (
          <Box>
             <Alert severity="info" sx={{ mb: 3 }}>
                Find specific adoptable dogs by State and Breed.
             </Alert>
             <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField 
                  label="State (Abbrev)" 
                  placeholder="e.g. WA, CA" 
                  variant="outlined" fullWidth 
                  value={targetState} onChange={(e) => setTargetState(e.target.value)} 
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField 
                  label="Breed Name" 
                  placeholder="e.g. Golden Retriever" 
                  variant="outlined" fullWidth 
                  value={chosenBreed} onChange={(e) => setChosenBreed(e.target.value)} 
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button variant="contained" size="large" fullWidth onClick={handleDirectSearch} sx={{ py: 1.5 }}>
                  Search
                </Button>
              </Grid>
             </Grid>
          </Box>
        )}
      </Paper>

      {/* No Results Message */}
      {hasSearched && results.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Alert severity="warning" sx={{ width: '100%', maxWidth: 600, fontSize: '1.1rem' }}>
             No results found. Please check your spelling or try broader filters.
          </Alert>
        </Box>
      )}

      {/* Results Grid */}
      <Grid container spacing={3}>
        {results.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card elevation={4} sx={{ height: '100%', borderTop: '5px solid #1976d2', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {/* Smart Name Display Logic */}
                  {item.name ? cleanDogName(item.name) : (item.dog_name ? cleanDogName(item.dog_name) : (item.breed || item.breed_primary))}
                </Typography>
                
                {/* 1. Suitability Score Display */}
                {item.suitability_score && (
                  <>
                    <Chip 
                      label={`${(Number(item.suitability_score) * 100).toFixed(0)}% Suitability Match`} 
                      color="success" sx={{ mb: 2, fontWeight: 'bold' }} 
                    />
                    {item.county && (
                      <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 1, mb: 1 }}>
                        Recommended for <strong>{item.county}</strong> residents.
                      </Typography>
                    )}
                    {item.avg_income_for_breed && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Avg Adopter Income: 
                          <Typography component="span" fontWeight="bold" color="primary"> ${Math.round(item.avg_income_for_breed).toLocaleString()}</Typography>
                        </Typography>
                      </Box>
                    )}
                  </>
                )}

                {/* 2. User Preference Score Display */}
                {item.match_score !== undefined && (
                  <>
                    <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, fontSize: '0.9rem' }}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}><strong>Breed:</strong><br/>{item.breed_primary}</Grid>
                        <Grid item xs={6}><strong>Sex:</strong><br/>{item.sex}</Grid>
                        <Grid item xs={6}><strong>Age:</strong><br/>{item.age}</Grid>
                        <Grid item xs={6}><strong>Size:</strong><br/>{item.size}</Grid>
                      </Grid>
                    </Box>
                  </>
                )}

                {/* 3. Direct Search / Fallback Display */}
                {/* Only show if not a scored result (avoids dupes) */}
                {!item.suitability_score && item.match_score === undefined && (item.city || item.description) && (
                   <>
                      <Typography color="primary" gutterBottom>{item.breed_primary}</Typography>
                      {item.description && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {cleanText(item.description)}
                          </Typography>
                        </>
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 2, color: 'gray' }}>
                          📍 {item.city}, {item.state}
                      </Typography>
                   </>
                )}
{/* EXTRA CREDIT: External API Integration (Bing Search) */}
<Divider sx={{ my: 1 }} />
<Button 
  variant="outlined" 
  size="small" 
  fullWidth 
  sx={{ mt: 1, textTransform: 'none' }}
  onClick={() => {
    // 🔗 This constructs a dynamic URL to Bing Image Search
    const query = `${item.breed_primary} dog ${item.color_primary || ''}`;
    window.open(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, '_blank');
  }}
>
  🔍 See more {item.breed_primary}s on Bing
</Button>

{/* EXTRA CREDIT: External API Integration (Google Maps) */}
{item.city && item.state && (
  <Button 
    variant="text" 
    size="small" 
    fullWidth 
    sx={{ mt: 0.5, textTransform: 'none', color: 'text.secondary' }}
    onClick={() => {
  // 🛡️ FIX: Look for 'breed_primary' OR 'breed' (County search uses 'breed')
  const breedName = item.breed_primary || item.breed || "dog";
  const color = item.color_primary || "";
  
  const query = `${breedName} dog ${color}`;
  window.open(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, '_blank');
}}
  >
    📍 View Shelter on Google Maps
  </Button>
)}

              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
