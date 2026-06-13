import type { PackagePlan } from "@/lib/packages";
import { PACKAGES } from "@/lib/packages";

interface PricingCardsProps {
  onSelect: (planId: PackagePlan["id"]) => void;
}

export function PricingCards({ onSelect }: PricingCardsProps) {
  return (
    <div className="pricing-grid">
      {PACKAGES.map((pkg) => (
        <article
          key={pkg.id}
          className={`pricing-card${pkg.featured ? " featured" : ""}`}
        >
          {pkg.badge ? <span className="pricing-badge">{pkg.badge}</span> : null}
          <div className={`pricing-tier ${pkg.id}`}>{pkg.name}</div>
          <div className="pricing-period">{pkg.period}</div>
          <div className="pricing-amount">
            {pkg.priceDisplay} <span>تومان</span>
          </div>
          <ul className="pricing-features">
            {pkg.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
            {pkg.mutedFeatures?.map((feature) => (
              <li key={feature} className="muted">
                {feature}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`btn ${pkg.featured ? "btn-primary" : "btn-ghost"}`}
            onClick={() => onSelect(pkg.id)}
          >
            انتخاب {pkg.name}
          </button>
        </article>
      ))}
    </div>
  );
}
