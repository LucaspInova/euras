import SidebarLayout from '../components/SidebarLayout'

export default function Dashboard() {
  const monthlyStudentsBars = [500, 780, 940, 760, 640, 790, 480, 0, 0, 0, 0, 0]
  const monthlySentBars = [560, 850, 1020, 880, 740, 680, 920, 0, 0, 0, 0, 0]
  const monthLabels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

  const topProducts = [
    ['Feijoada Bom Sabor 33%', 'Restaurante Bom Sabor', '74'],
    ['Hamburguer da Casa 50%', 'Restaurante Bom Sabor', '62'],
    ['Bolsa 50%', 'Ceeds Cursos', '60'],
    ['Corte Social', 'Roberto Barbearia', '51'],
    ['Sombrancelha', 'Roberto Barbearia', '33'],
    ['Barba', 'Roberto Barbearia', '27'],
    ['Hidratacao', 'Roberto Barbearia', '11'],
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
          <p>1.033</p>
        </article>
        <article className="metric-card">
          <h3>Avaliacao do app</h3>
          <p>
            <span className="metric-gold">★</span> 8,7
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
                      style={{ height: `${(monthlyStudentsBars[index] / 1050) * 100}%` }}
                    ></span>
                    <span
                      className="bar black"
                      style={{ height: `${(monthlySentBars[index] / 1050) * 100}%` }}
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
          <div className="donut-shell" aria-label="60 por cento">
            <div className="donut-hole">60%</div>
          </div>
          <p>40% dos alunos ainda nao resgataram nenhum produto usando Euras</p>
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
              <tr key={product}>
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
