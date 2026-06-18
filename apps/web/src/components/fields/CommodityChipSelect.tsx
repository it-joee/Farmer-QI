import { COMMODITIES, OTHER_COMMODITY_OPTION } from "@farmeriq/shared";

interface CommodityChipSelectProps {
  selected: string[];
  onToggle: (commodity: string) => void;
  otherEnabled: boolean;
  onToggleOther: (enabled: boolean) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
}

export function CommodityChipSelect({
  selected,
  onToggle,
  otherEnabled,
  onToggleOther,
  otherValue,
  onOtherChange,
}: CommodityChipSelectProps) {
  return (
    <div className="commodity-chips">
      <div className="commodity-chips__list" role="group" aria-label="Commodities grown">
        {COMMODITIES.map((commodity) => {
          const isSelected = selected.includes(commodity);
          return (
            <button
              key={commodity}
              type="button"
              className={`commodity-chip${isSelected ? " commodity-chip--selected" : ""}`}
              aria-pressed={isSelected}
              onClick={() => onToggle(commodity)}
            >
              {commodity}
            </button>
          );
        })}
        <button
          type="button"
          className={`commodity-chip${otherEnabled ? " commodity-chip--selected" : ""}`}
          aria-pressed={otherEnabled}
          onClick={() => onToggleOther(!otherEnabled)}
        >
          {OTHER_COMMODITY_OPTION}
        </button>
      </div>
      {otherEnabled && (
        <div className="commodity-chips__other">
          <label htmlFor="other_commodity" className="sr-only">
            Other commodity
          </label>
          <input
            id="other_commodity"
            placeholder="Enter commodity name"
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
          />
          <p className="field-hint">Add one or more commodities not listed above. Separate with commas.</p>
        </div>
      )}
    </div>
  );
}
