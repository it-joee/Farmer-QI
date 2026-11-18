type AppLogoProps = {
  as?: "h1" | "h2" | "div";
  className?: string;
};

export function AppLogo({ as: Tag = "div", className = "" }: AppLogoProps) {
  return (
    <Tag className={`app-logo${className ? ` ${className}` : ""}`}>
      <div className="app-logo__icon" aria-hidden="true">
        <img src="/logo/jni-logo.svg" alt="" width="24" height="24" />
      </div>
      <span className="app-logo__name">FarmerIQ</span>
    </Tag>
  );
}
