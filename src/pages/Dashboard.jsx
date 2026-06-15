import SidebarLayout from '../components/SidebarLayout'

const LOOKER_REPORT_URL =
  'https://datastudio.google.com/embed/reporting/2887887a-2837-4995-9edf-61c92687e5a8/page/o2L1F'

export default function Dashboard() {
  return (
    <SidebarLayout title="Tela Inicial">
      <div className="looker-report-shell">
        <iframe
          title="Relatorio Looker Studio"
          src={LOOKER_REPORT_URL}
          className="looker-report-frame"
          frameBorder="0"
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </SidebarLayout>
  )
}
