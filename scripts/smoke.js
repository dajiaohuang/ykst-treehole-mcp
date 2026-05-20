const { authSummary } = require("../src/session");
const pb = require("../src/generated/treehole_pb.js");
const { Thread } = require("../src/generated/thread_pb.js");
const { Post } = require("../src/generated/post_pb.js");

const empty = new pb.EmptyRequest();
const thread = new Thread();
thread.setTitle("smoke");
thread.setContent("smoke");
thread.setCategoryId(1);
const post = new Post();
post.setThreadId(1);
post.setContent("smoke");

console.log(JSON.stringify({
  ok: true,
  auth: authSummary(),
  emptyBytes: empty.serializeBinary().length,
  thread: thread.toObject(false),
  post: post.toObject(false),
}, null, 2));
