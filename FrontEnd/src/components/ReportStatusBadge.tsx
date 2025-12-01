import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

type ReportStatus = "pendiente" | "aprobado" | "rechazado" | "pending" | "approved" | "rejected";

interface ReportStatusBadgeProps {
  status: ReportStatus;
  showIcon?: boolean;
  className?: string;
}

export const ReportStatusBadge = ({ 
  status, 
  showIcon = false,
  className = "" 
}: ReportStatusBadgeProps) => {
  // Normalizar estados en español e inglés
  const normalizedStatus = 
    status === "pendiente" || status === "pending" ? "pending" :
    status === "aprobado" || status === "approved" ? "approved" :
    "rejected";

  const config = {
    pending: {
      label: "Pendiente",
      variant: "secondary" as const,
      icon: Clock,
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
    },
    approved: {
      label: "Aprobado",
      variant: "default" as const,
      icon: CheckCircle,
      className: "bg-green-500/10 text-green-600 border-green-500/20"
    },
    rejected: {
      label: "Rechazado",
      variant: "destructive" as const,
      icon: XCircle,
      className: "bg-red-500/10 text-red-600 border-red-500/20"
    }
  };

  const { label, variant, icon: Icon, className: statusClassName } = config[normalizedStatus];

  return (
    <Badge variant={variant} className={`${statusClassName} ${className}`}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {label}
    </Badge>
  );
};
