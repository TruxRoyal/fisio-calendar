import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './shared/components/Layout/Layout'
import { VistaSemanal } from './features/calendario/components/VistaSemanal/VistaSemanal'
import { PaginaPacientes } from './features/pacientes/components/PaginaPacientes/PaginaPacientes'
import { ResumenMensual } from './features/resumen/components/ResumenMensual/ResumenMensual'
import { PaginaMapa } from './features/mapa/components/PaginaMapa/PaginaMapa'
import { PaginaAjustes } from './shared/components/PaginaAjustes/PaginaAjustes'
import { BannerInstalarPwa } from './shared/components/BannerInstalarPwa/BannerInstalarPwa'

export function App() {
  return (
    <Router>
      <BannerInstalarPwa />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/calendario" replace />} />
          <Route path="/calendario" element={<VistaSemanal />} />
          <Route path="/pacientes" element={<PaginaPacientes />} />
          <Route path="/resumen" element={<ResumenMensual />} />
          <Route path="/mapa" element={<PaginaMapa />} />
          <Route path="/ajustes" element={<PaginaAjustes />} />
        </Routes>
      </Layout>
    </Router>
  )
}
