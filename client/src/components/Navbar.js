import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <AppBar position="static">
      <Container>
        <Toolbar>
          <Typography 
            variant="h6" 
            component={Link} 
            to="/" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold', 
              color: 'inherit', 
              textDecoration: 'none', 
              cursor: 'pointer' 
            }}
          >
            SocioEconAdopt
          </Typography>

          <Button color="inherit" component={Link} to="/recommend">Recommendation</Button>
          <Button color="inherit" component={Link} to="/explore">City Explorer</Button>
          
          {}
          <Button color="inherit" component={Link} to="/stats">Stats</Button>

        </Toolbar>
      </Container>
    </AppBar>
  );
}