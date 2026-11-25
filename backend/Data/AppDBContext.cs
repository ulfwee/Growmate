
using System.Reflection.Emit;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDBContext : DbContext
{
    public AppDBContext(DbContextOptions<AppDBContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Interest> Interests => Set<Interest>();
    public DbSet<UserInterest> UserInterests => Set<UserInterest>();
    public DbSet<ClubCategory> ClubCategories => Set<ClubCategory>();
    public DbSet<Club> Clubs => Set<Club>();
    public DbSet<ClubMember> ClubMembers => Set<ClubMember>();
    public DbSet<ClubJoinRequest> ClubJoinRequests => Set<ClubJoinRequest>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<GoalMilestone> GoalMilestones => Set<GoalMilestone>();
    public DbSet<UserTask> Tasks => Set<UserTask>();
    public DbSet<TaskOccurrence> TaskOccurrences => Set<TaskOccurrence>();
    public DbSet<GroupGoal> GroupGoals => Set<GroupGoal>();
    public DbSet<GroupGoalParticipant> GroupGoalParticipants => Set<GroupGoalParticipant>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<PostReaction> PostReactions => Set<PostReaction>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<UserAchievement> UserAchievements => Set<UserAchievement>();
    public DbSet<UserXpHistory> UserXpHistory => Set<UserXpHistory>();
    public DbSet<ClubInterest> ClubInterests => Set<ClubInterest>();
    public DbSet<GroupGoalTask> GroupGoalTasks => Set<GroupGoalTask>();
    public DbSet<GroupGoalTaskCompletion> GroupGoalTaskCompletions => Set<GroupGoalTaskCompletion>();
    public DbSet<ClubAnnouncement> ClubAnnouncements => Set<ClubAnnouncement>();
    public DbSet<ClubAnnouncementLike> ClubAnnouncementLikes => Set<ClubAnnouncementLike>();
    public DbSet<ClubEvent> ClubEvents => Set<ClubEvent>();
    public DbSet<ClubEventParticipant> ClubEventParticipants => Set<ClubEventParticipant>();
    public DbSet<ClubPointTransaction> ClubPointTransactions => Set<ClubPointTransaction>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<GroupGoalTaskSubmission> GroupGoalTaskSubmissions => Set<GroupGoalTaskSubmission>();
    public DbSet<TaskSubmissionAttachment> TaskSubmissionAttachments => Set<TaskSubmissionAttachment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.Username).HasColumnName("username").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.GoogleId).HasColumnName("google_id").HasMaxLength(255);
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).HasDefaultValue("user").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("user_profiles");

            entity.HasKey(e => e.UserId);

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(100);
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(100);
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.Bio).HasColumnName("bio").HasMaxLength(1000);
            entity.Property(e => e.BirthDate).HasColumnName("birth_date").HasColumnType("date");
            entity.Property(e => e.TotalXp).HasColumnName("total_xp").HasDefaultValue(0);
            entity.Property(e => e.CurrentStreak).HasColumnName("current_streak").HasDefaultValue(0);
            entity.Property(e => e.LongestStreak).HasColumnName("longest_streak").HasDefaultValue(0);
            entity.Property(p => p.LastActivityDate).HasColumnName("last_activity_date").HasColumnType("date");

            entity.HasOne(e => e.User).WithOne(u => u.Profile).HasForeignKey<UserProfile>(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<Interest>(entity =>
        {
            entity.ToTable("interests");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");

            entity.HasIndex(e => e.Name).IsUnique();
        });
        modelBuilder.Entity<ClubInterest>(entity =>
        {
            entity.ToTable("club_interests");

            entity.HasKey(ci => new { ci.ClubId, ci.InterestId });

            entity.Property(ci => ci.ClubId).HasColumnName("club_id");
            entity.Property(ci => ci.InterestId).HasColumnName("interest_id");

            entity.HasOne(ci => ci.Club).WithMany(c => c.Interests).HasForeignKey(ci => ci.ClubId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ci => ci.Interest).WithMany(i => i.ClubInterests).HasForeignKey(ci => ci.InterestId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<UserInterest>(entity =>
        {
            entity.ToTable("user_interests");

            entity.HasKey(e => new { e.UserId, e.InterestId });

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.InterestId).HasColumnName("interest_id");

            entity.HasOne(e => e.User).WithMany(u => u.Interests).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Interest).WithMany(i => i.UserInterests).HasForeignKey(e => e.InterestId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<ClubCategory>(entity =>
        {
            entity.ToTable("club_categories");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IconUrl).HasColumnName("icon_url");

            entity.HasIndex(e => e.Name).IsUnique();
        });
        modelBuilder.Entity<Club>(entity =>
        {
            entity.ToTable("clubs");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").IsRequired();
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id");
            entity.Property(e => e.CoverUrl).HasColumnName("cover_url");
            entity.Property(e => e.Visibility).HasColumnName("visibility").HasMaxLength(20).HasDefaultValue("public").IsRequired();
            entity.Property(e => e.Rules).HasColumnName("rules");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Category).WithMany(c => c.Clubs).HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Owner).WithMany(u => u.OwnedClubs).HasForeignKey(e => e.OwnerId).OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.CategoryId).HasDatabaseName("idx_clubs_category");
            entity.HasIndex(e => e.OwnerId).HasDatabaseName("idx_clubs_owner");
            entity.HasIndex(e => e.Visibility).HasDatabaseName("idx_clubs_visibility");
        });
        modelBuilder.Entity<ClubMember>(entity =>
        {
            entity.ToTable("club_members");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ClubId).HasColumnName("club_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).HasDefaultValue("member").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("active").IsRequired();
            entity.Property(e => e.JoinedAt).HasColumnName("joined_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Club).WithMany(c => c.Members).HasForeignKey(e => e.ClubId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany(u => u.ClubMemberships).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ClubId, e.UserId }).IsUnique().HasDatabaseName("uq_club_member");
            entity.HasIndex(e => e.UserId).HasDatabaseName("idx_club_members_user");
            entity.HasIndex(e => new { e.ClubId, e.Status }).HasDatabaseName("idx_club_members_club_status");
        });
        modelBuilder.Entity<ClubJoinRequest>(entity =>
        {
            entity.ToTable("club_join_requests");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ClubId).HasColumnName("club_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Message).HasColumnName("message").HasMaxLength(1000);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("pending").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");

            entity.HasOne(e => e.Club).WithMany(c => c.JoinRequests).HasForeignKey(e => e.ClubId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ClubId, e.UserId }).IsUnique().HasFilter("status = 'pending'").HasDatabaseName("ux_pending_join_request");
            entity.HasIndex(e => new { e.ClubId, e.Status }).HasDatabaseName("idx_join_requests_club_status");
        });
        modelBuilder.Entity<ClubAnnouncement>(entity =>
        {
            entity.ToTable("club_announcements");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ClubId).HasColumnName("club_id").IsRequired();
            entity.Property(e => e.AuthorId).HasColumnName("author_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.AnnouncementType).HasColumnName("announcement_type").HasMaxLength(30).HasDefaultValue("general").IsRequired();
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.RelatedEventId).HasColumnName("related_event_id");
            entity.Property(e => e.RelatedGroupGoalId).HasColumnName("related_group_goal_id");
            entity.Property(e => e.IsPinned).HasColumnName("is_pinned").HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
        modelBuilder.Entity<ClubAnnouncementLike>(entity =>
        {
            entity.ToTable("club_announcement_likes");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.AnnouncementId).HasColumnName("announcement_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => new { e.AnnouncementId, e.UserId }).IsUnique().HasDatabaseName("idx_announcement_likes_announcement");
        });
        modelBuilder.Entity<ClubEvent>(entity =>
        {
            entity.ToTable("club_events");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ClubId).HasColumnName("club_id").IsRequired();
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CoverUrl).HasColumnName("cover_url");
            entity.Property(e => e.EventType).HasColumnName("event_type").HasMaxLength(20).HasDefaultValue("online").IsRequired();
            entity.Property(e => e.Location).HasColumnName("location");
            entity.Property(e => e.MeetingUrl).HasColumnName("meeting_url");
            entity.Property(e => e.StartsAt).HasColumnName("starts_at");
            entity.Property(e => e.EndsAt).HasColumnName("ends_at");
            entity.Property(e => e.MaxParticipants).HasColumnName("max_participants");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Club).WithMany(c => c.Events).HasForeignKey(e => e.ClubId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Creator).WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.ClubId, e.StartsAt });
        });
    
        modelBuilder.Entity<ClubEventParticipant>(entity =>
        {
            entity.ToTable("club_event_participants");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.EventId).HasColumnName("event_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.JoinedAt).HasColumnName("joined_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Event).WithMany(e => e.Participants).HasForeignKey(e => e.EventId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.EventId, e.UserId}).IsUnique();
        });
        modelBuilder.Entity<ClubPointTransaction>(entity =>
        {
            entity.ToTable("club_point_transactions");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ClubId).HasColumnName("club_id").IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.ActionType).HasColumnName("action_type").HasMaxLength(30).IsRequired();
            entity.Property(e => e.SourceId).HasColumnName("source_id").IsRequired();
            entity.Property(e => e.Points).HasColumnName("points").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Club).WithMany().HasForeignKey(e => e.ClubId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ClubId, e.UserId, e.ActionType, e.SourceId }).IsUnique();
        });
        modelBuilder.Entity<Goal>(entity =>
        {
            entity.ToTable("goals");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.StartDate).HasColumnName("start_date").HasColumnType("date").HasDefaultValueSql("CURRENT_DATE");
            entity.Property(e => e.Deadline).HasColumnName("deadline").HasColumnType("date");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("active").IsRequired();
            entity.Property(e => e.Progress).HasColumnName("progress").HasPrecision(5, 2).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User).WithMany(u => u.Goals).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.Status }).HasDatabaseName("idx_goals_user_status");
        });
        modelBuilder.Entity<GoalMilestone>(entity =>
        {
            entity.ToTable("goal_milestones");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.GoalId).HasColumnName("goal_id").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DueDate).HasColumnName("due_date").HasColumnType("date");
            entity.Property(e => e.IsCompleted).HasColumnName("is_completed").HasDefaultValue(false);
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Progress).HasColumnName("progress").HasPrecision(5, 2).HasDefaultValue(0);

            entity.HasOne(e => e.Goal).WithMany(g => g.Milestones).HasForeignKey(e => e.GoalId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<UserTask>(entity =>
        {
            entity.ToTable("tasks");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.GoalId).HasColumnName("goal_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.Priority).HasColumnName("priority").HasMaxLength(20).HasDefaultValue("medium").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("pending").IsRequired();
            entity.Property(e => e.IsRecurring).HasColumnName("is_recurring").HasDefaultValue(false);
            entity.Property(e => e.RecurrenceRule).HasColumnName("recurrence_rule").HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.MilestoneId).HasColumnName("milestone_id");
            entity.Property(e => e.StartDate).HasColumnName("start_date").HasColumnType("date");
            entity.Property(e => e.EndDate).HasColumnName("end_date").HasColumnType("date");

            entity.HasOne(e => e.User).WithMany(u => u.Tasks).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Goal).WithMany(g => g.Tasks).HasForeignKey(e => e.GoalId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(t => t.Milestone).WithMany(m => m.Tasks).HasForeignKey(t => t.MilestoneId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(t => t.Goal).WithMany(g => g.Tasks).HasForeignKey(t => t.GoalId).OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.UserId, e.Status }).HasDatabaseName("idx_tasks_user_status");
            entity.HasIndex(e => e.GoalId).HasDatabaseName("idx_tasks_goal");
        });
        modelBuilder.Entity<TaskOccurrence>(entity =>
        {
            entity.ToTable("task_occurrences");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.ScheduledDate).HasColumnName("scheduled_date").HasColumnType("date");
            entity.Property(e => e.IsCompleted).HasColumnName("is_completed").HasDefaultValue(false);
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");

            entity.HasOne(e => e.Task).WithMany(t => t.Occurrences).HasForeignKey(e => e.TaskId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.TaskId, e.ScheduledDate }).IsUnique();
        });
        modelBuilder.Entity<GroupGoal>(entity =>
        {
            entity.ToTable("group_goals");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ClubId).HasColumnName("club_id");
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.TargetValue).HasColumnName("target_value").HasPrecision(12, 2).IsRequired();
            entity.Property(e => e.CurrentValue).HasColumnName("current_value").HasPrecision(12, 2).HasDefaultValue(0);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50).IsRequired();
            entity.Property(e => e.StartDate).HasColumnName("start_date").HasColumnType("date").HasDefaultValueSql("CURRENT_DATE");
            entity.Property(e => e.EndDate).HasColumnName("end_date").HasColumnType("date").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).HasDefaultValue("active").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Club).WithMany(c => c.GroupGoals).HasForeignKey(e => e.ClubId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.ClubId).HasDatabaseName("idx_group_goals_club");
        });
        modelBuilder.Entity<GroupGoalParticipant>(entity =>
        {
            entity.ToTable("group_goal_participants");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.GroupGoalId).HasColumnName("group_goal_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Contribution).HasColumnName("contribution").HasPrecision(12, 2).HasDefaultValue(0);
            entity.Property(e => e.JoinedAt).HasColumnName("joined_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.GroupGoal).WithMany(g => g.Participants).HasForeignKey(e => e.GroupGoalId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.GroupGoalId, e.UserId }).IsUnique().HasDatabaseName("uq_group_goal_participant");
        });
        modelBuilder.Entity<GroupGoalTask>(entity =>
        {
            entity.ToTable("group_goal_tasks");

            entity.HasKey(e => e.Id);

            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.GroupGoalId).HasColumnName("group_goal_id");
            entity.Property(x => x.Title).HasColumnName("title");
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.SortOrder).HasColumnName("sort_order");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.DueDate).HasColumnName("due_date");
            entity.Property(e => e.ReviewCriteria).HasColumnName("review_criteria");
            entity.Property(e => e.RequiresAttachment).HasColumnName("requires_attachment").HasDefaultValue(false);

            entity.HasIndex(x => new { x.GroupGoalId, x.SortOrder });
        });
        modelBuilder.Entity<GroupGoalTaskCompletion>(entity =>
        {
            entity.ToTable("group_goal_task_completions");

            entity.HasKey(e => e.Id);

            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.GroupGoalTaskId).HasColumnName("group_goal_task_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");

            entity.HasIndex(x => new { x.GroupGoalTaskId, x.UserId }).IsUnique();
        });
        modelBuilder.Entity<Post>(entity =>
        {
            entity.ToTable("posts");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ClubId).HasColumnName("club_id");
            entity.Property(e => e.GoalId).HasColumnName("goal_id");
            entity.Property(e => e.GroupGoalId).HasColumnName("group_goal_id");
            entity.Property(e => e.PostType).HasColumnName("post_type").HasMaxLength(20).HasDefaultValue("update").IsRequired();
            entity.Property(e => e.Content).HasColumnName("content").IsRequired();
            entity.Property(e => e.ImageUrl).HasColumnName("image_url");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User).WithMany(u => u.Posts).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Club).WithMany(c => c.Posts).HasForeignKey(e => e.ClubId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Goal).WithMany(g => g.Posts).HasForeignKey(e => e.GoalId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.GroupGoal).WithMany(g => g.Posts).HasForeignKey(e => e.GroupGoalId).OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.CreatedAt).IsDescending().HasDatabaseName("idx_posts_created_at");
            entity.HasIndex(e => new { e.ClubId, e.CreatedAt }).IsDescending(false, true).HasDatabaseName("idx_posts_club_created");
            entity.HasIndex(e => e.UserId).HasDatabaseName("idx_posts_user");
        });
        modelBuilder.Entity<Comment>(entity =>
        {
            entity.ToTable("comments");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Content).HasColumnName("content").HasMaxLength(2000).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Post).WithMany(p => p.Comments).HasForeignKey(e => e.PostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany(u => u.Comments).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.PostId, e.CreatedAt }).HasDatabaseName("idx_comments_post");
        });
        modelBuilder.Entity<PostReaction>(entity =>
        {
            entity.ToTable("post_reactions");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ReactionType).HasColumnName("reaction_type").HasMaxLength(20).HasDefaultValue("like").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Post).WithMany(p => p.Reactions).HasForeignKey(e => e.PostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany(u => u.PostReactions).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique().HasDatabaseName("uq_post_user_reaction");
            entity.HasIndex(e => e.PostId).HasDatabaseName("idx_reactions_post");
        });
        modelBuilder.Entity<Achievement>(entity =>
        {
            entity.ToTable("achievements");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").IsRequired();
            entity.Property(e => e.IconUrl).HasColumnName("icon_url");
            entity.Property(e => e.XpReward).HasColumnName("xp_reward").HasDefaultValue(0);
            entity.Property(e => e.Code).HasColumnName("code");

            entity.HasIndex(e => e.Name).IsUnique();
        });
        modelBuilder.Entity<UserAchievement>(entity =>
        {
            entity.ToTable("user_achievements");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.AchievementId).HasColumnName("achievement_id");
            entity.Property(e => e.EarnedAt).HasColumnName("earned_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User).WithMany(u => u.Achievements).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Achievement).WithMany(a => a.UserAchievements).HasForeignKey(e => e.AchievementId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.AchievementId }).IsUnique().HasDatabaseName("uq_user_achievement");
            entity.HasIndex(e => e.UserId).HasDatabaseName("idx_user_achievements_user");
        });
        modelBuilder.Entity<UserXpHistory>(entity =>
        {
            entity.ToTable("user_xp_history");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.XpAmount).HasColumnName("xp_amount").IsRequired();
            entity.Property(e => e.Reason).HasColumnName("reason").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User).WithMany(u => u.XpHistory).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.CreatedAt }).IsDescending(false, true).HasDatabaseName("idx_xp_history_user");
        });
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");

            entity.HasKey(n => n.Id);

            entity.Property(n => n.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(n => n.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(n => n.Type).HasColumnName("type").HasMaxLength(60).IsRequired();
            entity.Property(n => n.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(n => n.Message).HasColumnName("message").IsRequired();
            entity.Property(n => n.TargetUrl).HasColumnName("target_url").HasMaxLength(500);
            entity.Property(n => n.IsRead).HasColumnName("is_read").HasDefaultValue(false);
            entity.Property(n => n.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(n => new { n.UserId, n.CreatedAt });
            entity.HasIndex(n => n.UserId).HasFilter("is_read = false");
        });
        modelBuilder.Entity<GroupGoalTaskSubmission>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("pending");
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("NOW()");
            
            entity.HasOne(e => e.GroupGoalTask).WithMany(t => t.Submissions).HasForeignKey(e => e.GroupGoalTaskId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Reviewer).WithMany().HasForeignKey(e => e.ReviewedBy).OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new
            {
                e.GroupGoalTaskId,
                e.UserId
            })
            .IsUnique()
            .HasFilter("status IN ('pending', 'approved')")
            .HasDatabaseName("ux_task_submission_active");

            entity.HasIndex(e => new
            {
                e.GroupGoalTaskId,
                e.Status
            })
            .HasDatabaseName("ix_task_submissions_task_status");

            entity.HasIndex(e => new
            {
                e.UserId,
                e.SubmittedAt
            })
            .IsDescending(false, true)
            .HasDatabaseName("ix_task_submissions_user");
        });
        modelBuilder.Entity<TaskSubmissionAttachment>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.FileName).HasMaxLength(255);
            entity.Property(e => e.ContentType).HasMaxLength(150);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Submission).WithMany(s => s.Attachments).HasForeignKey(e => e.SubmissionId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.SubmissionId).HasDatabaseName("ix_submission_attachments_submission");
        });
    }
}
