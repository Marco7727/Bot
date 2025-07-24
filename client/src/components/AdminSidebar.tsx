import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

export default function AdminSidebar() {
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ username, role }: { username: string; role: string }) => {
      await apiRequest("PATCH", "/api/users/role", { username, role });
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Rango asignado correctamente",
      });
      setUsername("");
      setSelectedRole("");
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Tu sesión ha expirado. Iniciando sesión nuevamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Error al asignar rango",
        variant: "destructive",
      });
    },
  });

  const handleAssignRole = () => {
    if (!username.trim() || !selectedRole) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    assignRoleMutation.mutate({ username: username.trim(), role: selectedRole });
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Panel de Administración</h2>
        
        {/* Command Interface */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Asignar Rango de Admin
          </Label>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Correo electrónico del usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="moderator">Moderador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAssignRole}
              disabled={assignRoleMutation.isPending}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white"
            >
              {assignRoleMutation.isPending ? "Asignando..." : "Asignar Rango"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          {statsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ideas Pendientes</span>
                <span className="font-semibold text-orange-600">{stats?.pending || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ideas Aprobadas</span>
                <span className="font-semibold text-green-600">{stats?.approved || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ideas Rechazadas</span>
                <span className="font-semibold text-red-600">{stats?.rejected || 0}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
