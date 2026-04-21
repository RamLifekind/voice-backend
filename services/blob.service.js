/**
 * Blob Service — downloads patient documents from Azure Blob Storage
 * Uses Managed Identity (DefaultAzureCredential) on Azure,
 * falls back to connection string locally.
 */

const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const BLOB_ACCOUNT_URL = process.env.BLOB_ACCOUNT_URL;

let _client = null;

function getClient() {
  if (_client) return _client;
  if (!BLOB_ACCOUNT_URL) {
    console.warn("[Blob] BLOB_ACCOUNT_URL not set — document features disabled");
    return null;
  }
  _client = new BlobServiceClient(BLOB_ACCOUNT_URL, new DefaultAzureCredential());
  console.log("[Blob] Connected:", BLOB_ACCOUNT_URL);
  return _client;
}

function cleanBlobUrl(url) {
  if (!url) return null;
  let u = String(url).trim();
  while (u.endsWith("%22") || u.endsWith("%27")) u = u.slice(0, -3);
  return u.replace(/^["']+|["']+$/g, "");
}

async function downloadBlob(blobUrl) {
  const client = getClient();
  if (!client) return null;

  const cleaned = cleanBlobUrl(blobUrl);
  if (!cleaned) return null;

  try {
    const parsed = new URL(cleaned);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const containerName = parts[0];
    const blobPath = parts.slice(1).join("/");

    const blobClient = client.getContainerClient(containerName).getBlobClient(blobPath);
    const response = await blobClient.download(0);

    const chunks = [];
    for await (const chunk of response.readableStreamBody) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const contentType = response.contentType || "application/octet-stream";

    console.log(`[Blob] Downloaded: ${blobPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return { buffer, contentType };
  } catch (err) {
    console.error(`[Blob] Download failed for ${cleaned}:`, err.message);
    return null;
  }
}

module.exports = { downloadBlob, cleanBlobUrl };
