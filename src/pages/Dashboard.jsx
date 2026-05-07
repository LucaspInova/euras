import SidebarLayout from '../components/SidebarLayout'

export default function Dashboard() {
  const monthlyStudentsBars = [610, 780, 940, 760, 640, 790, 880, 920, 970, 1010, 1080, 1130]
  const monthlySentBars = [700, 850, 1020, 880, 740, 820, 980, 1040, 1110, 1170, 1240, 1320]
  const monthLabels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

  const topProducts = [
    ['Feijoada Bom Sabor 33%', 'Restaurante Bom Sabor', '214'],
    ['Hamburguer da Casa 50%', 'Restaurante Bom Sabor', '198'],
    ['Bolsa 50%', 'Ceeds Cursos', '194'],
    ['Corte Social', 'Roberto Barbearia', '176'],
    ['Sombrancelha', 'Roberto Barbearia', '162'],
    ['Barba', 'Roberto Barbearia', '155'],
    ['Hidratação', 'Roberto Barbearia', '142'],
    ['Pilates Mensal', 'Studio D', '138'],
    ['Consulta Básica', 'Odonto Center', '131'],
    ['Kit Material Escolar', 'Ceeds Maracanaú', '122'],
    ['Limpeza de Pele', 'Studio D', '119'],
    ['Avaliação Física', 'Centro Fit+', '113'],
    ['Plano Inglês Básico', 'Ceeds Fortaleza', '108'],
    ['Curso de Informática', 'Ceeds Maracanaú', '102'],
    ['Exame de Vista', 'Ótica Brasil', '98'],
  ]

  return (
    <SidebarLayout title="Tela Inicial">
      <div className="metrics-grid">
        <article className="metric-card">
          <h3>Euras ativas</h3>
          <p>
            <span className="metric-gold">&lt;</span> 2.034<span className="small-number">,00</span>
          </p>
        </article>
        <article className="metric-card">
          <h3>Alunos cadastrados</h3>
          <p>14.362</p>
        </article>
        <article className="metric-card">
          <h3>Avaliação do app</h3>
          <p>
            <span className="metric-gold">*</span> 8,9
          </p>
        </article>
      </div>

      <div className="middle-grid">
        <article className="panel-card bar-chart-card">
          <div className="chart-header">
            <h3>Euras por mes</h3>
            <div className="legend">
              <span className="legend-item">
                <span className="legend-dot gold"></span>
                Usadas por alunos
              </span>
              <span className="legend-item">
                <span className="legend-dot black"></span>
                Enviadas aos alunos
              </span>
            </div>
          </div>

          <div className="bars-wrapper">
            <div className="y-scale">
              <span>1000</span>
              <span>800</span>
              <span>600</span>
              <span>400</span>
            </div>
            <div className="bars-grid">
              {monthLabels.map((month, index) => (
                <div className="bar-group" key={month}>
                  <div className="bar-track">
                    <span
                      className="bar gold"
                      style={{ height: `${(monthlyStudentsBars[index] / 1320) * 100}%` }}
                    ></span>
                    <span
                      className="bar black"
                      style={{ height: `${(monthlySentBars[index] / 1320) * 100}%` }}
                    ></span>
                  </div>
                  <span className="bar-label">{month}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel-card donut-card">
          <h3>Percentual de alunos que usaram Euras</h3>
          <div className="donut-shell" aria-label="78 por cento">
            <div className="donut-hole">78%</div>
          </div>
          <p>22% dos alunos ainda não resgataram nenhum produto usando Euras</p>
        </article>
      </div>

      <article className="panel-card table-card">
        <h3>Produtos em alta</h3>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Produto</th>
              <th>Parceiro</th>
              <th>Resgates</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map(([product, partner, redemptions], index) => (
              <tr key={`${product}-${partner}-${index}`}>
                <td>{index + 1}</td>
                <td>{product}</td>
                <td>{partner}</td>
                <td>{redemptions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </SidebarLayout>
  )
}
