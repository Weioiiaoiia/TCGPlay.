/**
 * TCGPlay Logo Component
 * Style: "TCG" in bold white, "Play" in italic with gold gradient
 * Matches the reference design from the user's effect image (图三)
 */

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-baseline select-none ${className}`}>
      <span
        className={`font-display font-bold text-white tracking-wide ${sizeMap[size]}`}
        style={{ letterSpacing: "0.05em" }}
      >
        TCG
      </span>
      <span
        className={`font-display italic ${sizeMap[size]}`}
        style={{
          background: "linear-gradient(135deg, #f5e6b8 0%, #d4a853 40%, #c9952a 70%, #f0d78c 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}
      >
        Play
      </span>
    </span>
  );
}
