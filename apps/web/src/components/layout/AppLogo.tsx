type AppLogoProps = {
  as?: "h1" | "h2" | "div";
  className?: string;
};

export function AppLogo({ as: Tag = "div", className = "" }: AppLogoProps) {
  return (
    <Tag className={`app-logo${className ? ` ${className}` : ""}`}>
      <span className="app-logo__name">FarmerIQ</span>
    </Tag>
  );
}
