/**
 * TCGPlay Logo Component
 * Apple-inspired: "TCG" bold white, "Play" italic gold gradient
 */

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { fontSize: "1.375rem", gap: "0.05em" },
  md: { fontSize: "1.75rem", gap: "0.05em" },
  lg: { fontSize: "2.5rem", gap: "0.04em" },
  xl: { fontSize: "3.25rem", gap: "0.03em" },
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const s = sizeMap[size];
  return (
    <span
      className={`inline-flex items-baseline select-none ${className}`}
      style={{ fontSize: s.fontSize, lineHeight: 1.1 }}
    >
      <span
        className="font-display font-bold text-white"
        style={{ letterSpacing: "0.04em" }}
      >
        TCG
      </span>
      <span
        className="font-display italic font-medium"
        style={{
          background: "linear-gradient(145deg, #f5e6b8 0%, #d4a853 35%, #c9952a 65%, #e8c66a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "0.01em",
          marginLeft: s.gap,
        }}
      >
        Play
      </span>
    </span>
  );
}
