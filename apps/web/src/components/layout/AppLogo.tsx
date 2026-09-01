type AppLogoProps = {
  as?: "h1" | "h2" | "div";
  className?: string;
};

export function AppLogo({ as: Tag = "div", className = "" }: AppLogoProps) {
  return (
    <Tag className={`app-logo${className ? ` ${className}` : ""}`}>
      <div className="app-logo__icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 2.5L2 21h20L12 2.5z" />
        </svg>
      </div>
      <span className="app-logo__name">FarmerIQ</span>
    </Tag>
  );
}
