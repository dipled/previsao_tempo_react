import { useEffect, useState } from 'react'
import './App.css'
import axios from 'axios';

// função para remoção de acentos
function removeAccents(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function App() {
  const [cidades, setCidades] = useState([{id: 0, nome : "", uf_sigla: ""}]);
  const [query, setQuery] = useState("")
  const [filtered, setFiltered] = useState<typeof cidades>([])
  const [selected, setSelected] = useState({nome : "", uf_sigla: ""})
  const [response, setResponse] = useState({cidade: "",estado: "", temperatura_atual: 0, vento_atual: 0, maxima_hoje: 0, minima_hoje: 0, precipitacao_hoje: 0, descricao: ""})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cidadesResponse = await axios.get(
          'https://servicodados.ibge.gov.br/api/v1/localidades/municipios'
        )
        setCidades(cidadesResponse.data.map((cidade: { id: number; nome: string; "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { sigla?: string; }; }; }; }) => ({
          id: cidade.id,
          nome: cidade.nome,
          uf_sigla: cidade['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla
        })));
      } catch (err) {
        console.error('Erro ao buscar cidades:', err)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (query.length > 0) {
      setFiltered(
        cidades.filter(c =>
          removeAccents(c.nome.toLowerCase()).includes(query.toLowerCase()) ||
          removeAccents(c.uf_sigla.toLowerCase()).includes(query.toLowerCase())
        )
      )
    } else {
      setFiltered([])
    }
  }, [query, cidades])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const climaResponse = await axios.get(
          'http://localhost:5000/previsao', {params: {cidade: selected.nome, estado: selected.uf_sigla}}
        )
        setResponse(climaResponse.data)
      } catch (err) {
        console.error('Erro ao buscar cidades:', err)
      }
    }

    fetchData()
  }, [selected])

  return (
    <>
    <h1>Previsão do Tempo</h1>
    <div style={{ padding: "20px" }}>
      <h2>Buscar Cidade</h2>
      <input
        type="text"
        placeholder="Digite cidade ou UF"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: "300px", padding: "8px" }}
      />
      
      {filtered.length > 0 && (
        <ul style={{
          border: "1px solid #ccc",
          maxHeight: "200px",
          overflowY: "auto",
          marginTop: "5px",
          listStyle: "none",
          padding: "0"
        }}>
          {filtered.slice(0, 20).map(c => (   // limite de 20 resultados
            <li
              key={c.id}
              style={{ padding: "6px", cursor: "pointer" }}
              onClick={() => {
                setSelected({nome: c.nome, uf_sigla: c.uf_sigla})
                setQuery("") // limpar o input
                setFiltered([]) // esconder a lista
              }}
            >
              {c.nome} - {c.uf_sigla}
            </li>
          ))}
        </ul>
      )}

      {selected.nome && <p>Dados meteorológicos para {selected.nome + " - " + selected.uf_sigla}:</p>}

        <div className="weather-table-container">
          <table className="weather-table">
            <tbody>
              <tr>
                <td>Temperatura atual</td>
                <td>{response.temperatura_atual} °C</td>
              </tr>
              <tr>
                <td>Vento atual</td>
                <td>{response.vento_atual} km/h</td>
              </tr>
              <tr>
                <td>Máxima hoje</td>
                <td>{response.maxima_hoje} °C</td>
              </tr>
              <tr>
                <td>Mínima hoje</td>
                <td>{response.minima_hoje} °C</td>
              </tr>
              <tr>
                <td>Precipitação acumulada hoje</td>
                <td>{response.precipitacao_hoje} mm</td>
              </tr>
              <tr>
                <td>Descrição</td>
                <td className="descricao">{response.descricao}</td>
              </tr>
            </tbody>
          </table>
      </div>




    </div>
    </>
  )
}

export default App
