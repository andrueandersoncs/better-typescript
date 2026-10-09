import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export type ObjectAcl = "private" | "public-read"

export interface PresignRequest {
  readonly bucket: string
  readonly key: string
  readonly contentType: string
  readonly expiresInSeconds?: number
  readonly acl?: ObjectAcl
}

const client = new S3Client({})

const normalizeKey = (key: string): string => key.replace(/^\/+/, "")

export const presignUpload = async (request: PresignRequest): Promise<string> => {
  const {
    bucket,
    key,
    contentType,
    expiresInSeconds = 300,
    acl = "public-read",
  } = request
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: normalizeKey(key),
    ContentType: contentType,
    ACL: acl,
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export const presignAvatarUpload = (userId: string, contentType: string) =>
  presignUpload({
    bucket: "user-media",
    key: `avatars/${userId}`,
    contentType,
    acl: "public-read",
  })
