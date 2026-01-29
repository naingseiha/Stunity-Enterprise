import { Request, Response } from "express";
import { prisma } from "../config/database";
import { storageService } from "../services/storage.service";
import { socialNotificationService } from "../services/social-notification.service";
import { socketService } from "../services/socket.service";

/**
 * Create a new post
 * POST /api/feed/posts
 */
export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    let {
      content,
      postType,
      visibility,
      pollOptions,
      pollExpiresAt,
      pollAllowMultiple,
      pollMaxChoices,
      pollIsAnonymous,
      // Assignment fields
      assignmentDueDate,
      assignmentPoints,
      assignmentSubmissionType,
      // Course fields
      courseCode,
      courseLevel,
      courseDuration,
      // Announcement fields
      announcementUrgency,
      announcementExpiryDate,
      // Tutorial fields
      tutorialDifficulty,
      tutorialEstimatedTime,
      tutorialPrerequisites,
      // Exam fields
      examDate,
      examDuration,
      examTotalPoints,
      examPassingScore,
      // Resource fields
      resourceType,
      resourceUrl,
      // Research fields
      researchField,
      researchCollaborators,
      // Project fields
      projectStatus,
      projectDeadline,
      projectTeamSize,
      // Quiz fields
      quizQuestions
    } = req.body;

    // ✅ Parse pollOptions if it's a JSON string (from FormData)
    if (typeof pollOptions === 'string') {
      try {
        pollOptions = JSON.parse(pollOptions);
      } catch (e) {
        console.error("Failed to parse pollOptions:", e);
        pollOptions = undefined;
      }
    }

    // ✅ Parse quizQuestions if it's a JSON string (from FormData)
    if (typeof quizQuestions === 'string') {
      try {
        quizQuestions = JSON.parse(quizQuestions);
      } catch (e) {
        console.error("Failed to parse quizQuestions:", e);
        quizQuestions = undefined;
      }
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Post content is required",
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Post content must be 2000 characters or less",
      });
    }

    // Validate poll options if POLL type
    if (postType === "POLL") {
      if (!pollOptions || !Array.isArray(pollOptions) || pollOptions.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Poll must have at least 2 options",
        });
      }
      if (pollOptions.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Poll can have maximum 10 options",
        });
      }
      // Validate poll expiry date
      if (pollExpiresAt) {
        const expiryDate = new Date(pollExpiresAt);
        if (expiryDate <= new Date()) {
          return res.status(400).json({
            success: false,
            message: "Poll expiry date must be in the future",
          });
        }
      }
      // Validate max choices
      if (pollAllowMultiple && pollMaxChoices) {
        const maxChoices = parseInt(pollMaxChoices);
        if (maxChoices < 2 || maxChoices > pollOptions.length) {
          return res.status(400).json({
            success: false,
            message: `Max choices must be between 2 and ${pollOptions.length}`,
          });
        }
      }
    }

    // Handle media uploads if present
    let mediaUrls: string[] = [];
    let mediaKeys: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await storageService.uploadPostMedia(
          file.buffer,
          userId!,
          file.originalname,
          file.mimetype
        );
        if (result.success && result.url && result.key) {
          mediaUrls.push(result.url);
          mediaKeys.push(result.key);
        }
      }
    }

    // Create post with type-specific fields
    const post = await prisma.post.create({
      data: {
        authorId: userId!,
        content: content.trim(),
        postType: postType || "ARTICLE",
        visibility: visibility || "SCHOOL",
        mediaUrls,
        mediaKeys,
        // Poll-specific fields
        ...(postType === "POLL" && {
          pollExpiresAt: pollExpiresAt ? new Date(pollExpiresAt) : null,
          pollAllowMultiple: pollAllowMultiple === true || pollAllowMultiple === 'true',
          pollMaxChoices: pollMaxChoices ? parseInt(pollMaxChoices) : null,
          pollIsAnonymous: pollIsAnonymous === true || pollIsAnonymous === 'true',
        }),
        // Assignment-specific fields
        ...(postType === "ASSIGNMENT" && {
          assignmentDueDate: assignmentDueDate ? new Date(assignmentDueDate) : null,
          assignmentPoints: assignmentPoints ? parseInt(assignmentPoints) : null,
          assignmentSubmissionType,
        }),
        // Course-specific fields
        ...(postType === "COURSE" && {
          courseCode,
          courseLevel,
          courseDuration,
        }),
        // Announcement-specific fields
        ...(postType === "ANNOUNCEMENT" && {
          announcementUrgency,
          announcementExpiryDate: announcementExpiryDate ? new Date(announcementExpiryDate) : null,
        }),
        // Tutorial-specific fields
        ...(postType === "TUTORIAL" && {
          tutorialDifficulty,
          tutorialEstimatedTime,
          tutorialPrerequisites,
        }),
        // Exam-specific fields
        ...(postType === "EXAM" && {
          examDate: examDate ? new Date(examDate) : null,
          examDuration: examDuration ? parseInt(examDuration) : null,
          examTotalPoints: examTotalPoints ? parseInt(examTotalPoints) : null,
          examPassingScore: examPassingScore ? parseInt(examPassingScore) : null,
        }),
        // Resource-specific fields
        ...(postType === "RESOURCE" && {
          resourceType,
          resourceUrl,
        }),
        // Research-specific fields
        ...(postType === "RESEARCH" && {
          researchField,
          researchCollaborators,
        }),
        // Project-specific fields
        ...(postType === "PROJECT" && {
          projectStatus,
          projectDeadline: projectDeadline ? new Date(projectDeadline) : null,
          projectTeamSize: projectTeamSize ? parseInt(projectTeamSize) : null,
        }),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
            student: {
              select: {
                khmerName: true,
                class: {
                  select: {
                    name: true,
                    grade: true,
                  },
                },
              },
            },
            teacher: {
              select: {
                khmerName: true,
                position: true,
              },
            },
            parent: {
              select: {
                khmerName: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Create poll options if POLL type
    if (postType === "POLL" && pollOptions && Array.isArray(pollOptions)) {
      await Promise.all(
        pollOptions.map((optionText: string, index: number) =>
          prisma.pollOption.create({
            data: {
              postId: post.id,
              text: optionText.trim(),
              position: index,
            },
          })
        )
      );
    }

    // Create quiz questions if QUIZ type
    if (postType === "QUIZ" && quizQuestions && Array.isArray(quizQuestions)) {
      await Promise.all(
        quizQuestions.map((question: any, index: number) =>
          prisma.quizQuestion.create({
            data: {
              postId: post.id,
              question: question.question || "",
              options: question.options || [],
              correctAnswer: question.correctAnswer || 0,
              points: question.points || 10,
              position: index,
              explanation: question.explanation || null,
            },
          })
        )
      );
    }

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: {
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked: false,
      },
    });
  } catch (error: any) {
    console.error("Create post error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create post",
    });
  }
};

/**
 * Get feed posts (paginated)
 * GET /api/feed/posts
 */
export const getFeedPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const postType = req.query.postType as string;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      OR: [
        { visibility: "PUBLIC" },
        { visibility: "SCHOOL" },
        { authorId: userId }, // Always show own posts
      ],
    };

    if (postType && postType !== "ALL") {
      where.postType = postType;
    }

    // Get posts with author info and poll options
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [
          { isPinned: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
              student: {
                select: {
                  khmerName: true,
                  class: {
                    select: {
                      name: true,
                      grade: true,
                    },
                  },
                },
              },
              teacher: {
                select: {
                  khmerName: true,
                  position: true,
                },
              },
              parent: {
                select: {
                  khmerName: true,
                },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    // Fetch poll options for POLL type posts
    const pollPostIds = posts.filter(p => p.postType === 'POLL').map(p => p.id);
    const pollOptions = pollPostIds.length > 0 
      ? await prisma.pollOption.findMany({
          where: { postId: { in: pollPostIds } },
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { votes: true }
            }
          }
        })
      : [];

    // Get user's votes
    const userVotes = userId && pollPostIds.length > 0
      ? await prisma.pollVote.findMany({
          where: {
            userId,
            postId: { in: pollPostIds }
          },
          select: {
            postId: true,
            optionId: true,
          }
        })
      : [];

    // Group poll options by postId
    const pollOptionsByPost = new Map<string, any[]>();
    pollOptions.forEach(option => {
      if (!pollOptionsByPost.has(option.postId)) {
        pollOptionsByPost.set(option.postId, []);
      }
      pollOptionsByPost.get(option.postId)!.push({
        id: option.id,
        text: option.text,
        position: option.position,
        votesCount: option._count.votes,
      });
    });

    // Map user votes by postId (now supports multiple votes)
    const userVotesByPost = new Map<string, string[]>();
    userVotes.forEach(vote => {
      if (!userVotesByPost.has(vote.postId)) {
        userVotesByPost.set(vote.postId, []);
      }
      userVotesByPost.get(vote.postId)!.push(vote.optionId);
    });

    // Check if current user liked each post
    const postIds = posts.map((p) => p.id);
    const userLikes = await prisma.like.findMany({
      where: {
        userId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });
    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    const postsWithLikeStatus = posts.map((post) => {
      const isPollExpired = post.pollExpiresAt && new Date() > post.pollExpiresAt;

      return {
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked: likedPostIds.has(post.id),
        // Add poll data if POLL type
        ...(post.postType === 'POLL' && {
          pollOptions: pollOptionsByPost.get(post.id) || [],
          userVotes: userVotesByPost.get(post.id) || [],
          totalVotes: (pollOptionsByPost.get(post.id) || [])
            .reduce((sum: number, opt: any) => sum + opt.votesCount, 0),
          isPollExpired: isPollExpired || false,
        }),
      };
    });

    res.json({
      success: true,
      data: postsWithLikeStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get feed posts error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get feed",
    });
  }
};

/**
 * Get single post by ID
 * GET /api/feed/posts/:postId
 */
export const getPost = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;

    // ✅ OPTIMIZED: Single query with all needed data
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
            student: {
              select: {
                khmerName: true,
                class: { select: { name: true, grade: true } },
              },
            },
            teacher: {
              select: { khmerName: true, position: true },
            },
            parent: {
              select: { khmerName: true },
            },
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
        // ✅ OPTIMIZED: Include like status in single query
        likes: {
          where: { userId: userId! },
          select: { id: true },
          take: 1,
        },
        // ✅ OPTIMIZED: Include poll options if it's a poll
        pollOptions: {
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { votes: true }
            },
            votes: {
              where: { userId: userId! },
              select: { id: true },
              take: 1,
            }
          }
        },
        // ✅ Include quiz questions if it's a quiz
        quizQuestions: {
          orderBy: { position: 'asc' },
        }
      },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Format poll options
    const formattedPollOptions = post.pollOptions?.map(option => ({
      id: option.id,
      text: option.text,
      position: option.position,
      votesCount: option._count.votes,
    }));

    // Get user's votes
    const userVotes = post.pollOptions
      ?.filter(option => option.votes.length > 0)
      .map(option => option.id) || [];

    res.json({
      success: true,
      data: {
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked: post.likes.length > 0, // ✅ No separate query needed
        pollOptions: formattedPollOptions,
        userVotes,
        totalVotes: formattedPollOptions?.reduce((sum, opt) => sum + opt.votesCount, 0),
      },
    });
  } catch (error: any) {
    console.error("Get post error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get post",
    });
  }
};

/**
 * Update a post
 * PUT /api/feed/posts/:postId
 */
export const updatePost = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { 
      content, 
      visibility, 
      mediaUrls, 
      mediaDeleted,
      // Poll fields
      pollOptions,
      pollExpiresAt,
      pollIsAnonymous,
      pollAllowMultiple,
      pollMaxChoices
    } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own posts",
      });
    }

    // Parse mediaUrls and mediaDeleted if they're strings
    let parsedMediaUrls: string[] = [];
    let parsedMediaDeleted: string[] = [];

    try {
      if (mediaUrls) {
        parsedMediaUrls = typeof mediaUrls === 'string' ? JSON.parse(mediaUrls) : mediaUrls;
      }
      if (mediaDeleted) {
        parsedMediaDeleted = typeof mediaDeleted === 'string' ? JSON.parse(mediaDeleted) : mediaDeleted;
      }
    } catch (error) {
      console.error("Error parsing media data:", error);
    }

    // Handle media deletions from storage
    if (parsedMediaDeleted && parsedMediaDeleted.length > 0) {
      for (const url of parsedMediaDeleted) {
        const keyIndex = post.mediaUrls.indexOf(url);
        if (keyIndex >= 0 && post.mediaKeys[keyIndex]) {
          try {
            await storageService.deleteFile(post.mediaKeys[keyIndex]);
            console.log(`Deleted media file: ${post.mediaKeys[keyIndex]}`);
          } catch (error) {
            console.error(`Failed to delete media file: ${post.mediaKeys[keyIndex]}`, error);
          }
        }
      }
    }

    // Handle new media uploads
    let newMediaUrls: string[] = [];
    let newMediaKeys: string[] = [];
    
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await storageService.uploadPostMedia(
          file.buffer,
          userId!,
          file.originalname,
          file.mimetype
        );
        if (result.success && result.url && result.key) {
          newMediaUrls.push(result.url);
          newMediaKeys.push(result.key);
        }
      }
    }

    // Build final media arrays
    let finalMediaUrls: string[] = [];
    let finalMediaKeys: string[] = [];

    if (parsedMediaUrls.length > 0 || newMediaUrls.length > 0) {
      // Keep existing media in the order specified
      for (const url of parsedMediaUrls) {
        const originalIndex = post.mediaUrls.indexOf(url);
        if (originalIndex >= 0) {
          finalMediaUrls.push(url);
          finalMediaKeys.push(post.mediaKeys[originalIndex]);
        }
      }
      // Add new media
      finalMediaUrls.push(...newMediaUrls);
      finalMediaKeys.push(...newMediaKeys);
    } else {
      // If no media specified, keep original
      finalMediaUrls = post.mediaUrls;
      finalMediaKeys = post.mediaKeys;
    }

    const updateData: any = { isEdited: true };
    if (content !== undefined) updateData.content = content.trim();
    if (visibility !== undefined) updateData.visibility = visibility;
    
    // Update media if changes were made
    if (parsedMediaUrls.length > 0 || parsedMediaDeleted.length > 0 || newMediaUrls.length > 0) {
      updateData.mediaUrls = finalMediaUrls;
      updateData.mediaKeys = finalMediaKeys;
    }

    // Handle poll options update for POLL type posts
    if (post.postType === "POLL") {
      // Parse pollOptions if it's a JSON string
      let parsedPollOptions = pollOptions;
      if (typeof pollOptions === 'string') {
        try {
          parsedPollOptions = JSON.parse(pollOptions);
        } catch (e) {
          console.error("Failed to parse pollOptions:", e);
        }
      }

      // Update poll options if provided
      if (parsedPollOptions && Array.isArray(parsedPollOptions)) {
        // Delete existing poll options
        await prisma.pollOption.deleteMany({
          where: { postId },
        });

        // Create new poll options
        await prisma.pollOption.createMany({
          data: parsedPollOptions.map((optionText: string, index: number) => ({
            postId,
            text: optionText,
            position: index,
            votesCount: 0,
          })),
        });
      }

      // Update poll settings
      if (pollExpiresAt !== undefined) {
        updateData.pollExpiresAt = pollExpiresAt ? new Date(pollExpiresAt) : null;
      }
      if (pollIsAnonymous !== undefined) {
        updateData.pollIsAnonymous = pollIsAnonymous === true || pollIsAnonymous === 'true';
      }
      if (pollAllowMultiple !== undefined) {
        updateData.pollAllowMultiple = pollAllowMultiple === true || pollAllowMultiple === 'true';
      }
      if (pollMaxChoices !== undefined) {
        updateData.pollMaxChoices = pollMaxChoices ? parseInt(pollMaxChoices as string) : null;
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
            student: {
              select: {
                khmerName: true,
                class: { select: { name: true, grade: true } },
              },
            },
            teacher: {
              select: { khmerName: true, position: true },
            },
            parent: {
              select: { khmerName: true },
            },
          },
        },
        pollOptions: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Post updated successfully",
      data: {
        ...updatedPost,
        likesCount: updatedPost._count.likes,
        commentsCount: updatedPost._count.comments,
      },
    });
  } catch (error: any) {
    console.error("Update post error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update post",
    });
  }
};

/**
 * Delete a post
 * DELETE /api/feed/posts/:postId
 */
export const deletePost = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user is author or admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (post.authorId !== userId && user?.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
      });
    }

    // Delete media from R2
    for (const key of post.mediaKeys) {
      await storageService.deleteFile(key);
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete post error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete post",
    });
  }
};

/**
 * Like/Unlike a post
 * POST /api/feed/posts/:postId/like
 */
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: userId!,
        },
      },
    });

    let isLiked: boolean;
    let likesCount: number;

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.like.delete({
          where: { id: existingLike.id },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      isLiked = false;
      likesCount = post.likesCount - 1;

      // Broadcast post update to all connected clients
      socketService.broadcast("post:updated", {
        postId,
        likesCount,
        type: "unlike",
        userId,
      });
    } else {
      // Like
      await prisma.$transaction([
        prisma.like.create({
          data: {
            postId,
            userId: userId!,
          },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      isLiked = true;
      likesCount = post.likesCount + 1;

      // Send real-time notification
      if (post.authorId !== userId) {
        socialNotificationService.notifyPostLike(postId, userId!).catch(console.error);
      }

      // Broadcast post update to all connected clients
      socketService.broadcast("post:updated", {
        postId,
        likesCount,
        type: "like",
        userId,
      });
    }

    res.json({
      success: true,
      data: {
        isLiked,
        likesCount,
      },
    });
  } catch (error: any) {
    console.error("Toggle like error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle like",
    });
  }
};

/**
 * Get comments for a post
 * GET /api/feed/posts/:postId/comments
 */
export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || "new"; // new, old, top
    const skip = (page - 1) * limit;

    // Determine sort order
    let orderBy: any = { createdAt: "desc" }; // Default: newest first
    if (sort === "old") orderBy = { createdAt: "asc" };
    // "top" sorting will be done after fetching reactions

    // ✅ OPTIMIZED: Fetch comments and total count in parallel
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { 
          postId,
          parentId: null, // Only top-level comments
        },
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          postId: true,
          authorId: true,
          parentId: true,
          // ✅ Optimized author selection
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
              student: { select: { khmerName: true } },
              teacher: { select: { khmerName: true } },
              parent: { select: { khmerName: true } },
            },
          },
          // ✅ Optimized replies - only load 3 instead of 5
          replies: {
            take: 3,
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              updatedAt: true,
              postId: true,
              authorId: true,
              parentId: true,
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePictureUrl: true,
                  role: true,
                  student: { select: { khmerName: true } },
                  teacher: { select: { khmerName: true } },
                  parent: { select: { khmerName: true } },
                },
              },
              reactions: {
                where: { userId: userId! }, // ✅ Only fetch current user's reaction
                select: { type: true },
                take: 1,
              },
              _count: {
                select: { reactions: true },
              },
            },
          },
          _count: {
            select: { 
              replies: true,
              reactions: true, // ✅ Get total reaction count
            },
          },
          reactions: {
            where: { userId: userId! }, // ✅ Only fetch current user's reaction
            select: { type: true },
            take: 1,
          },
        },
      }),
      prisma.comment.count({ where: { postId, parentId: null } }),
    ]);

    // ✅ Get reaction counts by type for all comments
    const commentIds = comments.map((c) => c.id);
    const replyIds = comments.flatMap((c) => c.replies.map((r: any) => r.id));
    const allCommentIds = [...commentIds, ...replyIds];

    const reactionsByComment = await prisma.commentReaction.groupBy({
      by: ['commentId', 'type'],
      where: { commentId: { in: allCommentIds } },
      _count: { type: true },
    });

    // Create a map for quick lookup
    const reactionMap = new Map<string, { LIKE: number; LOVE: number; HELPFUL: number; INSIGHTFUL: number }>();
    allCommentIds.forEach((id) => {
      reactionMap.set(id, { LIKE: 0, LOVE: 0, HELPFUL: 0, INSIGHTFUL: 0 });
    });
    reactionsByComment.forEach((r) => {
      const counts = reactionMap.get(r.commentId)!;
      counts[r.type as 'LIKE' | 'LOVE' | 'HELPFUL' | 'INSIGHTFUL'] = r._count.type;
    });

    // ✅ OPTIMIZED: Enrichment logic with proper reaction counts
    const enrichedComments = comments.map((comment) => {
      const userReaction = comment.reactions[0]?.type || null;
      const reactionCounts = reactionMap.get(comment.id)!
      
      const enrichedReplies = comment.replies.map((reply: any) => {
        const replyUserReaction = reply.reactions[0]?.type || null;
        const replyReactionCounts = reactionMap.get(reply.id) || { LIKE: 0, LOVE: 0, HELPFUL: 0, INSIGHTFUL: 0 };
        return {
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          postId: reply.postId,
          authorId: reply.authorId,
          parentId: reply.parentId,
          author: reply.author,
          reactionCounts: replyReactionCounts,
          userReaction: replyUserReaction,
          repliesCount: 0,
          isEdited: reply.createdAt.getTime() !== reply.updatedAt.getTime(),
        };
      });

      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        postId: comment.postId,
        authorId: comment.authorId,
        parentId: comment.parentId,
        author: comment.author,
        replies: enrichedReplies,
        reactionCounts,
        userReaction,
        repliesCount: comment._count.replies,
        isEdited: comment.createdAt.getTime() !== comment.updatedAt.getTime(),
      };
    });

    // Sort by "top" if requested (most reactions)
    if (sort === "top") {
      enrichedComments.sort((a, b) => {
        const aTotal = Object.values(a.reactionCounts).reduce((sum: number, count) => sum + count, 0);
        const bTotal = Object.values(b.reactionCounts).reduce((sum: number, count) => sum + count, 0);
        return bTotal - aTotal;
      });
    }

    res.json({
      success: true,
      data: enrichedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get comments",
    });
  }
};

/**
 * Add a comment to a post
 * POST /api/feed/posts/:postId/comments
 */
export const addComment = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Comment must be 500 characters or less",
      });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // If replying, check parent comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: { author: true },
      });

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }

      // Create reply and update comment count
      const [comment] = await prisma.$transaction([
        prisma.comment.create({
          data: {
            postId,
            authorId: userId!,
            content: content.trim(),
            parentId, // Set parent for threading
          },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                role: true,
                student: { select: { khmerName: true } },
                teacher: { select: { khmerName: true } },
                parent: { select: { khmerName: true } },
              },
            },
          },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { commentsCount: { increment: 1 } },
        }),
      ]);

      // Send notification to parent comment author (reply notification)
      if (parentComment.authorId !== userId) {
        socialNotificationService.notifyCommentReply(parentId, userId!, comment.id).catch(console.error);
      }

      return res.status(201).json({
        success: true,
        message: "Reply added successfully",
        data: comment,
      });
    }

    // Create top-level comment and update comment count
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          authorId: userId!,
          content: content.trim(),
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
              student: { select: { khmerName: true } },
              teacher: { select: { khmerName: true } },
              parent: { select: { khmerName: true } },
            },
          },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    // Send real-time notification to post author
    if (post.authorId !== userId) {
      socialNotificationService.notifyPostComment(postId, userId!, comment.id).catch(console.error);
    }

    // Broadcast post comment count update
    socketService.broadcast("post:updated", {
      postId,
      commentsCount: post.commentsCount + 1,
      type: "comment",
      userId,
    });

    // Broadcast new comment to all users viewing this post
    socketService.broadcast("comment:added", {
      postId,
      comment,
      userId,
    });

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error: any) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add comment",
    });
  }
};

/**
 * Delete a comment
 * DELETE /api/feed/comments/:commentId
 */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user is comment author, post author, or admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const canDelete =
      comment.authorId === userId ||
      comment.post.authorId === userId ||
      user?.role === "ADMIN";

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this comment",
      });
    }

    // Delete comment and update count
    await prisma.$transaction([
      prisma.comment.delete({
        where: { id: commentId },
      }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete comment",
    });
  }
};

/**
 * Toggle comment reaction
 * POST /api/feed/comments/:commentId/react
 */
export const toggleCommentReaction = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { commentId } = req.params;
    const { type } = req.body; // LIKE, LOVE, HELPFUL, INSIGHTFUL

    if (!type || !["LIKE", "LOVE", "HELPFUL", "INSIGHTFUL"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reaction type",
      });
    }

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user already reacted with this type
    const existingReaction = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_type: {
          commentId,
          userId,
          type,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction (toggle off)
      await prisma.commentReaction.delete({
        where: {
          id: existingReaction.id,
        },
      });

      return res.json({
        success: true,
        message: "Reaction removed",
        action: "removed",
      });
    } else {
      // Add reaction
      await prisma.commentReaction.create({
        data: {
          commentId,
          userId,
          type,
        },
      });

      return res.json({
        success: true,
        message: "Reaction added",
        action: "added",
      });
    }
  } catch (error: any) {
    console.error("Toggle comment reaction error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle reaction",
    });
  }
};

/**
 * Edit a comment
 * PUT /api/feed/comments/:commentId
 */
export const editComment = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Comment must be 500 characters or less",
      });
    }

    // Check if comment exists and user is author
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
            student: { select: { khmerName: true } },
            teacher: { select: { khmerName: true } },
            parent: { select: { khmerName: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Comment updated successfully",
      data: updatedComment,
    });
  } catch (error: any) {
    console.error("Edit comment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to edit comment",
    });
  }
};

/**
 * Get user's posts
 * GET /api/feed/users/:userId/posts
 */
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId;
    const { userId: targetUserId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const isOwnProfile = currentUserId === targetUserId;

    // Build visibility filter
    const where: any = {
      authorId: targetUserId,
    };

    if (!isOwnProfile) {
      where.OR = [
        { visibility: "PUBLIC" },
        { visibility: "SCHOOL" },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
              student: {
                select: {
                  khmerName: true,
                  class: { select: { name: true, grade: true } },
                },
              },
              teacher: { select: { khmerName: true, position: true } },
              parent: { select: { khmerName: true } },
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    // Check if current user liked each post
    const postIds = posts.map((p) => p.id);
    const userLikes = await prisma.like.findMany({
      where: {
        userId: currentUserId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });
    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    const postsWithLikeStatus = posts.map((post) => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLiked: likedPostIds.has(post.id),
    }));

    res.json({
      success: true,
      data: postsWithLikeStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get user posts error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get user posts",
    });
  }
};

/**
 * Vote on a poll option
 * POST /api/feed/polls/:optionId/vote
 */
export const votePoll = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { optionId } = req.params;

    // Check if option exists and get the post
    const option = await prisma.pollOption.findUnique({
      where: { id: optionId },
      include: {
        post: {
          select: {
            id: true,
            pollExpiresAt: true,
            pollAllowMultiple: true,
            pollMaxChoices: true,
            pollIsAnonymous: true,
          },
        },
      },
    });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Poll option not found",
      });
    }

    const post = option.post;

    // Check if poll has expired
    if (post.pollExpiresAt && new Date() > post.pollExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "This poll has expired",
      });
    }

    // Check if user has already voted on this specific option
    const existingVoteOnOption = await prisma.pollVote.findUnique({
      where: {
        postId_optionId_userId: {
          postId: option.postId,
          optionId: optionId,
          userId: userId,
        },
      },
    });

    if (existingVoteOnOption) {
      return res.status(400).json({
        success: false,
        message: "You have already voted for this option",
      });
    }

    // If single choice poll, check if user has voted at all
    if (!post.pollAllowMultiple) {
      const existingVote = await prisma.pollVote.findFirst({
        where: {
          postId: option.postId,
          userId: userId,
        },
      });

      if (existingVote) {
        // Allow changing vote: Delete old vote and its count
        await prisma.$transaction([
          prisma.pollVote.delete({
            where: {
              id: existingVote.id,
            },
          }),
          prisma.pollOption.update({
            where: { id: existingVote.optionId },
            data: { votesCount: { decrement: 1 } },
          }),
        ]);
      }
    } else {
      // Multiple choice: check if max choices reached
      if (post.pollMaxChoices) {
        const userVotesCount = await prisma.pollVote.count({
          where: {
            postId: option.postId,
            userId: userId,
          },
        });

        if (userVotesCount >= post.pollMaxChoices) {
          return res.status(400).json({
            success: false,
            message: `You can only select up to ${post.pollMaxChoices} options`,
          });
        }
      }
    }

    // ✅ OPTIMIZED: Create vote and get updated data in one transaction
    const [_, __, updatedOptions, userVotes] = await prisma.$transaction([
      prisma.pollVote.create({
        data: {
          postId: option.postId,
          optionId: optionId,
          userId: userId,
        },
      }),
      prisma.pollOption.update({
        where: { id: optionId },
        data: { votesCount: { increment: 1 } },
      }),
      // ✅ Get updated options in same transaction
      prisma.pollOption.findMany({
        where: { postId: option.postId },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          text: true,
          position: true,
          votesCount: true,
        },
      }),
      // ✅ Get user votes in same transaction
      prisma.pollVote.findMany({
        where: {
          postId: option.postId,
          userId: userId,
        },
        select: {
          optionId: true,
        },
      }),
    ]);

    const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votesCount, 0);

    res.json({
      success: true,
      message: "Vote recorded successfully",
      data: {
        pollOptions: updatedOptions,
        userVotes: userVotes.map(v => v.optionId),
        totalVotes,
      },
    });
  } catch (error: any) {
    console.error("Vote poll error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to record vote",
    });
  }
};

/**
 * Search users for mentions
 * GET /api/feed/search/users?q=query
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const query = (q as string)?.trim() || "";

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Search in firstName, lastName, khmerName (students/teachers)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            student: {
              khmerName: {
                contains: query,
              },
            },
          },
          {
            teacher: {
              khmerName: {
                contains: query,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        role: true,
        student: {
          select: {
            khmerName: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
        teacher: {
          select: {
            khmerName: true,
            position: true,
          },
        },
      },
      take: 10, // Limit to 10 results for autocomplete
    });

    // Format results for mention component
    const formattedUsers = users.map((user) => {
      let displayName = `${user.firstName} ${user.lastName}`;
      let subtitle = user.role;

      if (user.role === "STUDENT" && user.student?.khmerName) {
        displayName = user.student.khmerName;
        subtitle = user.student.class?.name || "Student";
      } else if (user.role === "TEACHER" && user.teacher?.khmerName) {
        displayName = user.teacher.khmerName;
        subtitle = user.teacher.position || "Teacher";
      }

      return {
        id: user.id,
        name: displayName,
        avatar: user.profilePictureUrl,
        role: subtitle,
      };
    });

    res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error: any) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to search users",
    });
  }
};

/**
 * Track post view
 * POST /api/feed/posts/:id/view
 */
export const trackPostView = async (req: Request, res: Response) => {
  try {
    const { id: postId } = req.params;
    const userId = req.userId; // May be undefined for guests
    const { duration, source } = req.body;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Don't track view if user is the post author
    if (userId && userId === post.authorId) {
      return res.json({ success: true, message: "Own post view not tracked" });
    }

    // Check if user already viewed this post in last 24 hours (avoid duplicate tracking)
    if (userId) {
      const recentView = await prisma.postView.findFirst({
        where: {
          postId,
          userId,
          viewedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentView) {
        // Update duration if provided
        if (duration && duration > 0) {
          await prisma.postView.update({
            where: { id: recentView.id },
            data: { duration },
          });
        }
        return res.json({ success: true, message: "View already tracked" });
      }
    }

    // Create new view record
    await prisma.postView.create({
      data: {
        postId,
        userId: userId || null,
        duration: duration || null,
        source: source || "feed",
        ipAddress: req.ip || null,
      },
    });

    // Get updated view count
    const viewCount = await prisma.postView.count({
      where: { postId },
    });

    const uniqueViewCount = await prisma.postView.groupBy({
      by: ["userId"],
      where: { postId, userId: { not: null } },
      _count: true,
    });

    res.json({
      success: true,
      viewCount,
      uniqueViewCount: uniqueViewCount.length,
    });
  } catch (error) {
    console.error("❌ Track view error:", error);
    res.status(500).json({ error: "Failed to track view" });
  }
};

/**
 * Get post analytics
 * GET /api/feed/posts/:id/analytics
 */
export const getPostAnalytics = async (req: Request, res: Response) => {
  try {
    const { id: postId } = req.params;
    const userId = req.userId;
    const { dateFrom, dateTo, groupBy = "day" } = req.query;

    // Check if post exists and user is the author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Only post author can view analytics
    if (post.authorId !== userId) {
      return res.status(403).json({ error: "Not authorized to view analytics" });
    }

    // Parse date range
    const fromDate = dateFrom
      ? new Date(dateFrom as string)
      : new Date(post.createdAt);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    // Get all views for this post
    const views = await prisma.postView.findMany({
      where: {
        postId,
        viewedAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        id: true,
        userId: true,
        viewedAt: true,
        duration: true,
        source: true,
        user: {
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        viewedAt: "asc",
      },
    });

    // Calculate metrics
    const totalViews = views.length;
    const uniqueViews = new Set(
      views.filter((v) => v.userId).map((v) => v.userId)
    ).size;

    const totalLikes = post._count.likes;
    const totalComments = post._count.comments;

    // Engagement rate = (likes + comments) / unique views * 100
    const engagementRate =
      uniqueViews > 0
        ? (((totalLikes + totalComments) / uniqueViews) * 100).toFixed(2)
        : "0.00";

    // Group views by date
    const viewsByDate: { [key: string]: number } = {};
    views.forEach((view) => {
      const dateKey = view.viewedAt.toISOString().split("T")[0];
      viewsByDate[dateKey] = (viewsByDate[dateKey] || 0) + 1;
    });

    const viewsOverTime = Object.entries(viewsByDate).map(([date, count]) => ({
      date,
      views: count,
    }));

    // Top view sources
    const sourceCount: { [key: string]: number } = {};
    views.forEach((view) => {
      const src = view.source || "unknown";
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    });

    const topViewSources = Object.entries(sourceCount)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // Audience breakdown
    const roleCount: { [key: string]: number } = {
      STUDENT: 0,
      TEACHER: 0,
      ADMIN: 0,
      guest: 0,
    };
    views.forEach((view) => {
      if (!view.user) {
        roleCount.guest++;
      } else {
        roleCount[view.user.role] = (roleCount[view.user.role] || 0) + 1;
      }
    });

    const audienceBreakdown = {
      students: roleCount.STUDENT,
      teachers: roleCount.TEACHER,
      admins: roleCount.ADMIN,
      guests: roleCount.guest,
    };

    // Average duration
    const durationsWithValue = views.filter((v) => v.duration && v.duration > 0);
    const avgDuration =
      durationsWithValue.length > 0
        ? Math.round(
            durationsWithValue.reduce((sum, v) => sum + (v.duration || 0), 0) /
              durationsWithValue.length
          )
        : 0;

    // Peak times (group by hour)
    const hourCount: { [key: number]: number } = {};
    views.forEach((view) => {
      const hour = view.viewedAt.getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const peakTimes = Object.entries(hourCount)
      .map(([hour, count]) => ({ hour: parseInt(hour), views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5); // Top 5 peak hours

    res.json({
      overview: {
        totalViews,
        uniqueViews,
        likes: totalLikes,
        comments: totalComments,
        engagementRate: parseFloat(engagementRate),
      },
      viewsOverTime,
      topViewSources,
      audienceBreakdown,
      peakTimes,
      avgDuration,
    });
  } catch (error) {
    console.error("❌ Get analytics error:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
};
