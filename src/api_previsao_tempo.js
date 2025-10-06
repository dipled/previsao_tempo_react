// server_previsao_tempo.js
import express from 'express';
import axios from 'axios';
import cors from "cors";
const app = express();
app.use(cors()) //permite todas as origens durante desenvolvimento
const UF_BRASIL = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

function describeWeather(current, daily) {
  const wc = current.weathercode || 0;
  const vento = current.windspeed || 0;
  const chuva = (daily.precipitation_sum && daily.precipitation_sum[0]) || 0;

  let descricao = '';

  if (wc === 0) descricao = 'Céu limpo';
  else if ([1, 2, 3].includes(wc)) descricao = 'Parcialmente nublado';
  else if (wc >= 45 && wc <= 48) descricao = 'Neblina';
  else if (wc >= 51 && wc <= 55) descricao = 'Chuva leve';
  else if (wc >= 61 && wc <= 67) descricao = 'Chuva moderada';
  else if (wc >= 71 && wc <= 77) descricao = 'Neve ou granizo';
  else if (wc >= 95) descricao = 'Tempestade com trovoadas';
  else descricao = 'Condições meteorológicas variadas';

  if (chuva > 10) descricao += ', muita chuva esperada';
  else if (chuva > 0) descricao += ', chuva moderada';

  if (vento > 30) descricao += ', com ventos fortes';
  else if (vento > 15) descricao += ', com ventos moderados';

  return descricao;
}

app.get('/previsao', async (req, res) => {
  const cidade = req.query.cidade;
  const estadoSigla = req.query.estado ? req.query.estado.toUpperCase() : null;

  if (!cidade) {
    return res.status(400).json({ erro: 'Cidade não informada' });
  }

  try {
    // Buscar localização
    const geoResp = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: cidade, count: 10 }
    });

    const results = geoResp.data.results;
    if (!results || results.length === 0) {
      return res.status(404).json({ erro: 'Cidade não encontrada' });
    }

    let cidadeInfo;

    if (estadoSigla) {
      const nomeEstado = UF_BRASIL[estadoSigla];
      if (!nomeEstado) {
        return res.status(400).json({ erro: `Sigla do estado inválida: ${estadoSigla}` });
      }
      const filtrados = results.filter(r => r.admin1 === nomeEstado);
      if (filtrados.length === 0) {
        return res.status(404).json({ erro: `Cidade ${cidade} não encontrada no estado ${estadoSigla}` });
      }
      cidadeInfo = filtrados[0];
    } else {
      cidadeInfo = results[0];
    }

    // Buscar previsão
    const weatherResp = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: cidadeInfo.latitude,
        longitude: cidadeInfo.longitude,
        current_weather: true,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'America/Sao_Paulo'
      }
    });

    const currentWeather = weatherResp.data.current_weather;
    const daily = weatherResp.data.daily;

    if (!currentWeather || !daily) {
      return res.status(500).json({ erro: 'Dados de previsão não encontrados' });
    }

    const descricao = describeWeather(currentWeather, daily);

    return res.json({
      cidade,
      estado: cidadeInfo.admin1,
      temperatura_atual: currentWeather.temperature,
      vento_atual: currentWeather.windspeed,
      maxima_hoje: daily.temperature_2m_max[0],
      minima_hoje: daily.temperature_2m_min[0],
      precipitacao_hoje: daily.precipitation_sum[0],
      descricao
    });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

