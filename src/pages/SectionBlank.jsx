import SidebarLayout from '../components/SidebarLayout'

export default function SectionBlank({ title }) {
  return (
    <SidebarLayout title={title}>
      <section className="blank-section-card" aria-label={`Area ${title}`}>
        <div className="blank-section-surface"></div>
      </section>
    </SidebarLayout>
  )
}
