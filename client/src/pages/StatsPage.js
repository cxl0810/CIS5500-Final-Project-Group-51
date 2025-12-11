import config from '../config.json';
import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, Grid, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, CircularProgress, Box, Chip
} from '@mui/material';
import axios from 'axios';

export default function StatsPage() {
  const [shelterStats, setShelterStats] = useState([]); // Route 3
  const [supplyStats, setSupplyStats] = useState([]);   // Route 4
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Route 4: Supply vs Income (Fixed localhost)
        const res4 = await axios.get(`https://${config.server_host}/supply_income`);
        setSupplyStats(res4.data); 

        // ✅ Route 3: Shelter Economics (Fixed localhost)
        const res3 = await axios.get(`https://${config.server_host}/shelter`);
        setShelterStats(res3.data.slice(0, 15)); 

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Container sx={{ mt: 10, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading Data...</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 5, mb: 10 }}>
      {/* Title */}
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', mb: 1 }}>
        Adoption Trends & Analytics
      </Typography>

      <Grid container spacing={4}>
        
        {/* Left Column: Supply vs Income */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', overflow: 'hidden' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                Supply vs. Income Rank
              </Typography>
              <Typography variant="caption" color="text.secondary">
                States ranked by dog supply relative to median income.
              </Typography>
            </Box>
            
            <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd' }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd' }}>State</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd' }}>Dogs Listed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplyStats.map((row) => (
                    <TableRow key={row.state} hover>
                      <TableCell>
                        <Chip label={`#${row.supply_income_rank}`} size="small" color={row.supply_income_rank <= 3 ? "error" : "default"} />
                      </TableCell>
                      <TableCell>{row.state}</TableCell>
                      <TableCell align="right">{row.num_dogs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Shelter Economics */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', overflow: 'hidden' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" color="secondary" sx={{ fontWeight: 'bold' }}>
                Shelter Economics
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Socioeconomic stats of shelter locations (Top 15).
              </Typography>
            </Box>

            <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f3e5f5' }}>City, State</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f3e5f5' }}>Avg Income</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f3e5f5' }}>Poverty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shelterStats.map((row, index) => (
                    <TableRow key={row.org_id || index} hover>
                      <TableCell>
                        <strong>{row.city}</strong>, {row.state}
                      </TableCell>
                      <TableCell align="right">
                        ${Math.round(row.avg_income).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {(row.avg_poverty_rate * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>

      </Grid>
    </Container>
  );
}
