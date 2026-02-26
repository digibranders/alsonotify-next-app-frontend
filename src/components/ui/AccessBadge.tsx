import { ShieldCheck, Briefcase, User, Users } from "lucide-react";

interface AccessBadgeProps {
  role: string | "Admin" | "Manager" | "Leader" | "Employee" | "Coordinator";
  color?: string;
  className?: string; // Support className for custom styling overrides
}

export function AccessBadge({ role, color, className }: AccessBadgeProps) {
  let textColor: string;
  let iconColor: string;
  let bgColor: string;
  let IconComponent: typeof User;

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
      case "HR":
        textColor = "#0284C7"; // Cyan/Blue
        iconColor = "#0284C7";
        bgColor = "#F0F9FF";
        IconComponent = ShieldCheck;
        break;
      case "Finance":
        textColor = "#059669"; // Emerald/Green
        iconColor = "#059669";
        bgColor = "#ECFDF5";
        IconComponent = Briefcase;
        break;
      case "Coordinator":
        textColor = "#F79009"; // Amber/Orange
        iconColor = "#F79009";
        bgColor = "#FFFAEB";
        IconComponent = Briefcase;
        break;
      case "Head":
      case "Leader":
        textColor = "#7F56D9"; // Purple
        iconColor = "#7F56D9";
        bgColor = "#F9F5FF";
        IconComponent = Users;
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
      <span className="text-[0.6875rem] font-semibold">
        {role}
      </span>
    </span>
  );
}
