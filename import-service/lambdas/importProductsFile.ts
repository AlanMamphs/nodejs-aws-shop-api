import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayEvent, Handler } from "aws-lambda";
import { lambdaResp, withLogger } from "./utils";

const REGION = process.env.REGION || "us-east-1";
const BUCKET = process.env.UPLOAD_BUCKET || "upload_bucket";
const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER || "uploaded";
const EXPIRATION_SECONDS = process.env.EXPIRATION_SECONDS || "30";

const client = new S3Client({ region: REGION });

const createPresignedUrl = ({ key }: Record<string, string>) => {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client, command, {
    expiresIn: Number(EXPIRATION_SECONDS),
  });
};

export const handler: Handler<APIGatewayEvent> = withLogger(async (event) => {
  try {
    const name = event.queryStringParameters?.name;
    if (!name) {
      return lambdaResp({
        statusCode: 400,
        body: {
          message: "Missing name",
        },
      });
    }
    const uploadUrl = await createPresignedUrl({
      region: REGION,
      bucket: BUCKET,
      key: `${UPLOAD_FOLDER}/${name}`,
    });

    return lambdaResp({
      statusCode: 200,
      body: {
        uploadUrl,
      },
    });
  } catch (err) {
    console.error(err);
    return lambdaResp({
      statusCode: 500,
      body: {
        message: err,
      },
    });
  }
});
