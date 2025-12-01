import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type ReportStatus = "pending" | "approved" | "rejected";

interface AdminReport {
    id: number;
    plate: string;
    type: string;
    status: ReportStatus;
    date: string;
}

const tiposInfraccionLabelsFallback: Record<number, string> = {
    1: "Mal estacionado",
    2: "Bloquea cochera",
    3: "Lugar para discapacitados",
};

const mapDbEstatusToStatus = (estatus: string | null): ReportStatus => {
    if (!estatus) return "pending";
    switch (estatus.toLowerCase()) {
        case "aprobado":
            return "approved";
        case "rechazado":
            return "rejected";
        case "pendiente":
        default:
            return "pending";
    }
};

export const AdminReportsTab = () => {
    const { toast } = useToast();
    const [reports, setReports] = useState<AdminReport[]>([]);
    const [searchReports, setSearchReports] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchReports = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("reportes")
            .select(
                `
        id_reporte,
        texto_placa_ingresado,
        estatus,
        fecha_reporte,
        id_tipo_infraccion,
        vehiculos(placa),
        tipos_infraccion(descripcion)
      `
            )
            .order("fecha_reporte", { ascending: false });

        if (error) {
            toast({
                title: "Error al cargar reportes",
                description: error.message,
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        const mapped: AdminReport[] =
            data?.map((r: any) => ({
                id: r.id_reporte,
                plate: r.vehiculos?.placa ?? r.texto_placa_ingresado,
                type:
                    r.tipos_infraccion?.descripcion ??
                    tiposInfraccionLabelsFallback[r.id_tipo_infraccion] ??
                    `Tipo #${r.id_tipo_infraccion}`,
                status: mapDbEstatusToStatus(r.estatus),
                date: new Date(r.fecha_reporte).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short",
                }),
            })) ?? [];

        setReports(mapped);
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleApproveReport = async (reportId: number) => {
        const { error } = await supabase
            .from("reportes")
            .update({
                estatus: "aprobado",
                fecha_revision: new Date().toISOString(),
            })
            .eq("id_reporte", reportId);

        if (error) {
            toast({
                title: "Error al aprobar reporte",
                description: error.message,
                variant: "destructive",
            });
            return;
        }

        setReports((prev) =>
            prev.map((r) => (r.id === reportId ? { ...r, status: "approved" } : r))
        );

        toast({
            title: "Reporte aprobado",
            description: "Strike agregado al usuario (si aplica).",
        });
    };

    const handleRejectReport = async (reportId: number) => {
        const { error } = await supabase
            .from("reportes")
            .update({
                estatus: "rechazado",
                fecha_revision: new Date().toISOString(),
            })
            .eq("id_reporte", reportId);

        if (error) {
            toast({
                title: "Error al rechazar reporte",
                description: error.message,
                variant: "destructive",
            });
            return;
        }

        setReports((prev) =>
            prev.map((r) => (r.id === reportId ? { ...r, status: "rejected" } : r))
        );

        toast({
            title: "Reporte rechazado",
        });
    };

    const getStatusBadge = (status: ReportStatus) => {
        switch (status) {
            case "pending":
                return (
                    <Badge variant="outline" className="bg-accent/20">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Pendiente
                    </Badge>
                );
            case "approved":
                return (
                    <Badge variant="outline" className="bg-primary/20 text-primary">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Aprobado
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge variant="outline" className="bg-destructive/20 text-destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Rechazado
                    </Badge>
                );
            default:
                return null;
        }
    };

    const filteredReports = reports.filter((report) => {
        const query = searchReports.toLowerCase();
        return (
            report.plate.toLowerCase().includes(query) ||
            report.type.toLowerCase().includes(query) ||
            report.status.toLowerCase().includes(query)
        );
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Validación de Reportes</CardTitle>
                <CardDescription>
                    Revisa y aprueba o rechaza los reportes de infracciones
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por placa, tipo o estado."
                        value={searchReports}
                        onChange={(e) => setSearchReports(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {loading && (
                    <p className="text-sm text-muted-foreground mb-2">
                        Cargando reportes…
                    </p>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Placa</TableHead>
                            <TableHead>Tipo de Infracción</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReports.map((report) => (
                            <TableRow key={report.id}>
                                <TableCell>{report.id}</TableCell>
                                <TableCell className="font-mono font-semibold">
                                    {report.plate}
                                </TableCell>
                                <TableCell>{report.type}</TableCell>
                                <TableCell>{getStatusBadge(report.status)}</TableCell>
                                <TableCell>{report.date}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Link to={`/admin/reporte/${report.id}`}>
                                            <Button size="sm" variant="outline">
                                                <Eye className="h-4 w-4 mr-1" />
                                                Ver
                                            </Button>
                                        </Link>
                                        {report.status === "pending" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleApproveReport(report.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Aprobar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRejectReport(report.id)}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Rechazar
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}

                        {!loading && filteredReports.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="text-center text-sm text-muted-foreground"
                                >
                                    No hay reportes para mostrar.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


