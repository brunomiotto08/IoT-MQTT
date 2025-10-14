// src/App.jsx (versão com a correção final)

import { useState, useEffect } from 'react';
import io from 'socket.io-client';

// Importações do Material-UI
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import Chart from 'react-apexcharts';
import axios from 'axios';

const socket = io('http://localhost:3000');
const API_URL = 'http://localhost:3000';

function App() {
  const [liveData, setLiveData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/leituras`);
        setHistoricalData(response.data || []);
      } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
      }
    };

    fetchInitialData();

    socket.on('mqtt_message', (message) => {
      const parsed = JSON.parse(message);
      // adiciona timestamp ISO para o dado em tempo real
      parsed.created_at = new Date().toISOString();
      setLiveData(parsed);

      setHistoricalData((current) => {
        const updated = [...current, parsed];
        return updated.length > 50 ? updated.slice(1) : updated;
      });
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
  const temperaturaSeries = [liveData ? parseFloat(liveData.temperatura) : 0];

  const lineChartOptions = {
    chart: {
      id: 'realtime-temperature',
      animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
      toolbar: { show: true },
      zoom: { enabled: true }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format: 'HH:mm:ss'
      }
    },
    yaxis: {
      title: { text: 'Temperatura (°C)' },
      labels: { formatter: (value) => (value !== undefined ? value.toFixed(1) : '0') }
    },
    stroke: { curve: 'smooth', width: 2 },
    theme: { mode: 'dark' },
    tooltip: { x: { format: 'dd MMM yyyy - HH:mm:ss' } },
    markers: { size: 0 }
  };

  const lineChartSeries = [{
    name: 'Temperatura',
    data: historicalData.map((d) => ({
      x: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      y: d.temperatura != null ? parseFloat(d.temperatura) : 0
    }))
  }];

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
            <DataCard title="Vibração" value={liveData ? liveData.vibracao.toFixed(2) : null} unit="mm/s" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DataCard title="Status da Máquina" value={liveData ? liveData.status : null} unit="" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DataCard title="Peças Produzidas" value={liveData ? liveData.pecas_produzidas : null} unit="" />
          </Grid>
          {/* Gráfico de Linha Histórico */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ padding: '16px' }}>
              <Typography variant="h6" align="center">Histórico de Temperatura</Typography>
              <Chart options={lineChartOptions} series={lineChartSeries} type="line" height={350} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;