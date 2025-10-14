import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Container, Grid, Typography, Box, Button } from '@mui/material';
// [NOVO] Importa o cliente supabase
import { supabase } from '../supabaseClient';

import DataCard from './DataCard';
import GaugeChart from './GaugeChart';
import LineChart from './LineChart';

const socket = io('http://localhost:3000');
const API_URL = 'http://localhost:3000';

function Dashboard() { // [MODIFICADO] Remove as props
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

  const handleLogout = async () => {
    await supabase.auth.signOut(); // Usa o cliente importado
  };

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Dashboard I.M.P.
          </Typography>
          <Button variant="outlined" onClick={handleLogout}>
            Sair
          </Button>
        </Box>
        <Grid container spacing={3}>
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
          <Grid size={12}>
            <LineChart series={lineSeries} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default Dashboard;
