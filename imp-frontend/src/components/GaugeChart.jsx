import React from 'react';
import { Paper, Typography } from '@mui/material';
import Chart from 'react-apexcharts';

const gaugeOptions = {
  chart: { type: 'radialBar' },
  theme: { mode: 'dark' },
  plotOptions: {
    radialBar: {
      startAngle: -135,
      endAngle: 135,
      hollow: { size: '70%' },
      dataLabels: {
        name: { show: false },
        value: {
          fontSize: '30px',
          show: true,
          formatter: (val) => `${parseFloat(val).toFixed(1)} °C`,
          color: '#FFFFFF'
        }
      }
    }
  },
  fill: { colors: ['#00E396'] },
  labels: ['Temperatura'],
  stroke: { lineCap: 'round' },
};

function GaugeChart({ series }) {
  return (
    <Paper elevation={3} sx={{ padding: '16px', textAlign: 'center' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Temperatura Atual
      </Typography>
      <Chart options={gaugeOptions} series={series} type="radialBar" height={235} />
    </Paper>
  );
}

export default GaugeChart;


