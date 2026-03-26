import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "./env";

let cachedClient: S3Client | null = null;

export function getStorageClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();

  cachedClient = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY
    },
    forcePathStyle: true
  });

  return cachedClient;
}

export async function uploadObject(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}) {
  const env = getEnv();
  const client = getStorageClient();

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType
    })
  );
}

export async function getDownloadUrl(key: string, expiresInSeconds = 900) {
  const env = getEnv();
  const client = getStorageClient();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key
    }),
    { expiresIn: expiresInSeconds }
  );
}

export function getPublicObjectUrl(key: string) {
  const env = getEnv();
  return `${env.S3_PUBLIC_BASE_URL}/${key}`;
}

export async function getObject(key: string): Promise<GetObjectCommandOutput> {
  const env = getEnv();
  const client = getStorageClient();

  return client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key
    })
  );
}

export async function deleteObject(key: string) {
  const env = getEnv();
  const client = getStorageClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key
    })
  );
}
