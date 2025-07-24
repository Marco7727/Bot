import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, moderator, admin, super_admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discord users table for bot
export const discordUsers = pgTable("discord_users", {
  id: varchar("id").primaryKey().notNull(), // Discord user ID
  username: varchar("username").notNull(),
  displayName: varchar("display_name"),
  avatar: varchar("avatar"),
  role: varchar("role").default("user"), // user, moderator, admin, super_admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ideas table
export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(),
  authorId: varchar("author_id").notNull().references(() => discordUsers.id),
  status: varchar("status").default("pending"), // pending, approved, rejected
  messageId: varchar("message_id"), // Discord message ID for the idea
  channelId: varchar("channel_id"), // Discord channel ID where the idea was posted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Votes table
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").notNull().references(() => ideas.id),
  userId: varchar("user_id").notNull().references(() => discordUsers.id),
  voteType: varchar("vote_type").notNull(), // up, down
  createdAt: timestamp("created_at").defaultNow(),
});

// Server configuration table
export const serverConfig = pgTable("server_config", {
  id: serial("id").primaryKey(),
  guildId: varchar("guild_id").notNull().unique(),
  suggestionsChannelId: varchar("suggestions_channel_id"), // Canal donde se envían sugerencias
  approvalRoleIds: jsonb("approval_role_ids").default([]), // Roles que pueden aprobar/rechazar
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ideas: many(ideas),
  votes: many(votes),
}));

export const discordUsersRelations = relations(discordUsers, ({ many }) => ({
  ideas: many(ideas),
  votes: many(votes),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  author: one(discordUsers, {
    fields: [ideas.authorId],
    references: [discordUsers.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  idea: one(ideas, {
    fields: [votes.ideaId],
    references: [ideas.id],
  }),
  user: one(discordUsers, {
    fields: [votes.userId],
    references: [discordUsers.id],
  }),
}));

// Insert schemas
export const insertIdeaSchema = createInsertSchema(ideas).omit({
  id: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const updateUserRoleSchema = z.object({
  username: z.string().min(1, "Username is required"),
  role: z.enum(["user", "moderator", "admin", "super_admin"]),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type DiscordUser = typeof discordUsers.$inferSelect;
export type UpsertDiscordUser = typeof discordUsers.$inferInsert;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideas.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;

// Discord-specific schemas
export const insertDiscordUserSchema = createInsertSchema(discordUsers).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateDiscordUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["user", "moderator", "admin", "super_admin"]),
});

export type InsertDiscordUser = z.infer<typeof insertDiscordUserSchema>;
export type UpdateDiscordUserRole = z.infer<typeof updateDiscordUserRoleSchema>;

// Extended types for API responses
export type IdeaWithAuthorAndVotes = Idea & {
  author: Pick<DiscordUser, 'id' | 'username' | 'displayName'>;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
};
