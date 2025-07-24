import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">IdeaBox</h1>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-800">
                Sistema de Gestión de Ideas
              </h2>
              <p className="text-gray-600">
                Comparte, vota y gestiona ideas innovadoras en tu organización
              </p>
            </div>

            <div className="space-y-4">
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Vota ideas con sistema de pulgar arriba/abajo</li>
                <li>✓ Control de administración con roles</li>
                <li>✓ Aprobación y rechazo de propuestas</li>
                <li>✓ Una sola votación por usuario</li>
              </ul>
            </div>

            <Button 
              onClick={handleLogin}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              Iniciar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
