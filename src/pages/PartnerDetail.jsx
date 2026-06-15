import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import {
  createPartnerProduct,
  getPartnerApiErrorMessage,
  listPartnerProducts,
  removePartner,
  removePartnerProduct,
  updatePartner,
  updatePartnerProduct,
} from "../lib/partnersApi";
import { useModalDismiss } from "../hooks/useModalDismiss";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12H6.5M11.5 6 5 12l6.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 8l8 8M16 8l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 17.5V21h3.5L19.85 9.65l-3.5-3.5L5 17.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.75 4.75 19.25 9.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

function PartnerLogo({ label, variant }) {
  if (variant === "black") {
    return <div className="partner-logo partner-logo-black">{label}</div>;
  }

  if (variant === "blue") {
    return <div className="partner-logo partner-logo-blue">{label}</div>;
  }

  return <div className="partner-logo partner-logo-light">{label}</div>;
}

function formatTime(item) {
  if (!item?.open) {
    return "Fechado";
  }

  return `${item.openHour}:${item.openMinute} - ${item.closeHour}:${item.closeMinute}`;
}

function formatPrice(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `R$ ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(new Error("Não foi possível processar a imagem selecionada."));

    reader.readAsDataURL(file);
  });
}

export default function PartnerDetail() {
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const fileInputRef = useRef(null);
  const [partner, setPartner] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isProductSaving, setIsProductSaving] = useState(false);
  const [isProductRemoving, setIsProductRemoving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editProductForm, setEditProductForm] = useState(null);
  const [editProductError, setEditProductError] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priceEuras: "",
    imageUrl: "",
  });
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const searchTerm = productSearch.trim().toLowerCase();

    if (!searchTerm) {
      return products;
    }

    return products.filter((product) =>
      String(product.name ?? "")
        .toLowerCase()
        .includes(searchTerm),
    );
  }, [products, productSearch]);

  const isBusy = isSaving || isProductSaving || isProductRemoving;

  const closeEditModal = () => {
    if (isBusy) return;
    setShowEditModal(false);
  };

  const closeCreateModal = () => {
    if (isBusy) return;
    setShowCreateModal(false);
  };

  const closeDeleteModal = () => {
    if (isSaving) return;
    setShowDeleteModal(false);
  };

  const closeEditProductModal = () => {
    if (isBusy) return;
    setEditProductForm(null);
    setEditProductError("");
  };

  useModalDismiss(showEditModal, closeEditModal, isBusy);
  useModalDismiss(showCreateModal, closeCreateModal, isBusy);
  useModalDismiss(showDeleteModal, closeDeleteModal, isSaving);
  useModalDismiss(Boolean(editProductForm), closeEditProductModal, isBusy);

  useEffect(() => {
    let active = true;

    async function loadPartner() {
      setLoading(true);
      setLoadError("");

      try {
        const payload = await listPartnerProducts(partnerId);
        if (!active) return;

        setPartner(payload.partner);
        setProducts(payload.products ?? []);
      } catch (error) {
        if (!active) return;
        console.info("Falha ao carregar detalhes do parceiro.", error);
        setLoadError(getPartnerApiErrorMessage(error));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPartner();

    return () => {
      active = false;
    };
  }, [partnerId]);

  if (!loading && !loadError && !partner) {
    return <Navigate to="/parceiros" replace />;
  }

  const handleOpenEditModal = () => {
    if (!partner) return;
    setFormError("");
    setEditForm({
      institution: partner.name ?? "",
      user: partner.user ?? "",
      phone: partner.phone ?? "",
      email: partner.email ?? "",
      campus: partner.campus ?? "",
      imageUrl: partner.imageUrl ?? "",
      schedule: partner.schedule ?? {
        week: {
          open: true,
          openHour: "06",
          openMinute: "00",
          closeHour: "18",
          closeMinute: "00",
        },
        saturday: {
          open: true,
          openHour: "08",
          openMinute: "00",
          closeHour: "13",
          closeMinute: "00",
        },
        sunday: {
          open: false,
          openHour: "00",
          openMinute: "00",
          closeHour: "00",
          closeMinute: "00",
        },
      },
    });
    setShowEditModal(true);
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleScheduleToggle = (key, open) => {
    setEditForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [key]: { ...current.schedule[key], open },
      },
    }));
  };

  const handleTimeChange = (key, field, value) => {
    setEditForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [key]: { ...current.schedule[key], [field]: value.slice(0, 2) },
      },
    }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setFormError("A imagem deve ter no máximo 2MB.");
      return;
    }

    try {
      const imageDataUrl = await fileToDataUrl(selectedFile);
      setEditForm((current) => ({ ...current, imageUrl: imageDataUrl }));
    } catch (error) {
      setFormError(error.message);
    }
  };

  const reloadPartnerData = async () => {
    try {
      const payload = await listPartnerProducts(partnerId);
      setPartner(payload.partner);
      setProducts(payload.products ?? []);
    } catch (error) {
      console.info("Falha ao atualizar produtos do parceiro.", error);
    }
  };

  const handleSavePartner = async () => {
    if (!editForm) return;

    setIsSaving(true);
    setFormError("");

    try {
      await updatePartner(partnerId, {
        name: editForm.institution.trim(),
        user: editForm.user.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        campus: editForm.campus.trim(),
        imageUrl: editForm.imageUrl?.trim() ?? "",
        schedule: editForm.schedule,
      });

      setPartner((current) =>
        current
          ? {
              ...current,
              name: editForm.institution.trim(),
              user: editForm.user.trim(),
              phone: editForm.phone.trim(),
              email: editForm.email.trim(),
              campus: editForm.campus.trim(),
              imageUrl: editForm.imageUrl?.trim() ?? current.imageUrl,
              schedule: editForm.schedule,
            }
          : current,
      );
      setShowEditModal(false);
    } catch (error) {
      console.info("Falha ao salvar parceiro.", error);
      setFormError(getPartnerApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFormChange = (field) => (event) => {
    setCreateForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleOpenProductEditModal = (product) => {
    setFormError("");
    setEditProductError("");
    setEditProductForm({
      id: product.id,
      title: product.name ?? "",
      description: product.description ?? "",
      priceEuras: String(product.priceEuras ?? ""),
      imageUrl: product.imageUrl ?? "",
    });
  };

  const handleEditProductChange = (field) => (event) => {
    setEditProductForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSaveProduct = async () => {
    if (!editProductForm) return;

    if (!editProductForm.title.trim()) {
      setEditProductError("Informe o título do produto.");
      return;
    }

    if (!editProductForm.priceEuras.trim()) {
      setEditProductError("Informe o valor em Euras.");
      return;
    }

    setIsProductSaving(true);
    setEditProductError("");

    try {
      await updatePartnerProduct(partnerId, editProductForm.id, {
        title: editProductForm.title.trim(),
        description: editProductForm.description.trim(),
        priceEuras: editProductForm.priceEuras.trim(),
        imageUrl: editProductForm.imageUrl.trim(),
      });

      await reloadPartnerData();
      setEditProductForm(null);
    } catch (error) {
      setEditProductError(getPartnerApiErrorMessage(error));
    } finally {
      setIsProductSaving(false);
    }
  };

  const handleRemoveProduct = async () => {
    if (!editProductForm) return;

    setIsProductRemoving(true);
    setEditProductError("");

    try {
      await removePartnerProduct(partnerId, editProductForm.id);
      await reloadPartnerData();
      setEditProductForm(null);
    } catch (error) {
      setEditProductError(getPartnerApiErrorMessage(error));
    } finally {
      setIsProductRemoving(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!createForm.title.trim()) {
      setFormError("Informe o título do produto.");
      return;
    }

    if (!createForm.priceEuras.trim()) {
      setFormError("Informe o valor em Euras.");
      return;
    }

    setIsProductSaving(true);
    setFormError("");

    try {
      await createPartnerProduct(partnerId, {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        priceEuras: createForm.priceEuras.trim(),
        imageUrl: createForm.imageUrl.trim(),
      });

      await reloadPartnerData();
      setCreateForm({
        title: "",
        description: "",
        priceEuras: "",
        imageUrl: "",
      });
      setShowCreateModal(false);
    } catch (error) {
      console.info("Falha ao criar produto.", error);
      setFormError(getPartnerApiErrorMessage(error));
    } finally {
      setIsProductSaving(false);
    }
  };

  const handleRemovePartner = async () => {
    setIsSaving(true);
    setFormError("");

    try {
      await removePartner(partnerId);
      navigate("/parceiros", { replace: true });
    } catch (error) {
      console.info("Falha ao remover parceiro.", error);
      setFormError(getPartnerApiErrorMessage(error));
      setIsSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <section className="partner-detail-page">
        <div className="partner-detail-header">
          <div>
            <p className="partner-detail-label">Controle parceiro</p>
            <h1 className="partner-detail-title">
              {partner?.name ?? "Parceiro"}
            </h1>
          </div>

          <div className="partner-detail-actions">
            <button
              type="button"
              className="student-back-button"
              aria-label="Voltar para parceiros"
              onClick={() => navigate("/parceiros")}
            >
              <BackIcon />
            </button>
            <button
              type="button"
              className="partner-action-button partner-action-button-secondary"
              onClick={handleOpenEditModal}
              disabled={loading || !partner}
            >
              <EditIcon />
              <span>Editar</span>
            </button>
            <button
              type="button"
              className="partner-action-button partner-action-button-danger"
              onClick={() => {
                setFormError("");
                setShowDeleteModal(true);
              }}
              disabled={loading || !partner}
            >
              <RemoveIcon />
              <span>Remover</span>
            </button>
          </div>
        </div>

        {loading ? (
          <p className="form-message">Carregando parceiro...</p>
        ) : null}
        {loadError ? (
          <p className="form-message form-message-error">{loadError}</p>
        ) : null}
        {formError ? (
          <p className="form-message form-message-error">{formError}</p>
        ) : null}

        {!loading && partner ? (
          <>
            <section className="partner-summary-card">
              <div className="partner-summary-grid">
                <div className="partner-summary-info">
                  <div className="partner-status-row">
                    <span
                      className={`partner-status-chip ${partner.active ? "partner-status-active" : "partner-status-inactive"}`}
                    >
                      {partner.active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="partner-summary-campus">
                      {partner.campus}
                    </span>
                  </div>

                  <div className="partner-info-row">
                    <span className="partner-info-label">Responsável</span>
                    <span className="partner-info-value">
                      {partner.user || "—"}
                    </span>
                  </div>

                  <div className="partner-info-row">
                    <span className="partner-info-label">Telefone</span>
                    <span className="partner-info-value">
                      {partner.phone || "—"}
                    </span>
                  </div>

                  <div className="partner-info-row">
                    <span className="partner-info-label">E-mail</span>
                    <span className="partner-info-value">
                      {partner.email || "—"}
                    </span>
                  </div>

                  <div className="partner-info-row partner-info-schedule">
                    <span className="partner-info-label">Horário</span>
                    <div className="partner-schedule-grid">
                      <div>
                        <span className="partner-schedule-day">SEG - SEX</span>
                        <span>{formatTime(partner.schedule?.week)}</span>
                      </div>
                      <div>
                        <span className="partner-schedule-day">SAB</span>
                        <span>{formatTime(partner.schedule?.saturday)}</span>
                      </div>
                      <div>
                        <span className="partner-schedule-day">DOM</span>
                        <span>{formatTime(partner.schedule?.sunday)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="partner-summary-photo">
                  {partner.imageUrl ? (
                    <img
                      src={partner.imageUrl}
                      alt={partner.name}
                      className="partner-summary-image"
                    />
                  ) : (
                    <PartnerLogo
                      label={partner.logo}
                      variant={partner.variant}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="partner-products-section">
              <div className="partner-section-header partner-products-toolbar">
                <div>
                  <h2 className="partner-section-label">Lista de produtos</h2>
                </div>
                <div className="partner-filter-row">
                  <label className="partner-search-box">
                    <SearchIcon />
                    <input
                      type="search"
                      placeholder="Buscar produto"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="partners-add-button partner-detail-create-button"
                    onClick={() => {
                      setFormError("");
                      setShowCreateModal(true);
                    }}
                  >
                    <PlusIcon />
                    <span>Cadastrar produto</span>
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="students-empty-state">
                  Nenhum produto encontrado.
                </div>
              ) : (
                <div className="product-grid partner-detail-product-grid">
                  {filteredProducts.map((product) => (
                    <article
                      key={product.id}
                      className="product-card partner-product-card"
                    >
                      <button
                        type="button"
                        className="product-card-logo product-card-link"
                        onClick={() => handleOpenProductEditModal(product)}
                      >
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="product-card-image"
                          />
                        ) : (
                          <div className="product-card-logo">
                            <span>
                              {product.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </button>

                      <div className="product-card-body">
                        <strong>{product.name}</strong>
                        {product.description ? (
                          <p className="product-card-description">
                            {product.description}
                          </p>
                        ) : null}
                        <div className="product-card-meta">
                          <span className="product-card-price">
                            <span>{formatPrice(product.priceEuras)}</span>
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        {showEditModal ? (
          <div
            className="partner-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeEditModal();
            }}
          >
            <div
              className="partner-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Editar parceiro"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="partner-modal-close"
                aria-label="Fechar"
                onClick={closeEditModal}
              >
                <CloseIcon />
              </button>
              <div className="partner-modal-header">
                <p className="partner-modal-label">Editar parceiro</p>
                <h2 className="partner-modal-title">Atualize as informações</h2>
              </div>
              <div className="partner-create-card partner-form-card">
                <div className="partner-create-grid">
                  <div className="partner-create-column">
                    <label className="partner-field">
                      <span>Nome da instituição</span>
                      <input
                        type="text"
                        value={editForm?.institution ?? ""}
                        onChange={handleEditChange("institution")}
                      />
                    </label>
                    <label className="partner-field">
                      <span>Usuário</span>
                      <input
                        type="text"
                        value={editForm?.user ?? ""}
                        onChange={handleEditChange("user")}
                      />
                    </label>
                    <label className="partner-field">
                      <span>Número</span>
                      <input
                        type="text"
                        value={editForm?.phone ?? ""}
                        onChange={handleEditChange("phone")}
                      />
                    </label>
                    <label className="partner-field">
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={editForm?.email ?? ""}
                        onChange={handleEditChange("email")}
                      />
                    </label>
                  </div>
                  <div className="partner-create-column">
                    <div className="partner-photo-box">
                      <span>Foto do parceiro</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handlePhotoChange}
                      />
                      <button
                        type="button"
                        className="partner-photo-button"
                        onClick={handlePhotoClick}
                      >
                        {editForm?.imageUrl ? (
                          <img
                            src={editForm.imageUrl}
                            alt="Pré-visualização"
                            className="partner-photo-preview"
                          />
                        ) : (
                          <PartnerLogo
                            label={partner.logo}
                            variant={partner.variant}
                          />
                        )}
                        <p>Alterar imagem</p>
                      </button>
                    </div>
                    <label className="partner-field">
                      <span>Campus</span>
                      <input
                        type="text"
                        value={editForm?.campus ?? ""}
                        onChange={handleEditChange("campus")}
                      />
                    </label>
                  </div>
                </div>
                <div className="partner-hours-box partner-edit-schedule">
                  <h2>Horário de funcionamento</h2>
                  <div className="partner-schedule-grid partner-schedule-edit-grid">
                    {["week", "saturday", "sunday"].map((key) => {
                      const label =
                        key === "week"
                          ? "SEG - SEX"
                          : key === "saturday"
                            ? "SAB"
                            : "DOM";
                      const item = editForm?.schedule?.[key] ?? {};
                      return (
                        <div key={key} className="partner-time-panel">
                          <div className="partner-time-header">
                            <span className="partner-day">{label}</span>
                            <div className="partner-status-switch">
                              <button
                                type="button"
                                className={
                                  item.open
                                    ? "partner-status-button partner-status-button-active"
                                    : "partner-status-button"
                                }
                                onClick={() => handleScheduleToggle(key, true)}
                              >
                                ABERTO
                              </button>
                              <button
                                type="button"
                                className={
                                  !item.open
                                    ? "partner-status-button partner-status-button-active"
                                    : "partner-status-button"
                                }
                                onClick={() => handleScheduleToggle(key, false)}
                              >
                                FECHADO
                              </button>
                            </div>
                          </div>
                          {item.open ? (
                            <div className="partner-time-range">
                              <input
                                type="text"
                                value={item.openHour}
                                onChange={(event) =>
                                  handleTimeChange(
                                    key,
                                    "openHour",
                                    event.target.value,
                                  )
                                }
                                className="partner-time-input"
                              />
                              <input
                                type="text"
                                value={item.openMinute}
                                onChange={(event) =>
                                  handleTimeChange(
                                    key,
                                    "openMinute",
                                    event.target.value,
                                  )
                                }
                                className="partner-time-input"
                              />
                              <span>-</span>
                              <input
                                type="text"
                                value={item.closeHour}
                                onChange={(event) =>
                                  handleTimeChange(
                                    key,
                                    "closeHour",
                                    event.target.value,
                                  )
                                }
                                className="partner-time-input"
                              />
                              <input
                                type="text"
                                value={item.closeMinute}
                                onChange={(event) =>
                                  handleTimeChange(
                                    key,
                                    "closeMinute",
                                    event.target.value,
                                  )
                                }
                                className="partner-time-input"
                              />
                            </div>
                          ) : (
                            <span className="partner-time-pill">FECHADO</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="partner-modal-actions">
                <button
                  type="button"
                  className="student-submit-button"
                  onClick={handleSavePartner}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showCreateModal ? (
          <div
            className="partner-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeCreateModal();
            }}
          >
            <div
              className="partner-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Cadastrar produto"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="partner-modal-close"
                aria-label="Fechar"
                onClick={closeCreateModal}
              >
                <CloseIcon />
              </button>
              <div className="partner-modal-header">
                <p className="partner-modal-label">Cadastrar produto</p>
                <h2 className="partner-modal-title">
                  Novo produto do parceiro
                </h2>
              </div>
              <div className="partner-create-card partner-form-card">
                <div className="partner-create-grid partner-product-create-grid">
                  <div className="partner-create-column">
                    <label className="partner-field">
                      <span>Título</span>
                      <input
                        type="text"
                        value={createForm.title}
                        onChange={handleCreateFormChange("title")}
                      />
                    </label>
                    <label className="partner-field">
                      <span>Descrição</span>
                      <input
                        type="text"
                        value={createForm.description}
                        onChange={handleCreateFormChange("description")}
                      />
                    </label>
                  </div>
                  <div className="partner-create-column">
                    <label className="partner-field">
                      <span>Preço em Euras</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={createForm.priceEuras}
                        onChange={handleCreateFormChange("priceEuras")}
                      />
                    </label>
                    <label className="partner-field">
                      <span>URL da imagem (opcional)</span>
                      <input
                        type="text"
                        value={createForm.imageUrl}
                        onChange={handleCreateFormChange("imageUrl")}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="partner-modal-actions">
                <button
                  type="button"
                  className="student-submit-button"
                  onClick={handleCreateProduct}
                  disabled={isProductSaving}
                >
                  {isProductSaving ? "Salvando..." : "Cadastrar produto"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editProductForm ? (
          <div
            className="partner-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeEditProductModal();
            }}
          >
            <div
              className="partner-modal partner-product-edit-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Editar produto"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="partner-modal-close"
                aria-label="Fechar"
                onClick={closeEditProductModal}
              >
                <CloseIcon />
              </button>

              <div className="partner-modal-header">
                <p className="partner-modal-label">Editar produto</p>
                <h2 className="partner-modal-title">Atualize as informações</h2>
              </div>

              {editProductError ? (
                <p className="form-message form-message-error">{editProductError}</p>
              ) : null}

              <div className="partner-create-card partner-form-card partner-product-edit-card">
                <div className="partner-create-grid partner-product-create-grid">
                  <div className="partner-create-column">
                    <label className="partner-field">
                      <span>Título</span>
                      <input
                        type="text"
                        value={editProductForm.title}
                        onChange={handleEditProductChange("title")}
                      />
                    </label>

                    <label className="partner-field">
                      <span>Descrição</span>
                      <input
                        type="text"
                        value={editProductForm.description}
                        onChange={handleEditProductChange("description")}
                      />
                    </label>
                  </div>

                  <div className="partner-create-column">
                    <label className="partner-field">
                      <span>Preço em Euras</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editProductForm.priceEuras}
                        onChange={handleEditProductChange("priceEuras")}
                      />
                    </label>

                    <label className="partner-field">
                      <span>URL da imagem (opcional)</span>
                      <input
                        type="text"
                        value={editProductForm.imageUrl}
                        onChange={handleEditProductChange("imageUrl")}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="partner-modal-actions partner-modal-actions-split">
                <button
                  type="button"
                  className="student-remove-button partner-product-modal-remove"
                  onClick={handleRemoveProduct}
                  disabled={isProductSaving || isProductRemoving}
                >
                  <span>{isProductRemoving ? "Removendo..." : "Remover produto"}</span>
                  <span className="student-remove-icon">
                    <RemoveIcon />
                  </span>
                </button>

                <button
                  type="button"
                  className="student-submit-button"
                  onClick={handleSaveProduct}
                  disabled={isProductSaving || isProductRemoving}
                >
                  {isProductSaving ? "Salvando..." : "Salvar produto"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showDeleteModal ? (
          <div
            className="student-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDeleteModal();
            }}
          >
            <div
              className="student-remove-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Remover parceiro"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="student-modal-close"
                aria-label="Fechar aviso de remoção"
                onClick={closeDeleteModal}
              >
                <CloseIcon />
              </button>

              <p>Tem certeza de que deseja remover este parceiro?</p>
              {formError ? (
                <p className="student-modal-error">{formError}</p>
              ) : null}
              <button
                type="button"
                className="student-modal-confirm"
                onClick={handleRemovePartner}
                disabled={isSaving}
              >
                {isSaving ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </SidebarLayout>
  );
}
