import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { postMediaUpload } from "../middleware/upload.middleware";
import {
  createPost,
  getFeedPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  editComment,
  toggleCommentReaction,
  getUserPosts,
  votePoll,
  searchUsers,
  trackPostView,
  getPostAnalytics,
} from "../controllers/feed.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Post CRUD
router.post("/posts", postMediaUpload, createPost);
router.get("/posts", getFeedPosts);
router.get("/posts/:postId", getPost);
router.put("/posts/:postId", postMediaUpload, updatePost);
router.delete("/posts/:postId", deletePost);

// Like system
router.post("/posts/:postId/like", toggleLike);

// Poll voting
router.post("/polls/:optionId/vote", votePoll);

// Comments
router.get("/posts/:postId/comments", getComments);
router.post("/posts/:postId/comments", addComment);
router.put("/comments/:commentId", editComment);
router.delete("/comments/:commentId", deleteComment);
router.post("/comments/:commentId/react", toggleCommentReaction);

// User posts
router.get("/users/:userId/posts", getUserPosts);

// Search users (for mentions)
router.get("/search/users", searchUsers);

// Analytics endpoints
router.post("/posts/:id/view", trackPostView); // No auth required (guests can view)
router.get("/posts/:id/analytics", getPostAnalytics); // Auth required (only author)

export default router;
