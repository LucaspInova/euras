import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import {
  getPartnerApiErrorMessage,
  listPartners,
  setPartnerActivation,
} from "../lib/partnersApi";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="10.5"
        cy="10.5"
        r="5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m15.2 15.2 4.3 4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AddPartnerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3.8 8.4h16.4L18.9 5H5.1L3.8 8.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5 9.6v9.4h14V9.6H5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 12v5M9.5 14.5h5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PartnerLogo({ label, variant }) {
  if (variant === "black") {
    return <div className="partner-logo partner-logo-black">{label}</div>;
  }

  if (variant === "blue") {
    return <div className="partner-logo partner-logo-blue">{label}</div>;
  }

  return <div className="partner-logo partner-logo-light">{label}</div>;
}

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

export default function Partners() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingPartnerId, setTogglingPartnerId] = useState("");
  const [toggleMessage, setToggleMessage] = useState("");
  const [toggleError, setToggleError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoadingPartners(true);
      setLoadError("");

      try {
        const nextPartners = await listPartners();

        if (!active) return;
        setPartners(nextPartners);
      } catch (error) {
        if (!active) return;
        console.info("Falha ao carregar parceiros no banco.", error);
        setLoadError(getPartnerApiErrorMessage(error));
      } finally {
        if (active) {
          setLoadingPartners(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredPartners = useMemo(() => {
    const search = normalize(searchTerm.trim());

    if (!search) {
      return partners;
    }

    return partners.filter((partner) =>
      normalize(`${partner.name} ${partner.campus}`).includes(search),
    );
  }, [partners, searchTerm]);

  const activePartners = useMemo(
    () => filteredPartners.filter((partner) => partner.active),
    [filteredPartners],
  );

  const inactivePartners = useMemo(
    () => filteredPartners.filter((partner) => !partner.active),
    [filteredPartners],
  );

  const partnerCounts = useMemo(
    () => ({
      total: partners.length,
      active: partners.filter((partner) => partner.active).length,
      inactive: partners.filter((partner) => !partner.active).length,
    }),
    [partners],
  );

  const hasNoPartners = !loadingPartners && !loadError && partners.length === 0;

  async function handlePartnerActivationToggle(partner) {
    const nextActive = !partner.active;
    setTogglingPartnerId(partner.id);
    setToggleMessage("");
    setToggleError("");

    try {
      await setPartnerActivation(partner.id, nextActive);
      setPartners((currentPartners) =>
        currentPartners.map((currentPartner) =>
          currentPartner.id === partner.id
            ? { ...currentPartner, active: nextActive }
            : currentPartner,
        ),
      );
      setToggleMessage(
        `${partner.name} ${nextActive ? "ativado" : "desativado"} com sucesso.`,
      );
    } catch (error) {
      console.info("Falha ao atualizar status do parceiro.", error);
      setToggleError(getPartnerApiErrorMessage(error));
    } finally {
      setTogglingPartnerId("");
    }
  }

  function renderPartnerCard(partner) {
    const isToggling = togglingPartnerId === partner.id;
    const logoLabel = partner.group === "ceeds" ? "CEEDS" : partner.logo;
    const logoVariant = partner.group === "ceeds" ? "light" : partner.variant;

    const cardHeader = (
      <div className="partner-card-logo partner-card-header">
        {partner.imageUrl ? (
          <img
            src={partner.imageUrl}
            alt={partner.name}
            className="partner-card-image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <PartnerLogo label={logoLabel} variant={logoVariant} />
        )}
        <p>{partner.campus}</p>
      </div>
    );

    return (
      <article
        key={partner.id}
        className={`partner-card ${partner.active ? "partner-card-active" : "partner-card-inactive"}`}
      >
        {partner.active ? (
          <button
            type="button"
            className="partner-card-logo partner-card-link"
            onClick={() => {
              navigate(`/parceiros/${partner.id}`);
            }}
          >
            {cardHeader}
          </button>
        ) : (
          cardHeader
        )}

        <div className="partner-card-body">
          <strong>{partner.name}</strong>
          <div className="partner-card-status-row">
            <span
              className={`partner-status-chip ${
                partner.active
                  ? "partner-status-active"
                  : "partner-status-inactive"
              }`}
            >
              {partner.active ? "Ativo" : "Inativo"}
            </span>
            <button
              type="button"
              className={`partner-activation-toggle ${partner.active ? "is-active" : ""}`}
              role="switch"
              aria-checked={partner.active}
              aria-label={`${partner.active ? "Desativar" : "Ativar"} ${partner.name}`}
              disabled={isToggling}
              onClick={() => handlePartnerActivationToggle(partner)}
            >
              <span />
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <SidebarLayout>
      <section className="partners-page">
        <div className="partners-topbar">
          <h1 className="partners-heading">Parceiros</h1>

          <div className="partners-actions">
            <label className="partners-search" aria-label="Pesquisar parceiro">
              <span className="partners-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="partners-add-button"
              onClick={() => navigate("/parceiros/novo")}
            >
              <span className="partners-add-icon">
                <AddPartnerIcon />
              </span>
              <span>Adicionar parceiro</span>
            </button>
          </div>
        </div>

        <div className="partners-overview" aria-live="polite">
          <span>{partnerCounts.total} parceiros</span>
          <span>{partnerCounts.active} ativos</span>
          <span>{partnerCounts.inactive} inativos</span>
        </div>

        {toggleMessage ? (
          <p className="partners-feedback partners-feedback-success">
            {toggleMessage}
          </p>
        ) : null}
        {toggleError ? (
          <p className="partners-feedback partners-feedback-error">
            {toggleError}
          </p>
        ) : null}

        {loadingPartners ? (
          <div className="students-empty-state">Carregando parceiros...</div>
        ) : null}
        {loadError && !loadingPartners ? (
          <div className="students-empty-state">{loadError}</div>
        ) : null}
        {hasNoPartners ? (
          <div className="students-empty-state">
            Nenhum parceiro cadastrado.
          </div>
        ) : null}

        <section className="partners-group" aria-label="Parceiros ativos">
          <h2>Ativos</h2>
          <div className="partners-grid">
            {!loadingPartners && !loadError
              ? activePartners.map((partner) => renderPartnerCard(partner))
              : null}
          </div>
        </section>

        <section className="partners-group" aria-label="Parceiros inativos">
          <h2>Inativos</h2>
          <div className="partners-grid">
            {!loadingPartners && !loadError
              ? inactivePartners.map((partner) => renderPartnerCard(partner))
              : null}
          </div>
        </section>
      </section>
    </SidebarLayout>
  );
}
