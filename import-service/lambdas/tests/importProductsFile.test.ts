import { expect, it, jest } from "@jest/globals";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { mockClient } from "aws-sdk-client-mock";
import { createReadStream } from "fs";

import { handler } from "../importProductsFile";
import { S3EventRecord } from "aws-lambda";

const s3Mock = mockClient(S3Client);

it("should return upload url", async () => {
  const event = {
    queryStringParameters: {
      name: "test",
    },
  };
  // @ts-expect-error Event is mocked
  const result = await handler(event, {}, () => {});
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body).uploadUrl).toContain(
    "upload_bucket/uploaded/test"
  );
});

it("should throw 400 error if no name", async () => {
  const event = {
    queryStringParameters: {},
  };
  // @ts-expect-error Event is mocked
  const result = await handler(event, {}, () => {});
  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body).message).toContain("Missing name");
});
