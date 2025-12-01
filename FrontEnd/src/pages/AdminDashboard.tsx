import logoCuliacan from "@/assets/logo-culiacan.png";
import logoTec from "@/assets/logo-tec.png";
import { AdminReportsTab } from "@/components/admin/AdminReportsTab";

const AdminDashboard = () => {
    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img src={logoTec} alt="TEC" className="h-12 w-auto" />
                            <div>
                                <h1 className="text-xl font-bold text-primary">Panel de Administración</h1>
                                <p className="text-sm text-muted-foreground">EstacionaTEC Dashboard</p>
                            </div>
                        </div>
                        <img src={logoCuliacan} alt="Culiacán" className="h-12 w-12" />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <AdminReportsTab />
            </div>
        </div>
    );
};

export default AdminDashboard;

