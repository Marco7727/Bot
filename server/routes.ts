import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertIdeaSchema, insertVoteSchema, updateUserRoleSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoints para UptimeRobot (sin autenticación)
  app.get('/health', (_req, res) => {
    const healthStatus = {
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'IdeaBox Discord Bot',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(healthStatus);
  });

  app.get('/bot-status', (_req, res) => {
    const botStatus = {
      bot: 'active',
      message: 'Discord bot is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      commands: ['idea', 'ideas', 'stats', 'setrango'],
      database_connected: true
    };
    
    res.status(200).json(botStatus);
  });

  // Endpoint adicional para UptimeRobot con ping simple
  app.get('/ping', (_req, res) => {
    res.status(200).send('pong');
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Ideas routes
  app.get('/api/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ideas = await storage.getIdeas();
      
      // Add user vote information to each idea
      const ideasWithUserVotes = await Promise.all(
        ideas.map(async (idea) => {
          const userVote = await storage.getUserVote(idea.id, userId);
          return {
            ...idea,
            userVote: userVote?.voteType || null,
          };
        })
      );
      
      res.json(ideasWithUserVotes);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      res.status(500).json({ message: "Failed to fetch ideas" });
    }
  });

  app.post('/api/ideas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ideaData = insertIdeaSchema.parse(req.body);
      
      const idea = await storage.createIdea({
        ...ideaData,
        authorId: userId,
      });
      
      res.status(201).json(idea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating idea:", error);
      res.status(500).json({ message: "Failed to create idea" });
    }
  });

  // Voting routes
  app.post('/api/ideas/:ideaId/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ideaId = parseInt(req.params.ideaId);
      const { voteType } = insertVoteSchema.parse({ ...req.body, ideaId, userId });

      // Check if user already voted
      const existingVote = await storage.getUserVote(ideaId, userId);
      
      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Same vote - remove it
          await storage.deleteVote(ideaId, userId);
          return res.json({ message: "Vote removed" });
        } else {
          // Different vote - delete old and create new
          await storage.deleteVote(ideaId, userId);
        }
      }

      // Create new vote
      const vote = await storage.createVote({
        ideaId,
        userId,
        voteType,
      });

      res.status(201).json(vote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to create vote" });
    }
  });

  // Admin routes
  app.patch('/api/ideas/:ideaId/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Check if user has admin privileges
      if (!user || !['admin', 'super_admin', 'moderator'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const ideaId = parseInt(req.params.ideaId);
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const idea = await storage.updateIdeaStatus(ideaId, status);
      
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }

      res.json(idea);
    } catch (error) {
      console.error("Error updating idea status:", error);
      res.status(500).json({ message: "Failed to update idea status" });
    }
  });

  app.patch('/api/users/role', isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
      
      // Check if user has super admin privileges
      if (!adminUser || adminUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super admins can assign roles" });
      }

      const { username, role } = updateUserRoleSchema.parse(req.body);
      
      // Find user by email (assuming username is email)
      const targetUser = await storage.getUserByEmail(username);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUserRole(targetUser.id, role);
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Stats route
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Check if user has admin privileges
      if (!user || !['admin', 'super_admin', 'moderator'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
