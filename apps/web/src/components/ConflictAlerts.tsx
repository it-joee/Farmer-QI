import type { ConflictFlag } from "@farmeriq/shared";
import { Link } from "react-router-dom";
import { canResolveConflicts } from "../auth";
import { useAuthUser } from "../hooks/useAuth";
import { ConflictResolveActions } from "./ConflictResolveActions";

interface ConflictAlertsProps {
  conflicts: ConflictFlag[];
  onResolved?: () => void;
}

function conflictMessage(flag: ConflictFlag): string {
  const details = flag.details;

  if (flag.flag_type === "duplicate_ghana_card") {
    const name = details.matching_farmer_name as string | undefined;
    const card = details.ghana_card as string | undefined;
    return name
      ? `Ghana Card ${card ?? ""} may already belong to ${name}.`
      : "This Ghana Card may already be registered to another farmer.";
  }

  if (flag.flag_type === "duplicate_profile") {
    const name = details.matching_farmer_name as string | undefined;
    const community = details.community as string | undefined;
    const phone = details.phone as string | undefined;
    if (name) {
      return `Name, community, and phone match another farmer (${name}${community ? `, ${community}` : ""}${phone ? `, ${phone}` : ""}).`;
    }
    return "Name, community, and phone match another registered farmer.";
  }

  if (flag.flag_type === "boundary_overlap") {
    const name = details.overlapping_farmer_name as string | undefined;
    return name
      ? `Farm boundary overlaps with a plot registered to ${name}.`
      : "Farm boundary overlaps with another registered plot.";
  }

  return "This record needs review.";
}

export function ConflictAlerts({ conflicts, onResolved }: ConflictAlertsProps) {
  const user = useAuthUser();
  const openConflicts = conflicts.filter((flag) => flag.status === "open");

  if (openConflicts.length === 0) return null;

  const showResolve = user ? canResolveConflicts(user) : false;

  return (
    <section className="card conflict-alerts">
      <h3 className="card-title">Flags for review</h3>
      <p className="card-desc">Automated checks found possible duplicates or overlaps.</p>
      <ul className="conflict-alerts__list">
        {openConflicts.map((flag) => {
          const matchId =
            flag.flag_type === "duplicate_ghana_card" || flag.flag_type === "duplicate_profile"
              ? (flag.details.matching_farmer_id as string | undefined)
              : (flag.details.overlapping_farmer_id as string | undefined);

          return (
            <li key={flag.id} className="conflict-alerts__item">
              <span className="conflict-alerts__badge">Review</span>
              <span>{conflictMessage(flag)}</span>
              {matchId && (
                <Link to={`/farmers/${matchId}`} className="link-btn">
                  View other record
                </Link>
              )}
              {showResolve && onResolved && (
                <ConflictResolveActions conflictId={flag.id} onResolved={onResolved} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
