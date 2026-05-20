const pb = require("./generated/treehole_pb.js");
const { Thread } = require("./generated/thread_pb.js");
const { Post } = require("./generated/post_pb.js");
const { BoolValue } = require("google-protobuf/google/protobuf/wrappers_pb.js");
const { unary } = require("./grpcWeb");
const { getHost, saveSession } = require("./session");

function toObject(message) {
  return message && typeof message.toObject === "function" ? message.toObject(false) : message;
}

function empty() {
  return new pb.EmptyRequest();
}

function limitValue(limit, fallback = 20, max = 50) {
  return Math.min(Math.max(Number(limit) || fallback, 1), max);
}

function boolValue(value) {
  const wrapper = new BoolValue();
  wrapper.setValue(Boolean(value));
  return wrapper;
}

function modelWithId(id) {
  const model = new pb.Model();
  model.setId(Number(id));
  return model;
}

function identityMessageFromObject(identityObject) {
  const identity = new pb.Identity();
  identity.setModel(modelWithId(identityObject.model?.id));
  identity.setUserId(Number(identityObject.userId));
  identity.setCode(identityObject.code || "");
  identity.setStatus(Number(identityObject.status || 0));
  identity.setType(Number(identityObject.type || 0));
  identity.setIsActive(Boolean(identityObject.isActive));
  identity.setIsSpecial(Boolean(identityObject.isSpecial));
  if (identityObject.remark) identity.setRemark(identityObject.remark);
  return identity;
}

function rateType(value) {
  const normalized = String(value || "normal").toLowerCase();
  if (normalized === "like" || normalized === "1") return pb.RateType.RATETYPELIKE;
  if (normalized === "hate" || normalized === "-1") return pb.RateType.RATETYPEHATE;
  return pb.RateType.RATETYPENORMAL;
}

function reportTarget(value) {
  const normalized = String(value || "thread").toLowerCase();
  return normalized === "post" ? pb.ReportTarget.REPORTTARGETPOST : pb.ReportTarget.REPORTTARGETTHREAD;
}

function reportType(value) {
  const normalized = String(value || "normal").toLowerCase();
  const map = {
    normal: pb.ReportType.REPORTTYPENORMAL,
    politics: pb.ReportType.REPORTTYPEPOLITICS,
    porn: pb.ReportType.REPORTTYPEPORN,
    contact: pb.ReportType.REPORTTYPECONTACT,
    abuse: pb.ReportType.REPORTTYPEABUSE,
    ky: pb.ReportType.REPORTTYPEKY,
  };
  return map[normalized] ?? pb.ReportType.REPORTTYPENORMAL;
}

function notificationType(value) {
  if (value === undefined || value === null || value === "all") return undefined;
  const normalized = String(value).toLowerCase();
  const map = {
    thread_replied: pb.NotificationType.NOTIFICATIONTYPETHREADREPLIED,
    post_replied: pb.NotificationType.NOTIFICATIONTYPEPOSTREPLIED,
    system: pb.NotificationType.NOTIFICATIONTYPESYSTEM,
  };
  return map[normalized] ?? Number(value);
}

function threadsQuery({ limit = 20, cursor = "", sort = pb.Sort.SORTDESC, categoryId, tagIds = [] } = {}) {
  const req = new pb.ThreadsQueryRequest();
  req.setSize(limitValue(limit));
  req.setLast(String(cursor || ""));
  req.setSort(sort);
  if (categoryId !== undefined && categoryId !== null) req.setCategoryId(Number(categoryId));
  if (Array.isArray(tagIds) && tagIds.length) req.setTagIdsList(tagIds.map(Number));
  return req;
}

function postsQuery({ threadId, limit = 15, cursor = 0, top = 0, onlyAuthor = false, sort = pb.Sort.SORTASC } = {}) {
  const req = new pb.PostsQueryRequestEx();
  req.setThreadId(Number(threadId));
  req.setSize(limitValue(limit, 15));
  req.setLast(Number(cursor) || 0);
  req.setTop(Number(top) || 0);
  req.setOnlyAuthor(Boolean(onlyAuthor));
  req.setSort(sort);
  req.setDirection(pb.LoadDirection.LOADDIRECTIONDOWN);
  return req;
}

async function activeIdentityMessage() {
  const user = await profile();
  const identityObject = (user.identitiesList || []).find((identity) => identity.isActive);
  if (!identityObject) {
    throw new Error("No active identity found. Use treehole_set_active_identity first.");
  }
  return identityMessageFromObject(identityObject);
}

async function getLoginUrl({ redirectUri = "https://web.treehole.space/auth/jaccount" } = {}) {
  const req = new pb.OAuthConfigRequest();
  req.setChannel(pb.OAuthLoginChannel.LOGINWITHJACCOUNT);
  req.setSource(pb.LoginSource.LOGINSOURCEWEB);
  const res = await unary("/model.TreeHole/GetOAuthConfig", req, pb.OAuthConfigResponse, { authRequired: false });
  const config = toObject(res);
  const loginUrl = new URL(config.authorizeUrl);
  loginUrl.searchParams.set("client_id", config.clientId);
  loginUrl.searchParams.set("redirect_uri", redirectUri);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("scope", (config.scopesList || []).join(" "));
  return { ...config, redirectUri, loginUrl: loginUrl.toString() };
}

async function loginWithCode(code) {
  const req = new pb.OAuthLoginRequest();
  req.setCode(code);
  req.setChannel(pb.OAuthLoginChannel.LOGINWITHJACCOUNT);
  req.setSource(pb.LoginSource.LOGINSOURCEWEB);
  req.setWebSource(pb.WebSource.WEBSOURCEPRODSERVER);
  const res = await unary("/model.TreeHole/OAuthLogin", req, pb.OAuthLoginResponse, { authRequired: false });
  const token = res.getToken();
  const saved = saveSession({ token, host: getHost() });
  return { authenticated: Boolean(token), ...saved };
}

async function loginWithCallbackUrl(callbackUrl) {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get("code");
  if (!code) {
    throw new Error("callbackUrl does not contain a code query parameter");
  }
  return loginWithCode(code);
}

async function profile() {
  return toObject(await unary("/model.TreeHole/GetProfile", empty(), pb.User));
}

async function listIdentities() {
  const user = await profile();
  return {
    account: user.account,
    identities: user.identitiesList || [],
  };
}

async function getIdentity({ identityId, code, active = false }) {
  const { identities } = await listIdentities();
  const identity = active
    ? identities.find((item) => item.isActive)
    : identities.find((item) => {
        if (identityId !== undefined && identityId !== null) return Number(item.model?.id) === Number(identityId);
        return String(item.code).toLowerCase() === String(code || "").toLowerCase();
      });
  if (!identity) {
    throw new Error("Identity not found");
  }
  return identity;
}

async function getActiveIdentity() {
  return getIdentity({ active: true });
}

async function setActiveIdentity(identityId) {
  const req = new pb.IDRequest();
  req.setId(Number(identityId));
  return toObject(await unary("/model.TreeHole/SetActiveIdentity", req, pb.User));
}

async function createIdentity() {
  return toObject(await unary("/model.TreeHole/CreateIdentity", empty(), pb.User));
}

async function disableIdentity(identityId) {
  const identityObject = await getIdentity({ identityId });
  return toObject(await unary("/model.TreeHole/DisableIdentity", identityMessageFromObject(identityObject), pb.User));
}

async function getCreateIdentityQuota() {
  return toObject(await unary("/model.TreeHole/GetCreateIdentityQuota", empty(), pb.QuotaResponse));
}

async function getThreadUserIdentities(threadId) {
  const req = new pb.PostsQueryRequest();
  req.setThreadId(Number(threadId));
  return toObject(await unary("/model.TreeHole/GetThreadUserIdentities", req, pb.IdentitiesResponse));
}

async function getSiteConfig() {
  return toObject(await unary("/model.TreeHole/GetSiteConfig", empty(), pb.SiteConfig));
}

async function listCategories() {
  const res = await unary("/model.TreeHole/GetAllCategories", empty(), pb.CategoriesResponse);
  return { categories: res.getCategoriesList().map(toObject) };
}

async function listTags({ all = false } = {}) {
  const req = new pb.TagsRequest();
  req.setAll(Boolean(all));
  const res = await unary("/model.TreeHole/GetAllTags", req, pb.TagsResponse);
  return { tags: res.getTagsList().map(toObject) };
}

async function listBrowsableTags() {
  const res = await unary("/model.TreeHole/GetBrowsableTags", empty(), pb.TagsResponse);
  return { tags: res.getTagsList().map(toObject) };
}

async function latestThreads(args) {
  const res = await unary("/model.TreeHole/GetLatestThreads", threadsQuery(args), pb.ThreadsResponse);
  const threads = res.getThreadsList().map(toObject);
  return { threads, nextCursor: threads.at(-1)?.lastReplyAt || "" };
}

async function userThreads(args) {
  const res = await unary("/model.TreeHole/GetUserThreads", threadsQuery(args), pb.ThreadsResponse);
  const threads = res.getThreadsList().map(toObject);
  return { threads, nextCursor: threads.at(-1)?.lastReplyAt || "" };
}

async function userFavoriteThreads(args) {
  const res = await unary("/model.TreeHole/GetUserFavThreads", threadsQuery(args), pb.ThreadsResponse);
  const threads = res.getThreadsList().map(toObject);
  return { threads, nextCursor: threads.at(-1)?.lastReplyAt || "" };
}

async function userParticipatedThreads(args) {
  const res = await unary("/model.TreeHole/GetUserParticipateThreads", threadsQuery(args), pb.ThreadsResponse);
  const threads = res.getThreadsList().map(toObject);
  return { threads, nextCursor: threads.at(-1)?.lastReplyAt || "" };
}

async function hotThreads(args) {
  const cursor = Number(args?.cursor || 0);
  const res = await unary("/model.TreeHole/GetHottestThreads", threadsQuery({ ...args, cursor }), pb.ThreadsResponse);
  const threads = res.getThreadsList().map(toObject);
  return { threads, nextCursor: String(cursor + threads.length) };
}

async function searchThreads({ keyword, limit = 20, offset = 0 }) {
  const req = new pb.SearchRequest();
  req.setKeyword(keyword);
  req.setPageSize(limitValue(limit));
  req.setOffset(Number(offset) || 0);
  const res = await unary("/model.TreeHole/SearchThreads", req, pb.ThreadsResponse);
  const threads = res.getThreadsList().map(toObject);
  return { threads, nextOffset: Number(offset || 0) + threads.length };
}

async function getThread(threadId) {
  const req = new pb.PostsQueryRequest();
  req.setThreadId(Number(threadId));
  req.setShouldStatistic(true);
  return toObject(await unary("/model.TreeHole/GetThread", req, Thread));
}

async function getPost(postId) {
  const req = new Post();
  req.setModel(modelWithId(postId));
  return toObject(await unary("/model.TreeHole/GetPost", req, Post));
}

async function getThreadPosts(args) {
  const res = await unary("/model.TreeHole/GetThreadPostsEx", postsQuery(args), pb.PostsResponse);
  const posts = res.getPostsList().map(toObject);
  return { posts, total: res.getTotal(), nextCursor: posts.at(-1)?.floor || 0 };
}

async function userPosts({ limit = 20, cursor = 0, top = 0, sort = pb.Sort.SORTDESC } = {}) {
  const req = new pb.PostsQueryRequest();
  req.setSize(limitValue(limit));
  req.setLast(Number(cursor) || 0);
  req.setTop(Number(top) || 0);
  req.setSort(sort);
  const res = await unary("/model.TreeHole/GetUserPosts", req, pb.PostsResponse);
  const posts = res.getPostsList().map(toObject);
  return { posts, total: res.getTotal(), nextCursor: posts.at(-1)?.floor || 0 };
}

async function createThread({ title, content, categoryId }) {
  const identity = await activeIdentityMessage();
  const req = new Thread();
  req.setTitle(title);
  req.setContent(content);
  req.setCategoryId(Number(categoryId));
  req.setIdentity(identity);
  req.setIdentityCode(identity.getCode());
  return toObject(await unary("/model.TreeHole/PutThread", req, Thread));
}

async function replyThread({ threadId, content, hideIdentity = false, replyToPostId, userThreadIdentityId }) {
  const req = new Post();
  req.setThreadId(Number(threadId));
  req.setContent(content);
  req.setHideIdentity(Boolean(hideIdentity));
  const identity = await activeIdentityMessage();
  req.setIdentity(identity);
  req.setIdentityCode(identity.getCode());
  if (replyToPostId !== undefined && replyToPostId !== null) req.setReplyToPostId(Number(replyToPostId));
  if (userThreadIdentityId !== undefined && userThreadIdentityId !== null) req.setUserThreadIdentityId(Number(userThreadIdentityId));
  return toObject(await unary("/model.TreeHole/PutPost", req, Post));
}

async function deleteThread(threadId) {
  const req = new Thread();
  req.setModel(modelWithId(threadId));
  return toObject(await unary("/model.TreeHole/DeleteThread", req, pb.EmptyRequest));
}

async function deletePost(postId) {
  const req = new Post();
  req.setModel(modelWithId(postId));
  return toObject(await unary("/model.TreeHole/DeletePost", req, pb.EmptyRequest));
}

async function rateThread({ threadId, type }) {
  const req = new pb.RateRequest();
  req.setId(Number(threadId));
  req.setType(rateType(type));
  return toObject(await unary("/model.TreeHole/RateThread", req, Thread));
}

async function ratePost({ postId, type }) {
  const req = new pb.RateRequest();
  req.setId(Number(postId));
  req.setType(rateType(type));
  return toObject(await unary("/model.TreeHole/RatePost", req, Post));
}

async function favoriteThread({ threadId, isFav }) {
  const req = new pb.FavRequest();
  req.setId(Number(threadId));
  if (isFav !== undefined && isFav !== null) req.setIsFav(Boolean(isFav));
  return toObject(await unary("/model.TreeHole/FavThread", req, Thread));
}

async function appreciateThread({ threadId, amount = 1 }) {
  const req = new pb.AppreciateRequest();
  req.setId(Number(threadId));
  req.setAmount(Number(amount) || 1);
  return toObject(await unary("/model.TreeHole/AppreciateThread", req, Thread));
}

async function appreciatePost({ postId, amount = 1 }) {
  const req = new pb.AppreciateRequest();
  req.setId(Number(postId));
  req.setAmount(Number(amount) || 1);
  return toObject(await unary("/model.TreeHole/AppreciatePost", req, Post));
}

async function putReport({ target, targetId, type }) {
  const user = await profile();
  const req = new pb.Report();
  req.setUserId(Number(user.model?.id));
  req.setTarget(reportTarget(target));
  req.setTargetId(Number(targetId));
  req.setType(reportType(type));
  return toObject(await unary("/model.TreeHole/PutReport", req, pb.Report));
}

async function unreadNotificationCount() {
  return toObject(await unary("/model.TreeHole/GetUnreadNotificationCount", empty(), pb.CountReply));
}

async function listNotifications({ limit = 20, cursor = "", onlyUnread = false, type } = {}) {
  const req = new pb.NotificationQueryRequest();
  req.setPageSize(limitValue(limit));
  req.setLast(String(cursor || ""));
  req.setOnlyUnread(Boolean(onlyUnread));
  const parsedType = notificationType(type);
  if (parsedType !== undefined && !Number.isNaN(parsedType)) req.setType(parsedType);
  const res = await unary("/model.TreeHole/GetAllNotifications", req, pb.NotificationResponse);
  const notifications = res.getNotificationsList().map(toObject);
  return { notifications, nextCursor: notifications.at(-1)?.model?.id || "" };
}

async function markNotificationRead(notificationId) {
  const req = new pb.Notification();
  req.setModel(modelWithId(notificationId));
  return toObject(await unary("/model.TreeHole/PutNotificationRead", req, pb.EmptyRequest));
}

async function markAllNotificationsRead() {
  return toObject(await unary("/model.TreeHole/PutAllNotificationRead", empty(), pb.EmptyRequest));
}

function subscribeRequest({ threadId, subscribePost, subscribeMention }) {
  const req = new pb.Subscribe();
  req.setThreadId(Number(threadId));
  if (subscribePost !== undefined && subscribePost !== null) req.setSubscribePost(boolValue(subscribePost));
  if (subscribeMention !== undefined && subscribeMention !== null) req.setSubscribeMention(boolValue(subscribeMention));
  return req;
}

async function getSubscribe(threadId) {
  return toObject(await unary("/model.TreeHole/GetSubscribe", subscribeRequest({ threadId }), pb.Subscribe));
}

async function putSubscribe(args) {
  return toObject(await unary("/model.TreeHole/PutSubscribe", subscribeRequest(args), pb.Subscribe));
}

async function checkIn() {
  return toObject(await unary("/model.TreeHole/CheckIn", empty(), pb.FishResponse));
}

async function getUploadUrl({ fileName, contentType, size, md5, width = 0, height = 0 }) {
  const req = new pb.UploadRequest();
  req.setFileName(fileName);
  req.setContentType(contentType);
  req.setSize(Number(size));
  req.setMd5(md5);
  req.setWidth(Number(width) || 0);
  req.setHeight(Number(height) || 0);
  return toObject(await unary("/model.TreeHole/GetUploadUrl", req, pb.UploadResponse));
}

async function getDownloadUrl({ uuid, name = "", width = 0, height = 0 }) {
  const req = new pb.UploadResponse();
  req.setUuid(uuid);
  if (name) req.setName(name);
  req.setWidth(Number(width) || 0);
  req.setHeight(Number(height) || 0);
  return toObject(await unary("/model.TreeHole/GetDownloadUrl", req, pb.UploadResponse));
}

async function getUserStats() {
  const user = await profile();
  return {
    userId: user.model?.id,
    stat: user.stat || {},
    source: "GetProfile.stat",
  };
}

async function getPunishments() {
  return toObject(await unary("/model.TreeHole/GetPunishments", empty(), pb.PunishmentsResponse));
}

async function updateSetting(updates) {
  const user = await profile();
  const current = user.setting || {};
  const req = new pb.Setting();
  req.setModel(modelWithId(current.model?.id));
  req.setUserId(Number(current.userId || user.model?.id));
  req.setFilteredWords(updates.filteredWords ?? current.filteredWords ?? "[]");
  req.setFilteredTagIds(updates.filteredTagIds ?? current.filteredTagIds ?? "[]");
  req.setFilteredCategoryIds(updates.filteredCategoryIds ?? current.filteredCategoryIds ?? "[]");
  req.setInactiveRead(boolValue(updates.inactiveRead ?? current.inactiveRead?.value ?? false));
  req.setHideBadPosts(boolValue(updates.hideBadPosts ?? current.hideBadPosts?.value ?? false));
  req.setHideBadThreads(boolValue(updates.hideBadThreads ?? current.hideBadThreads?.value ?? false));
  req.setEnablePushNotifications(boolValue(updates.enablePushNotifications ?? current.enablePushNotifications?.value ?? false));
  req.setEnableUtilities(boolValue(updates.enableUtilities ?? current.enableUtilities?.value ?? false));
  return toObject(await unary("/model.TreeHole/UpdateSetting", req, pb.Setting));
}

module.exports = {
  appreciatePost,
  appreciateThread,
  checkIn,
  createIdentity,
  createThread,
  deletePost,
  deleteThread,
  disableIdentity,
  favoriteThread,
  getActiveIdentity,
  getCreateIdentityQuota,
  getDownloadUrl,
  getIdentity,
  getLoginUrl,
  getPost,
  getPunishments,
  getSiteConfig,
  getSubscribe,
  getThread,
  getThreadPosts,
  getThreadUserIdentities,
  getUploadUrl,
  getUserStats,
  hotThreads,
  latestThreads,
  listBrowsableTags,
  listCategories,
  listIdentities,
  listNotifications,
  listTags,
  loginWithCallbackUrl,
  loginWithCode,
  markAllNotificationsRead,
  markNotificationRead,
  profile,
  putReport,
  putSubscribe,
  ratePost,
  rateThread,
  replyThread,
  searchThreads,
  setActiveIdentity,
  unreadNotificationCount,
  updateSetting,
  userFavoriteThreads,
  userParticipatedThreads,
  userPosts,
  userThreads,
};
