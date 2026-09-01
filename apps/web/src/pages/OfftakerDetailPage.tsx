import { useParams, Link, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useOfftaker } from "../hooks/useOfftakers";
import { FarmerProfileAvatar } from "../components/FarmerProfileAvatar";

function display(value: string | null | undefined): string {
  if (!value || value.trim() === "") return "—";
  return value;
}

export function OfftakerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { offtaker, loading, error } = useOfftaker(id ?? "");

  if (loading) {
    return <main className="main p-xl text-center">Loading offtaker details…</main>;
  }

  if (error || !offtaker) {
    return (
      <main className="main p-xl text-center">
        <h2>Offtaker not found</h2>
        <p className="muted">{error?.message || "This offtaker may have been removed or does not exist."}</p>
        <button className="btn btn-outline mt-md" onClick={() => navigate("/offtakers")}>
          Back to list
        </button>
      </main>
    );
  }

  return (
    <main className="main main--wide farmer-detail">
      <BackButton to="/offtakers" />

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <FarmerProfileAvatar name={offtaker.company_name} />
          <div>
            <h2>{offtaker.company_name}</h2>
            <p className="muted">{offtaker.delivery_location || "—"}</p>
            <p className="farmer-detail__id">
              <span className="muted">Ref</span>{" "}
              <span className="reference-id">{offtaker.reference_id || offtaker.id}</span>
            </p>
          </div>
        </div>
        <Link to={`/offtakers/${offtaker.id}/edit`} className="btn btn-secondary">
          Edit Offtaker
        </Link>
      </div>

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Profile</h3>
        <dl className="detail-grid">
          <div className="detail-grid__item">
            <dt>Company Name</dt>
            <dd>{offtaker.company_name}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Name of Contact Person</dt>
            <dd>{display(offtaker.contact_person)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Contact / Phone</dt>
            <dd>{display(offtaker.contact)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Official Email</dt>
            <dd>{display(offtaker.official_email)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Designation</dt>
            <dd>{display(offtaker.designation)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Delivery Location</dt>
            <dd>{display(offtaker.delivery_location)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Payment Terms</dt>
            <dd>{display(offtaker.payment_terms)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Target Products</dt>
            <dd>{offtaker.target_products && offtaker.target_products.length > 0 ? offtaker.target_products.join(", ") : "—"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
