import { expect, it, jest } from "@jest/globals";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SQSClient, GetQueueAttributesCommand } from "@aws-sdk/client-sqs";

import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { mockClient } from "aws-sdk-client-mock";
import { createReadStream } from "fs";

import { handler } from "../importFileParser";
import { S3EventRecord } from "aws-lambda";

const s3Mock = mockClient(S3Client);
const sqsMock = mockClient(SQSClient);

const testEvent: { Records: Partial<S3EventRecord>[] } = {
  Records: [
    {
      s3: {
        bucket: {
          name: "test",
          arn: "test",
          ownerIdentity: {
            principalId: "test",
          },
        },
        object: {
          key: "test.csv",
          size: 1,
          eTag: "test",
          sequencer: "test",
        },
        s3SchemaVersion: "",
        configurationId: "",
      },
    },
  ],
};

it("ImportFileParser can parse the file", async () => {
  // create Stream from file
  const stream = createReadStream("tests/test.csv");

  // wrap the Stream with SDK mixin
  const sdkStream = sdkStreamMixin(stream);

  s3Mock.on(GetObjectCommand).resolves({ Body: sdkStream });
  expect(sqsMock.send.callCount).toBe(0);

  // @ts-expect-error Event is mocked
  const result = await handler(testEvent, {}, () => ({}));

  expect(sqsMock.send.callCount).toBe(1);
});

it("ImportFileParser handles error", async () => {
  // create Stream from file
  const stream = createReadStream("tests/test.csv");

  stream.pipe = jest.fn(() => {
    // Simulate an error during the pipe operation
    throw new Error("Simulated error during pipe");
  });
  // wrap the Stream with SDK mixin
  const sdkStream = sdkStreamMixin(stream);

  s3Mock.on(GetObjectCommand).resolves({ Body: sdkStream });

  // @ts-expect-error Event is mocked
  await expect(handler(testEvent, {}, () => ({}))).rejects.toThrow(
    "Simulated error during pipe"
  );
});
