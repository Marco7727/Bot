import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import AdminSidebar from "@/components/AdminSidebar";
import IdeaSubmissionForm from "@/components/IdeaSubmissionForm";
import IdeaCard from "@/components/IdeaCard";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { IdeaWithAuthorAndVotes } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "No autorizado",
        description: "Debes iniciar sesión. Redirigiendo...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: ideas, isLoading: ideasLoading, error } = useQuery<IdeaWithAuthorAndVotes[]>({
    queryKey: ["/api/ideas"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "No autorizado",
        description: "Tu sesión ha expirado. Iniciando sesión nuevamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user && ['admin', 'super_admin', 'moderator'].includes(user.role || '');

  return (
    <div className="bg-gray-50 font-inter min-h-screen">
      <Header user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Admin Controls */}
          {isAdmin && (
            <div className="lg:col-span-1">
              <AdminSidebar />
            </div>
          )}

          {/* Main Content */}
          <div className={`${isAdmin ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
            
            {/* New Idea Form */}
            <IdeaSubmissionForm />

            {/* Ideas Feed */}
            <div className="space-y-6">
              {ideasLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando ideas...</p>
                </div>
              ) : ideas && ideas.length > 0 ? (
                ideas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} currentUser={user} />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <p className="text-gray-600">No hay ideas aún. ¡Sé el primero en compartir una!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
