import React from 'react';
import { Paper, Typography } from '@mui/material';

function DataCard({ title, value, unit }) {
  return (
    <Paper elevation={3} sx={{ padding: '16px', textAlign: 'center', height: '100%' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" component="p">
        {value !== null && value !== undefined ? `${value} ${unit}` : '...'}
      </Typography>
    </Paper>
  );
}

export default DataCard;


