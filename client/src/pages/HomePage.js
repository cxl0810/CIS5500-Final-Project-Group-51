import React from 'react';
import { Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import petImage from '../assets/pet.jpg';

export default function HomePage() {
  return (
    <Box
      sx={{
        backgroundImage: `url(${petImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',

        width: '100vw',
        height: 'calc(100vh - 64px)', 

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',

        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1,
        }
      }}
    >
      {}
      <Box sx={{ position: 'relative', zIndex: 2, padding: '0 20px' }}>
        
        <Typography 
          variant="h2" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold', 
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          Find Your Perfect Companion
        </Typography>

        <Typography 
          variant="h5" 
          paragraph 
          sx={{ 
            color: '#f0f0f0',
            maxWidth: '800px', 
            margin: '0 auto 40px auto',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          Data-driven dog adoption recommendations based on your socioeconomic environment.
        </Typography>

        <Button 
          variant="contained" 
          size="large" 
          component={Link} 
          to="/recommend"
          sx={{ 
            fontSize: '1.4rem', 
            padding: '15px 50px', 
            borderRadius: '50px',
            backgroundColor: '#1976d2',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s'
            }
          }}
        >
          Start Matching
        </Button>
      </Box>
    </Box>
  );
}