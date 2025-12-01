import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertTriangle,
    User,
    Car,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type ReportStatus = "pending" | "approved" | "rejected";

interface PersonInfo {
    name: string;
    phone?: string | null;
    strikes: number;
}

interface ReportDetailData {
    id: number;
    plateImage: string;
    generalImage: string;
    infraction: string;
    description: string;
    date: string;
    time: string;
    location: string;
    licensePlate: string;
    personInfo?: PersonInfo;
}

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

export default function ReportDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState<ReportDetailData | null>(null);
    const [status, setStatus] = useState<ReportStatus>("pending");
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        const reportId = Number(id);
        if (Number.isNaN(reportId)) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from("reportes")
            .select(
                `
        id_reporte,
        texto_placa_ingresado,
        url_foto_placa,
        url_foto_contexto,
        comentarios,
        estatus,
        fecha_reporte,
        id_tipo_infraccion,
        vehiculos(
          placa,
          modelo,
          color,
          usuarios(
            nombre_completo,
            celular,
            total_strikes
          )
        ),
        tipos_infraccion(
          descripcion
        )
      `
            )
            .eq("id_reporte", reportId)
            .maybeSingle();

        if (error) {
            setLoading(false);
            toast({
                title: "Error al cargar el reporte",
                description: error.message,
                variant: "destructive",
            });
            return;
        }

        if (!data) {
            setLoading(false);
            setReport(null);
            return;
        }

        const fecha = new Date(data.fecha_reporte);

        const owner =
            data.vehiculos?.usuarios ??
            null; // si no está ligado a un vehículo, se considera placa no registrada

        const mapped: ReportDetailData = {
            id: data.id_reporte,
            plateImage: data.url_foto_placa,
            generalImage: data.url_foto_contexto ?? data.url_foto_placa,
            infraction:
                data.tipos_infraccion?.descripcion ??
                `Tipo de infracción #${data.id_tipo_infraccion}`,
            description: data.comentarios ?? "Sin comentarios adicionales.",
            date: fecha.toLocaleDateString("es-MX", { dateStyle: "long" }),
            time: fecha.toLocaleTimeString("es-MX", { timeStyle: "short" }),
            location: "Sin ubicación registrada",
            licensePlate:
                data.vehiculos?.placa ?? data.texto_placa_ingresado ?? "Desconocida",
            personInfo: owner
                ? {
                    name: owner.nombre_completo,
                    phone: owner.celular,
                    strikes: owner.total_strikes ?? 0,
                }
                : undefined,
        };

        setReport(mapped);
        setStatus(mapDbEstatusToStatus(data.estatus));
        setLoading(false);
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleApprove = async () => {
        if (!report) return;

        const { error } = await supabase
            .from("reportes")
            .update({
                estatus: "aprobado",
                fecha_revision: new Date().toISOString(),
            })
            .eq("id_reporte", report.id);

        if (error) {
            toast({
                title: "Error al aprobar el reporte",
                description: error.message,
                variant: "destructive",
            });
            return;
        }

        setStatus("approved");
        await fetchReport(); // recarga strikes del usuario si el trigger los actualiza

        toast({
            title: "Reporte aprobado",
            description: "El reporte ha sido aprobado correctamente.",
        });
    };

    const handleReject = async () => {
        if (!report) return;

        const { error } = await supabase
            .from("reportes")
            .update({
                estatus: "rechazado",
                fecha_revision: new Date().toISOString(),
            })
            .eq("id_reporte", report.id);

        if (error) {
            toast({
                title: "Error al rechazar el reporte",
                description: error.message,
                variant: "destructive",
            });
            return;
        }

        setStatus("rejected");

        toast({
            title: "Reporte rechazado",
            description: "El reporte ha sido rechazado y no se aplicarán sanciones.",
            variant: "destructive",
        });
    };

    const getStatusBadge = () => {
        switch (status) {
            case "approved":
                return <Badge className="bg-green-500">Aprobado</Badge>;
            case "rejected":
                return <Badge variant="destructive">Rechazado</Badge>;
            default:
                return <Badge variant="secondary">Pendiente</Badge>;
        }
    };

    const getStrikesBadge = (strikes: number) => {
        if (strikes >= 3) {
            return (
                <Badge variant="destructive" className="text-lg px-3 py-1">
                    {strikes} Strikes ⚠️
                </Badge>
            );
        } else if (strikes >= 2) {
            return (
                <Badge className="bg-orange-500 text-lg px-3 py-1">
                    {strikes} Strikes
                </Badge>
            );
        }
        return (
            <Badge variant="secondary" className="text-lg px-3 py-1">
                {strikes} Strike{strikes !== 1 ? "s" : ""}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Cargando reporte…</CardTitle>
                        <CardDescription>Por favor espera un momento.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>Reporte no encontrado</CardTitle>
                        <CardDescription>El reporte que buscas no existe.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate("/admin")} className="w-full">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/admin")}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                        {getStatusBadge()}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Columna Izquierda - Imágenes */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Evidencia Fotográfica</CardTitle>
                                <CardDescription>
                                    {report.generalImage ? "2 imágenes adjuntas" : "1 imagen adjunta"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                        1. Fotografía de las Placas
                                    </p>
                                    <div className="rounded-lg overflow-hidden border">
                                        <img
                                            src={report.plateImage}
                                            alt="Fotografía de las placas del vehículo"
                                            className="w-full h-auto object-cover"
                                        />
                                    </div>
                                </div>
                                {report.generalImage && report.generalImage !== report.plateImage && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-2">
                                            2. Fotografía General
                                        </p>
                                        <div className="rounded-lg overflow-hidden border">
                                            <img
                                                src={report.generalImage}
                                                alt="Fotografía general de la infracción"
                                                className="w-full h-auto object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha - Información */}
                    <div className="space-y-6">
                        {/* Información del Reporte */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalles del Reporte</CardTitle>
                                <CardDescription>Reporte #{report.id}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Infracción</p>
                                    <p className="text-lg font-semibold">{report.infraction}</p>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm text-muted-foreground">Descripción</p>
                                    <p className="text-base">{report.description}</p>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fecha</p>
                                        <p className="font-medium">{report.date}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Hora</p>
                                        <p className="font-medium">{report.time}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Ubicación</p>
                                    <p className="font-medium">{report.location}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Información del Vehículo */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Car className="h-5 w-5" />
                                    Información del Vehículo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div>
                                    <p className="text-sm text-muted-foreground">Placa</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {report.licensePlate}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Información del Propietario */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Información del Propietario
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {report.personInfo ? (
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Nombre</p>
                                            <p className="text-lg font-semibold">
                                                {report.personInfo.name}
                                            </p>
                                        </div>
                                        {report.personInfo.phone && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Teléfono</p>
                                                <p className="font-medium">{report.personInfo.phone}</p>
                                            </div>
                                        )}
                                        <Separator />
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Strikes actuales
                                            </p>
                                            {getStrikesBadge(report.personInfo.strikes)}
                                            {report.personInfo.strikes >= 2 && (
                                                <div className="mt-2 flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400">
                                                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                                                    <span>
                            {report.personInfo.strikes >= 3
                                ? "¡Usuario ha alcanzado el límite de strikes!"
                                : "Usuario cerca del límite de strikes"}
                          </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-muted-foreground">
                                            No hay información registrada del propietario.
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Este vehículo no está registrado en el sistema.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Acciones */}
                        {status === "pending" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Acciones</CardTitle>
                                    <CardDescription>
                                        Aprobar o rechazar este reporte
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex gap-4">
                                    <Button
                                        onClick={handleApprove}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        size="lg"
                                    >
                                        <CheckCircle className="mr-2 h-5 w-5" />
                                        Aprobar reporte
                                    </Button>
                                    <Button
                                        onClick={handleReject}
                                        variant="destructive"
                                        className="flex-1"
                                        size="lg"
                                    >
                                        <XCircle className="mr-2 h-5 w-5" />
                                        Rechazar reporte
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

