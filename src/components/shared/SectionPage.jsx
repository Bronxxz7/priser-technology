import "./SectionPage.css";

function SectionPage({ title, description }) {
  return (
    <section className="section-page">
      <div className="section-page__card">
        <span className="section-page__label">
          Módulo del sistema
        </span>

        <h1>{title}</h1>

        <p>{description}</p>
      </div>
    </section>
  );
}

export default SectionPage;