import "./ModulePage.css";

function ModulePage({
  title,
  description,
  children,
}) {
  return (
    <div className="module-page">

      <div className="module-page__header">
        <div>
          <h1>{title}</h1>

          <p>{description}</p>
        </div>
      </div>

      <div className="module-page__content">
        {children || (
          <div className="module-page__empty">
            <span>Módulo conectado correctamente</span>

            <strong>
              Aquí construiremos {title}
            </strong>

            <p>
              La sección ya forma parte del sistema.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

export default ModulePage;