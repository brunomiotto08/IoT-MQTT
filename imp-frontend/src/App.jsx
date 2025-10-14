// src/App.jsx (versão com a correção final)

import { useState, useEffect } from 'react';
import io from 'socket.io-client';

// Importações do Material-UI
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';

const socket = io('http://localhost:3000');

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    socket.on('mqtt_message', (message) => {
      console.log('Nova mensagem recebida do backend:', message);
      setData(JSON.parse(message));
    });

    return () => {
      socket.off('mqtt_message');
    };
  }, []);

  const temperaturaOptions = {
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
            formatter: (val) => `${parseFloat(val).toFixed(1)} °C`, // Formata o valor exibido
            color: '#FFFFFF'
          }
        }
      }
    },
    fill: { colors: ['#00E396'] },
    labels: ['Temperatura'],
    stroke: { lineCap: 'round' },
  };

  // [A CORREÇÃO ESTÁ AQUI]
  // Garantimos que o valor passado para 'series' é um NÚMERO.
  const temperaturaSeries = [data ? parseFloat(data.temperatura) : 0];

  const DataCard = ({ title, value, unit }) => (
    <Paper elevation={3} sx={{ padding: '16px', textAlign: 'center', height: '100%' }}>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="h4">{value !== null ? `${value} ${unit}` : '...'}</Typography>
    </Paper>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Plataforma de Monitoramento Industrial (I.M.P.)
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={3} sx={{ padding: '16px', textAlign: 'center' }}>
              <Typography variant="h6">Temperatura</Typography>
              <Chart options={temperaturaOptions} series={temperaturaSeries} type="radialBar" height={280} />
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DataCard title="Vibração" value={data ? data.vibracao.toFixed(2) : null} unit="mm/s" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DataCard title="Status da Máquina" value={data ? data.status : null} unit="" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DataCard title="Peças Produzidas" value={data ? data.pecas_produzidas : null} unit="" />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;