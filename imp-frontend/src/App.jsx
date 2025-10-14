// src/App.jsx (versão com a correção final)

import { useState, useEffect } from 'react';
import io from 'socket.io-client';

// Importações do Material-UI
import { Container, Typography, Box, Grid } from '@mui/material';
import axios from 'axios';

// Componentes apresentacionais
import DataCard from './components/DataCard';
import GaugeChart from './components/GaugeChart';
import LineChart from './components/LineChart';

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

  const gaugeSeries = [liveData ? parseFloat(liveData.temperatura) : 0];
  const lineSeries = [{
    name: 'Temperatura',
    data: historicalData.map((d) => ([
      d.created_at ? new Date(d.created_at).getTime() : Date.now(),
      d.temperatura != null ? parseFloat(d.temperatura) : 0
    ]))
  }];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Plataforma de Monitoramento Industrial (I.M.P.)
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GaugeChart series={gaugeSeries} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DataCard title="Vibração" value={liveData ? liveData.vibracao.toFixed(2) : null} unit="mm/s" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DataCard title="Status da Máquina" value={liveData ? liveData.status : null} unit="" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DataCard title="Peças Produzidas" value={liveData ? liveData.pecas_produzidas : null} unit="" />
          </Grid>
          {/* Gráfico de Linha Histórico */}
          <Grid size={12}>
            <LineChart series={lineSeries} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default App;