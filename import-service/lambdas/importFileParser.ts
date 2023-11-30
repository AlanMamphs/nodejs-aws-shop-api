// index.js
import { Handler, S3Event } from "aws-lambda";
import csvParser from "csv-parser";
import {
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { Readable } from "stream";
import { lambdaResp, withLogger } from "./utils";

const REGION = process.env.REGION || "us-east-1";
const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER || "uploaded";
const PARSED_FOLDER = process.env.PARSED_FOLDER || "parsed";

const s3Client = new S3Client({ region: REGION });

const sqsClient = new SQSClient({ region: REGION });

async function moveFile(
  bucketName: string,
  sourceKey: string,
  destinationKey: string
) {
  // Step 1: Copy the object to the new location
  const copyParams = {
    Bucket: bucketName,
    CopySource: `/${bucketName}/${sourceKey}`, // Source path
    Key: destinationKey, // Destination path
  };

  try {
    await s3Client.send(new CopyObjectCommand(copyParams));
    console.log(`Object copied from ${sourceKey} to ${destinationKey}`);

    const deleteParams = {
      Bucket: bucketName,
      Key: sourceKey,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`Object deleted from ${sourceKey}`);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export const handler: Handler<S3Event> = withLogger(async (event) => {
  // Get the bucket and object key from the S3 event
  const Bucket = event.Records[0].s3.bucket.name;
  const Key = event.Records[0].s3.object.key;

  // Create a readable stream from the S3 object
  console.log(`Bucket: ${Bucket}, Key: ${Key}`);
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket,
      Key,
    })
  );

  const batchSQSItems: object[] = [];

  await new Promise<void>((resolve, reject) =>
    (response.Body as Readable)
      .pipe(csvParser())
      ?.on(
        "data",
        async ({ price, count, ...rest }: Record<string, string | number>) => {
          batchSQSItems.push({
            price: Number(price),
            count: Number(count),
            ...rest,
          });
        }
      )
      .on("end", async () => {
        console.log("CSV parsing complete. Moving file to parsed directory.");
        await moveFile(Bucket, Key, Key.replace(UPLOAD_FOLDER, PARSED_FOLDER));
        resolve();
      })
      .on("error", (error: Error) => {
        console.error("Error parsing CSV:", error);
        reject(error);
      })
  );

  try {
    await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: process.env.SQS_URL,
        Entries: batchSQSItems.map((item, index) => ({
          Id: `${index}`,
          MessageBody: JSON.stringify(item),
        })),
      })
    );
    return lambdaResp({ statusCode: 201, body: {} });
  } catch (error) {
    console.error("Error sending SQS message:", error);
    return lambdaResp({ statusCode: 500, body: { message: error } });
  }
});
