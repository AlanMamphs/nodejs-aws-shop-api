// index.js
import { Handler, S3Event } from "aws-lambda";
import csvParser from "csv-parser";
import {
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { lambdaResp, withLogger } from "./utils";

const REGION = process.env.REGION || "us-east-1";
const UPLOAD_FOLDER = process.env.UPLOAD_FOLDER || "uploaded";
const PARSED_FOLDER = process.env.PARSED_FOLDER || "parsed";

const client = new S3Client({ region: REGION });

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
    await client.send(new CopyObjectCommand(copyParams));
    console.log(`Object copied from ${sourceKey} to ${destinationKey}`);

    const deleteParams = {
      Bucket: bucketName,
      Key: sourceKey,
    };

    await client.send(new DeleteObjectCommand(deleteParams));
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
  const response = await client.send(
    new GetObjectCommand({
      Bucket,
      Key,
    })
  );

  return new Promise<void>(
    (
      resolve,
      reject // Parse CSV and log each record
    ) =>
      (response.Body as Readable)
        .pipe(csvParser())
        ?.on("data", (record: object) => {
          console.log("Record:", record);
        })
        .on("end", async () => {
          console.log("CSV parsing complete. Moving file to parsed directory.");
          await moveFile(
            Bucket,
            Key,
            Key.replace(UPLOAD_FOLDER, PARSED_FOLDER)
          );
          resolve();
        })
        .on("error", (error: Error) => {
          console.error("Error parsing CSV:", error);
          reject(error);
        })
  );
});
