const { getHost, getToken } = require("./session");

function encodeFrame(messageBytes) {
  const payload = Buffer.from(messageBytes);
  const frame = Buffer.allocUnsafe(payload.length + 5);
  frame[0] = 0;
  frame.writeUInt32BE(payload.length, 1);
  payload.copy(frame, 5);
  return frame;
}

function decodeFrames(bytes) {
  const buffer = Buffer.from(bytes);
  const data = [];
  const trailers = {};
  let offset = 0;

  while (offset + 5 <= buffer.length) {
    const flags = buffer[offset];
    const length = buffer.readUInt32BE(offset + 1);
    offset += 5;
    if (offset + length > buffer.length) break;

    const payload = buffer.subarray(offset, offset + length);
    offset += length;

    if ((flags & 0x80) === 0x80) {
      const text = payload.toString("utf8");
      for (const line of text.split(/\r?\n/)) {
        const idx = line.indexOf(":");
        if (idx > 0) trailers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
      }
    } else {
      data.push(payload);
    }
  }

  return { data: Buffer.concat(data), trailers };
}

function metadata(authRequired) {
  const headers = {
    "content-type": "application/grpc-web+proto",
    "x-grpc-web": "1",
    "x-user-agent": "grpc-web-javascript/0.1",
  };
  const token = getToken();
  if (token) headers.authorization = token;
  if (authRequired && !token) {
    throw new Error("Not logged in. Use treehole_get_login_url + treehole_login_with_oauth_code, or treehole_save_session_token first.");
  }
  return headers;
}

async function unaryOnce(method, request, ResponseCtor, options = {}) {
  const host = (options.host || getHost()).replace(/\/$/, "");
  const response = await fetch(`${host}${method}`, {
    method: "POST",
    headers: metadata(options.authRequired !== false),
    body: encodeFrame(request.serializeBinary()),
  });

  const raw = Buffer.from(await response.arrayBuffer());
  const { data, trailers } = decodeFrames(raw);
  const grpcStatus = response.headers.get("grpc-status") || trailers["grpc-status"] || "0";
  const grpcMessage = response.headers.get("grpc-message") || trailers["grpc-message"] || "";

  if (!response.ok || grpcStatus !== "0") {
    const message = decodeURIComponent(grpcMessage || response.statusText || `gRPC status ${grpcStatus}`);
    throw new Error(`RPC ${method} failed: ${message}`);
  }

  return ResponseCtor.deserializeBinary(data);
}

async function unary(method, request, ResponseCtor, options = {}) {
  const attempts = options.attempts || 3;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await unaryOnce(method, request, ResponseCtor, options);
    } catch (error) {
      lastError = error;
      const isNetworkError = error && (error.name === "TypeError" || error.cause);
      if (!isNetworkError || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

module.exports = { unary };
