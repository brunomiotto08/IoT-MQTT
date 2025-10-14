import React from 'react';
import { Paper, Typography } from '@mui/material';
import Chart from 'react-apexcharts';

const lineChartOptions = {
  chart: {
    id: 'realtime-temperature',
    animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
    toolbar: { show: true },
    zoom: { enabled: true }
  },
  xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'HH:mm:ss' } },
  yaxis: {
    title: { text: 'Temperatura (°C)' },
    labels: {
      formatter: (value) => { return value !== undefined ? value.toFixed(1) : '0'; }
    }
  },
  stroke: { curve: 'smooth', width: 2 },
  theme: { mode: 'dark' },
  tooltip: { x: { format: 'dd MMM yyyy - HH:mm:ss' } },
  markers: { size: 0 }
};

function LineChart({ series }) {
  return (
    <Paper elevation={3} sx={{ padding: '16px' }}>
      <Typography variant="h6" align="center" component="h2" gutterBottom>
        Histórico de Temperatura
      </Typography>
      <Chart options={lineChartOptions} series={series} type="line" height={350} />
    </Paper>
  );
}

export default LineChart;


