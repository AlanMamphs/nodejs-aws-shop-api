import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const isTest = process.env.JEST_WORKER_ID;

export const ddb = DynamoDBDocument.from(
  new DynamoDB({
    ...(isTest && {
      endpoint: "http://localhost:8000",
      sslEnabled: false,
      region: "local-env",
      credentials: {
        accessKeyId: "fakeMyKeyId",
        secretAccessKey: "fakeSecretAccessKey",
      },
    }),
  }),
  {
    marshallOptions: {
      convertEmptyValues: true,
    },
  }
);
