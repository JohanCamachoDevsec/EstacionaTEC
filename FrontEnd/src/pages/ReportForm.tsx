import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import logoCuliacan from "@/assets/logo-culiacan.png";
import logoTec from "@/assets/logo-tec.png";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";


type TipoInfraccion = {
    id_tipo_infraccion: number;
    codigo: string;
    descripcion: string;
};
const PLATE_API_URL = import.meta.env.VITE_PLATE_API_URL;

const ReportForm = () => {
    const [platePhoto, setPlatePhoto] = useState<File | null>(null);
    const [generalPhoto, setGeneralPhoto] = useState<File | null>(null);
    const [platePhotoPreview, setPlatePhotoPreview] = useState<string>("");
    const [generalPhotoPreview, setGeneralPhotoPreview] = useState<string>("");
    const [detectedPlate, setDetectedPlate] = useState<string>("");
    const [violationTypeId, setViolationTypeId] = useState<string>("");
    const [violationTypes, setViolationTypes] = useState<TipoInfraccion[]>([]);
    const [manualPlate, setManualPlate] = useState<string>("");
    const [comments, setComments] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const { toast } = useToast();
    useEffect(() => {
        return () => {
            if (platePhotoPreview) URL.revokeObjectURL(platePhotoPreview);
            if (generalPhotoPreview) URL.revokeObjectURL(generalPhotoPreview);
        };
    }, [platePhotoPreview, generalPhotoPreview]);

    useEffect(() => {
        const fetchTiposInfraccion = async () => {
            const { data, error } = await supabase
                .from("tipos_infraccion")
                .select("id_tipo_infraccion, codigo, descripcion")
                .order("id_tipo_infraccion", { ascending: true });

            if (!error && data) {
                setViolationTypes(data as TipoInfraccion[]);
            } else {
                console.error("Error al cargar tipos de infracción", error);
            }
        };

        fetchTiposInfraccion();
    }, []);

    const handlePlatePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPlatePhoto(file);

            const previewUrl = URL.createObjectURL(file);
            setPlatePhotoPreview(previewUrl);

            setDetectedPlate("");
            setManualPlate("");
            setMessage(null);

            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch(`${PLATE_API_URL}/read-plate`, {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error("Error leyendo placa");
                }

                const data = await res.json();
                const plateFromResponse = typeof data.plate === "string" ? data.plate : "";
                const success =
                    typeof data.success === "boolean" ? data.success : !!plateFromResponse;

                if (success && plateFromResponse) {
                    setDetectedPlate(plateFromResponse);
                    setManualPlate(plateFromResponse);

                    toast({
                        title: "Placa detectada",
                        description: `Se leyó: ${plateFromResponse}`,
                    });
                } else {
                    setDetectedPlate("");
                    setManualPlate("");

                    toast({
                        variant: "destructive",
                        title: "No encontré placa",
                        description: "¿Puedes tomar otra foto más cerca de la placa?",
                    });
                }
            } catch (err) {
                console.error(err);
                setDetectedPlate("");
                setManualPlate("");

                toast({
                    variant: "destructive",
                    title: "Error al leer la placa",
                    description: "Inténtalo de nuevo o escríbela manualmente.",
                });
            }
        }
    };




    const handleGeneralPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setGeneralPhoto(file);
            const previewUrl = URL.createObjectURL(file);
            setGeneralPhotoPreview(previewUrl);
        }
    };

    const isFormValid =
        !!platePhoto &&
        !!generalPhoto &&
        !!violationTypeId &&
        manualPlate.trim() !== "";

    const uploadPhoto = async (file: File, folder: string) => {
        const ext = file.name.split(".").pop();
        const fileName = `${folder}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("reportes")
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) throw uploadError;

        const {
            data: { publicUrl }
        } = supabase.storage.from("reportes").getPublicUrl(fileName);

        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!isFormValid || !platePhoto || !generalPhoto) return;

        setLoading(true);
        setMessage(null);

        try {
            const fotoPlacasUrl = await uploadPhoto(platePhoto, "placas");
            const fotoContextoUrl = await uploadPhoto(generalPhoto, "contexto");

            const tipoInfraccionId = violationTypeId
                ? parseInt(violationTypeId, 10)
                : null;

            if (!tipoInfraccionId) {
                throw new Error("Tipo de infracción inválido");
            }

            const { data, error: insertError } = await supabase
                .from("reportes")
                .insert({
                    texto_placa_ingresado: manualPlate.trim(),
                    id_tipo_infraccion: tipoInfraccionId,
                    url_foto_placa: fotoPlacasUrl,
                    url_foto_contexto: fotoContextoUrl,
                    comentarios: comments || null
                })
                .select("id_reporte")
                .single();

            if (insertError) {
                throw insertError;
            }

            const nuevoReporteId = data?.id_reporte as number | undefined;

            if (nuevoReporteId) {
                const { error: matchError } = await supabase.rpc(
                    "empatar_reporte_con_vehiculo",
                    { p_id_reporte: nuevoReporteId }
                );

                if (matchError) {
                    console.error("Error al empatar reporte con vehículo", matchError);
                }
            }

            setMessage("Reporte enviado exitosamente ✅");

            setPlatePhoto(null);
            setGeneralPhoto(null);
            if (platePhotoPreview) URL.revokeObjectURL(platePhotoPreview);
            if (generalPhotoPreview) URL.revokeObjectURL(generalPhotoPreview);
            setPlatePhotoPreview("");
            setGeneralPhotoPreview("");
            setDetectedPlate("");
            setViolationTypeId("");
            setManualPlate("");
            setComments("");
        } catch (err) {
            console.error(err);
            setMessage("Ocurrió un error al enviar el reporte. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="md:flex-row items-center justify-center gap-6 md:gap-8 flex flex-row">
                        <img
                            src={logoTec}
                            alt="Tecnológico Nacional de México"
                            className="h-12 md:h-16 w-auto"
                        />
                        <h1 className="text-2xl md:text-4xl font-bold text-primary">
                            EstacionaTEC
                        </h1>
                        <img
                            src={logoCuliacan}
                            alt="Instituto Tecnológico de Culiacán"
                            className="h-12 md:h-16 w-12 md:w-16"
                        />
                    </div>
                </div>
            </header>

            {/* Form Section */}
            <section className="py-8 md:py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        <Link to="/">
                            <Button variant="ghost" className="mb-6">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al inicio
                            </Button>
                        </Link>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-3xl">Reportar Infracción</CardTitle>
                                <CardDescription>
                                    Completa el formulario para reportar un caso de abuso de
                                    estacionamiento
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Foto de Placa */}
                                <div className="space-y-3">
                                    <Label
                                        htmlFor="plate-photo"
                                        className="text-lg font-semibold"
                                    >
                                        1. Foto de la Placa *
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Toma una foto cercana y clara de la placa del vehículo.
                                        Asegúrate de que sea legible.
                                    </p>
                                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                        <Input
                                            id="plate-photo"
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handlePlatePhotoChange}
                                            className="hidden"
                                        />
                                        <Label
                                            htmlFor="plate-photo"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            {platePhotoPreview ? (
                                                <>
                                                    <img
                                                        src={platePhotoPreview}
                                                        alt="Preview de placa"
                                                        className="w-full max-w-md mx-auto rounded-lg mb-3"
                                                    />
                                                    <span className="text-sm font-medium text-foreground">
                            {platePhoto?.name}
                          </span>
                                                    <span className="text-xs text-muted-foreground">
                            Haz clic para cambiar
                          </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="h-12 w-12 text-muted-foreground" />
                                                    <span className="text-sm font-medium text-foreground">
                            Haz clic para tomar/subir foto
                          </span>
                                                    <span className="text-xs text-muted-foreground">
                            Formato: JPG, PNG (máx. 10MB)
                          </span>
                                                </>
                                            )}
                                        </Label>
                                    </div>

                                    {/* Placa leída por el sistema */}
                                    <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                                        <p className="text-sm font-medium text-muted-foreground mb-2">
                                            Placa leída por el sistema:
                                        </p>
                                        {detectedPlate ? (
                                            <p className="text-2xl font-bold text-primary font-mono tracking-wider">
                                                {detectedPlate}
                                            </p>
                                        ) : (
                                            <p className="text-lg text-muted-foreground">
                                                Esperando foto de la placa...
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Foto General */}
                                <div className="space-y-3">
                                    <Label
                                        htmlFor="general-photo"
                                        className="text-lg font-semibold"
                                    >
                                        2. Foto General *
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Toma una foto general que muestre el contexto de la
                                        infracción.
                                    </p>
                                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                        <Input
                                            id="general-photo"
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleGeneralPhotoChange}
                                            className="hidden"
                                        />
                                        <Label
                                            htmlFor="general-photo"
                                            className="cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            {generalPhotoPreview ? (
                                                <>
                                                    <img
                                                        src={generalPhotoPreview}
                                                        alt="Preview de foto general"
                                                        className="w-full max-w-md mx-auto rounded-lg mb-3"
                                                    />
                                                    <span className="text-sm font-medium text-foreground">
                            {generalPhoto?.name}
                          </span>
                                                    <span className="text-xs text-muted-foreground">
                            Haz clic para cambiar
                          </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="h-12 w-12 text-muted-foreground" />
                                                    <span className="text-sm font-medium text-foreground">
                            Haz clic para tomar/subir foto
                          </span>
                                                    <span className="text-xs text-muted-foreground">
                            Formato: JPG, PNG (máx. 10MB)
                          </span>
                                                </>
                                            )}
                                        </Label>
                                    </div>
                                </div>

                                {/* Tipo de Falta */}
                                <div className="space-y-3">
                                    <Label
                                        htmlFor="violation-type"
                                        className="text-lg font-semibold"
                                    >
                                        3. Tipo de Falta *
                                    </Label>
                                    <Select
                                        value={violationTypeId}
                                        onValueChange={setViolationTypeId}
                                    >
                                        <SelectTrigger id="violation-type" className="w-full">
                                            <SelectValue placeholder="Selecciona el tipo de infracción" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {violationTypes.map((tipo) => (
                                                <SelectItem
                                                    key={tipo.id_tipo_infraccion}
                                                    value={String(tipo.id_tipo_infraccion)}
                                                >
                                                    {tipo.descripcion}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Confirmación Manual de Placa */}
                                <div className="space-y-3">
                                    <Label
                                        htmlFor="manual-plate"
                                        className="text-lg font-semibold"
                                    >
                                        4. Confirma la Placa *
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Verifica y confirma manualmente la placa del vehículo todo
                                        junto y en mayúsculas
                                    </p>
                                    <Input
                                        id="manual-plate"
                                        type="text"
                                        value={manualPlate}
                                        onChange={(e) => {
                                            const value = e.target.value
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9]/g, "");
                                            setManualPlate(value);
                                        }}
                                        className="text-lg font-mono tracking-wider"
                                        maxLength={15}
                                        placeholder="Ej: VPM4532"
                                    />
                                </div>

                                {/* Comentarios o Descripción */}
                                <div className="space-y-3">
                                    <Label htmlFor="comments" className="text-lg font-semibold">
                                        5. Comentarios o Descripción (Opcional)
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Describe el motivo de tu reporte o agrega información
                                        adicional
                                    </p>
                                    <Textarea
                                        id="comments"
                                        placeholder="Ej: El vehículo lleva estacionado en zona de discapacitados por más de 2 horas..."
                                        value={comments}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value.length <= 256) {
                                                setComments(value);
                                            }
                                        }}
                                        className="min-h-[100px] resize-none"
                                        maxLength={256}
                                    />
                                    <p className="text-xs text-muted-foreground text-right">
                                        {comments.length}/256 caracteres
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <Button
                                        size="lg"
                                        className="w-full text-lg"
                                        disabled={!isFormValid || loading}
                                        onClick={handleSubmit}
                                    >
                                        <Upload className="mr-2 h-5 w-5" />
                                        {loading ? "Enviando..." : "Enviar Reporte"}
                                    </Button>
                                    {!isFormValid && (
                                        <p className="text-sm text-muted-foreground text-center mt-2">
                                            * Completa todos los campos obligatorios para continuar
                                        </p>
                                    )}
                                    {message && (
                                        <p className="text-sm text-center mt-2">{message}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ReportForm;

