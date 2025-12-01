import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import logoCuliacan from "@/assets/logo-culiacan.png";
import logoTec from "@/assets/logo-tec.png";
const Index = () => {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="md:flex-row items-center justify-center gap-6 md:gap-8 flex flex-row">
            <img src={logoTec} alt="Tecnológico Nacional de México" className="h-12 md:h-16 w-auto" />
            <h1 className="text-2xl md:text-4xl font-bold text-primary">EstacionaTEC</h1>
            <img src={logoCuliacan} alt="Instituto Tecnológico de Culiacán" className="h-12 md:h-16 w-12 md:w-16" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Cultura de Estacionamiento Responsable
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Juntos construimos un campus más ordenado y accesible para todos
            </p>
            <Link to="/FormReporte">
              <Button size="lg" className="text-lg px-8 py-6">
                <AlertCircle className="mr-2 h-5 w-5" />
                Reportar Caso de Abuso
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-foreground mb-12">
              ¿Por qué es importante?
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Acceso Equitativo</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Garantizar que todos los miembros de la comunidad TEC tengan acceso justo a los espacios de estacionamiento disponibles.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Seguridad</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Mantener vías de acceso despejadas para vehículos de emergencia y facilitar la movilidad segura dentro del campus.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileText className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Orden y Respeto</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Fomentar una cultura de respeto hacia las normas institucionales y hacia los demás miembros de la comunidad.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2025 EstacionaTEC - Instituto Tecnológico de Culiacán
          </p>
        </div>
      </footer>
    </div>;
};
export default Index;