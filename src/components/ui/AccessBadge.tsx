import { ShieldCheck, Briefcase, User, Users } from "lucide-react";

interface AccessBadgeProps {
  role: string | "Admin" | "Manager" | "Leader" | "Employee" | "Coordinator";
  color?: string;
  className?: string; // Support className for custom styling overrides
}

export function AccessBadge({ role, color, className }: AccessBadgeProps) {
  let textColor = "#666666";
  let iconColor = "#666666";
  let bgColor = "#F7F7F7";
  let IconComponent = User;

  // Use custom color if provided and not a core role with specific branding
  if (color && !["Admin", "Manager", "Leader", "Employee"].includes(role)) {
    textColor = color;
    iconColor = color;
    // Generate a light background from the color (hex to rgba with 0.1 opacity)
    bgColor = `${color}1A`;
    IconComponent = User;
  } else {
    switch (role) {
      case "Admin":
        textColor = "#ff3b3b"; // Red (brand color)
        iconColor = "#ff3b3b"; // Red (brand color)
        bgColor = "#FFF5F5"; // Light red
        IconComponent = ShieldCheck;
        break;
      case "Manager":
        textColor = "#2E90FA"; // Blue
        iconColor = "#2E90FA"; // Blue
        bgColor = "#EFF8FF"; // Light blue
        IconComponent = Briefcase;
        break;
      case "Employee":
        textColor = "#12B76A"; // Green
        iconColor = "#12B76A"; // Green
        bgColor = "#ECFDF3"; // Light green
        IconComponent = User;
        break;
      case "Leader":
        textColor = "#7F56D9"; // Purple
        iconColor = "#7F56D9"; // Purple
        bgColor = "#F9F5FF"; // Light lavender
        IconComponent = Users; // Two persons icon
        break;
      case "HR":
        textColor = "#0284C7"; // Cyan/Blue
        iconColor = "#0284C7";
        bgColor = "#F0F9FF";
        IconComponent = ShieldCheck;
        break;
      case "Coordinator":
        textColor = "#F79009"; // Amber/Orange
        iconColor = "#F79009";
        bgColor = "#FFFAEB"; // Light amber
        IconComponent = Briefcase; // Briefcase for project management feel
        break;
      default:
        textColor = "#666666";
        iconColor = "#666666";
        bgColor = "#F7F7F7";
        IconComponent = User;
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${className || ''}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <IconComponent
        className="w-3 h-3"
        style={{ color: iconColor }}
      />
      <span className="text-[11px] font-['Manrope:SemiBold',sans-serif]">
        {role}
      </span>
    </span>
  );
}
