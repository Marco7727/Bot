import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function IdeaSubmissionForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createIdeaMutation = useMutation({
    mutationFn: async (ideaData: { title: string; description: string; category: string }) => {
      await apiRequest("POST", "/api/ideas", ideaData);
    },
    onSuccess: () => {
      toast({
        title: "¡Éxito!",
        description: "Tu idea ha sido publicada correctamente",
      });
      setTitle("");
      setDescription("");
      setCategory("");
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
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
        description: error.message || "Error al publicar la idea",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !category) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    createIdeaMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
    });
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200 mb-8">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compartir Nueva Idea</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Título de la Idea
            </Label>
            <Input
              type="text"
              placeholder="Ingresa un título descriptivo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </Label>
            <Textarea
              rows={4}
              placeholder="Describe tu idea en detalle..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tecnologia">Tecnología</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="producto">Producto</SelectItem>
                <SelectItem value="proceso">Proceso</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            type="submit" 
            disabled={createIdeaMutation.isPending}
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium"
          >
            {createIdeaMutation.isPending ? "Publicando..." : "Publicar Idea"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
