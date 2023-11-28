// index.js
import { Handler, S3Event } from "aws-lambda";
import csvParser from "csv-parser";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { withLogger } from "./utils";

const REGION = process.env.REGION || "us-east-1";
const client = new S3Client({ region: REGION });

export const handler: Handler<S3Event> = withLogger(async (event, context) => {
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

  // Parse CSV and log each record
  (response.Body as Readable)
    .pipe(csvParser())
    ?.on("data", (record: object) => {
      console.log("Record:", record);
    })
    .on("end", () => {
      console.log("CSV parsing complete");
    })
    .on("error", (error: Error) => {
      console.error("Error parsing CSV:", error);
    });
});
