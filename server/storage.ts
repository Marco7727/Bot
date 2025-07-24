import {
  users,
  ideas,
  votes,
  type User,
  type UpsertUser,
  type InsertIdea,
  type Idea,
  type InsertVote,
  type Vote,
  type IdeaWithAuthorAndVotes,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  
  // Idea operations
  createIdea(idea: InsertIdea): Promise<Idea>;
  getIdeas(): Promise<IdeaWithAuthorAndVotes[]>;
  getIdea(id: number): Promise<IdeaWithAuthorAndVotes | undefined>;
  updateIdeaStatus(id: number, status: string): Promise<Idea | undefined>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getUserVote(ideaId: number, userId: string): Promise<Vote | undefined>;
  deleteVote(ideaId: number, userId: string): Promise<void>;
  
  // Stats
  getStats(): Promise<{ pending: number; approved: number; rejected: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Idea operations
  async createIdea(ideaData: InsertIdea): Promise<Idea> {
    const [idea] = await db.insert(ideas).values(ideaData).returning();
    return idea;
  }

  async getIdeas(): Promise<IdeaWithAuthorAndVotes[]> {
    const result = await db
      .select({
        idea: ideas,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        upvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'up' THEN 1 ELSE 0 END), 0)`,
        downvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'down' THEN 1 ELSE 0 END), 0)`,
      })
      .from(ideas)
      .leftJoin(users, eq(ideas.authorId, users.id))
      .leftJoin(votes, eq(ideas.id, votes.ideaId))
      .groupBy(ideas.id, users.id, users.firstName, users.lastName, users.email)
      .orderBy(desc(ideas.createdAt));

    return result.map(row => ({
      ...row.idea,
      author: row.author,
      upvotes: Number(row.upvotes),
      downvotes: Number(row.downvotes),
    }));
  }

  async getIdea(id: number): Promise<IdeaWithAuthorAndVotes | undefined> {
    const [result] = await db
      .select({
        idea: ideas,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        upvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'up' THEN 1 ELSE 0 END), 0)`,
        downvotes: sql<number>`COALESCE(SUM(CASE WHEN ${votes.voteType} = 'down' THEN 1 ELSE 0 END), 0)`,
      })
      .from(ideas)
      .leftJoin(users, eq(ideas.authorId, users.id))
      .leftJoin(votes, eq(ideas.id, votes.ideaId))
      .where(eq(ideas.id, id))
      .groupBy(ideas.id, users.id, users.firstName, users.lastName, users.email);

    if (!result) return undefined;

    return {
      ...result.idea,
      author: result.author,
      upvotes: Number(result.upvotes),
      downvotes: Number(result.downvotes),
    };
  }

  async updateIdeaStatus(id: number, status: string): Promise<Idea | undefined> {
    const [idea] = await db
      .update(ideas)
      .set({ status, updatedAt: new Date() })
      .where(eq(ideas.id, id))
      .returning();
    return idea;
  }

  // Vote operations
  async createVote(voteData: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(voteData).returning();
    return vote;
  }

  async getUserVote(ideaId: number, userId: string): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.ideaId, ideaId), eq(votes.userId, userId)));
    return vote;
  }

  async deleteVote(ideaId: number, userId: string): Promise<void> {
    await db
      .delete(votes)
      .where(and(eq(votes.ideaId, ideaId), eq(votes.userId, userId)));
  }

  // Stats
  async getStats(): Promise<{ pending: number; approved: number; rejected: number }> {
    const [result] = await db
      .select({
        pending: sql<number>`COUNT(CASE WHEN ${ideas.status} = 'pending' THEN 1 END)`,
        approved: sql<number>`COUNT(CASE WHEN ${ideas.status} = 'approved' THEN 1 END)`,
        rejected: sql<number>`COUNT(CASE WHEN ${ideas.status} = 'rejected' THEN 1 END)`,
      })
      .from(ideas);

    return {
      pending: Number(result.pending),
      approved: Number(result.approved),
      rejected: Number(result.rejected),
    };
  }
}

export const storage = new DatabaseStorage();
