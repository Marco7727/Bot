import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { IdeaWithAuthorAndVotes, User } from "@shared/schema";

interface IdeaCardProps {
  idea: IdeaWithAuthorAndVotes;
  currentUser: User | null | undefined;
}

export default function IdeaCard({ idea, currentUser }: IdeaCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = currentUser && ['admin', 'super_admin', 'moderator'].includes(currentUser.role || '');
  const canVote = idea.status === 'pending' || idea.status === 'approved';
  const hasVoted = idea.userVote !== null;

  const voteMutation = useMutation({
    mutationFn: async (voteType: 'up' | 'down') => {
      await apiRequest("POST", `/api/ideas/${idea.id}/vote`, { voteType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
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
        description: error.message || "Error al votar",
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: 'approved' | 'rejected') => {
      await apiRequest("PATCH", `/api/ideas/${idea.id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Éxito",
        description: `Idea ${statusMutation.variables === 'approved' ? 'aprobada' : 'rechazada'} correctamente`,
      });
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
        description: error.message || "Error al actualizar el estado",
        variant: "destructive",
      });
    },
  });

  const handleVote = (voteType: 'up' | 'down') => {
    if (!canVote) return;
    voteMutation.mutate(voteType);
  };

  const handleStatusChange = (status: 'approved' | 'rejected') => {
    if (!isAdmin) return;
    statusMutation.mutate(status);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'tecnologia': return 'Tecnología';
      case 'marketing': return 'Marketing';
      case 'producto': return 'Producto';
      case 'proceso': return 'Proceso';
      case 'otros': return 'Otros';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tecnologia': return 'bg-blue-100 text-blue-700';
      case 'marketing': return 'bg-pink-100 text-pink-700';
      case 'producto': return 'bg-green-100 text-green-700';
      case 'proceso': return 'bg-purple-100 text-purple-700';
      case 'otros': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Fecha desconocida';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'hace menos de 1 hora';
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <Card className={`bg-white shadow-sm border border-gray-200 overflow-hidden ${
      idea.status === 'rejected' ? 'opacity-75' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{idea.title}</h3>
            <p className="text-gray-600 mb-3">{idea.description}</p>
            
            {/* Meta Information */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>
                Por: {idea.author.firstName && idea.author.lastName 
                  ? `${idea.author.firstName} ${idea.author.lastName}`
                  : idea.author.email || 'Usuario'}
              </span>
              <span className={`px-2 py-1 rounded-full ${getCategoryColor(idea.category)}`}>
                {getCategoryLabel(idea.category)}
              </span>
              <span>{formatTimeAgo(idea.createdAt)}</span>
            </div>
          </div>
          
          {/* Status Badge */}
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(idea.status || 'pending')}`}>
            {getStatusLabel(idea.status || 'pending')}
          </span>
        </div>

        {/* Voting Section */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {/* Thumbs Up */}
              <Button
                onClick={() => handleVote('up')}
                disabled={!canVote || voteMutation.isPending}
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors ${
                  idea.userVote === 'up'
                    ? 'bg-green-50 text-green-600 cursor-not-allowed'
                    : canVote
                    ? 'hover:bg-green-50 hover:text-green-600'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <ThumbsUp className={`w-5 h-5 ${
                  idea.userVote === 'up' ? 'fill-current' : ''
                }`} />
                <span className="text-sm font-medium">{idea.upvotes}</span>
              </Button>
              
              {/* Thumbs Down */}
              <Button
                onClick={() => handleVote('down')}
                disabled={!canVote || voteMutation.isPending}
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors ${
                  idea.userVote === 'down'
                    ? 'bg-red-50 text-red-600 cursor-not-allowed'
                    : canVote
                    ? 'hover:bg-red-50 hover:text-red-600'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <ThumbsDown className={`w-5 h-5 ${
                  idea.userVote === 'down' ? 'fill-current' : ''
                }`} />
                <span className="text-sm font-medium">{idea.downvotes}</span>
              </Button>
            </div>
            
            {/* Vote Status Message */}
            {hasVoted && canVote && (
              <span className="text-sm text-gray-500">Ya votaste</span>
            )}
            {idea.status === 'rejected' && (
              <span className="text-sm text-red-600">Rechazada - Votación cerrada</span>
            )}
          </div>

          {/* Admin Controls */}
          {isAdmin && idea.status === 'pending' && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleStatusChange('approved')}
                disabled={statusMutation.isPending}
                size="sm"
                className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Aceptar</span>
              </Button>
              <Button
                onClick={() => handleStatusChange('rejected')}
                disabled={statusMutation.isPending}
                size="sm"
                className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Rechazar</span>
              </Button>
            </div>
          )}
          
          {/* Status Messages for Non-Pending Ideas */}
          {idea.status === 'approved' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Aprobada por Admin</span>
            </div>
          )}
          {idea.status === 'rejected' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Rechazada por Admin</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
