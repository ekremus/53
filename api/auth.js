import { createEditAuthHandler } from "./lib/edit-auth.js";

const handle = createEditAuthHandler();

async function requestBody(request) {
  if (typeof request.body === "string") return request.body;
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return JSON.stringify(request.body);
  }
  let body = "";
  for await (const chunk of request) body += chunk;
  return body;
}

export default async function authEndpoint(request, response) {
  const result = await handle({
    method: request.method,
    headers: request.headers,
    body: await requestBody(request),
  });
  response.statusCode = result.status;
  for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
  response.end(JSON.stringify(result.body));
}
