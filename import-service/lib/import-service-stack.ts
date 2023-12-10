import * as cdk from "aws-cdk-lib";
import {
  Cors,
  JsonSchemaType,
  JsonSchemaVersion,
  LambdaIntegration,
  Model,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { S3EventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";

import { Construct } from "constructs";
import { join } from "path";
const UPLOAD_FOLDER = "uploaded";
const PARSED_FOLDER = "parsed";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3Bucket = new s3.Bucket(this, "CsvBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: Cors.ALL_ORIGINS,
          allowedHeaders: Cors.DEFAULT_HEADERS,
        },
      ],
      //! Change the following in production.
      // This deletes the bucket when the stack is deleted (for easy cleanup).
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/client-s3"],
      },
      depsLockFilePath: join(__dirname, "..", "lambdas", "package-lock.json"),
      runtime: Runtime.NODEJS_18_X,
    };

    // Import Products File Stack

    const importProductsFile = new NodejsFunction(this, "importProductsFile", {
      entry: join(__dirname, "..", "lambdas", "importProductsFile.ts"),
      ...nodeJsFunctionProps,
      environment: {
        REGION: "us-east-1",
        UPLOAD_BUCKET: s3Bucket.bucketName,
        UPLOAD_FOLDER,
        EXPIRATION_SECONDS: "30",
      },
    });

    s3Bucket.grantPut(importProductsFile);

    const importProductsFileIntegration = new LambdaIntegration(
      importProductsFile
    );
    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, "productsAPI", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
      },
      deployOptions: {
        stageName: "dev",
      },
      // In case you want to manage binary types, uncomment the following
      // binaryMediaTypes: ["*/*"],
    });

    const PreSignedURLResponse = new Model(this, "PreSignedURLResponse", {
      restApi: api,
      schema: {
        schema: JsonSchemaVersion.DRAFT4,
        type: JsonSchemaType.STRING,
      },
      description: "Returns Pre-Signed URL to upload CSV",
      contentType: "application/json",
    });

    const importProductsResource = api.root.addResource("import");
    importProductsResource.addMethod("GET", importProductsFileIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseModels: { "application/json": PreSignedURLResponse },
        },
        {
          statusCode: "500",
          responseModels: { "application/json": Model.ERROR_MODEL },
        },
      ],
      requestParameters: {
        "method.request.querystring.name": true,
      },
      requestValidatorOptions: {
        validateRequestParameters: true,
      },
    });

    // Import File Parser Stack

    // catalogItemsQueue
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "catalogItemsQueue",
      "arn:aws:sqs:us-east-1:941474354651:catalogItemsQueue"
    );


    const importFileParser = new NodejsFunction(this, "importFileParser", {
      entry: join(__dirname, "..", "lambdas", "importFileParser.ts"),
      ...nodeJsFunctionProps,
      environment: {
        REGION: "us-east-1",
        UPLOAD_BUCKET: s3Bucket.bucketName,
        UPLOAD_FOLDER,
        PARSED_FOLDER,
        SQS_URL: catalogItemsQueue.queueUrl,
      },
    });

    importFileParser.addEventSource(
      new S3EventSource(s3Bucket, {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [{ prefix: `${UPLOAD_FOLDER}/`, suffix: ".csv" }],
      })
    );

    s3Bucket.grantReadWrite(importFileParser);

    catalogItemsQueue.grantSendMessages(importFileParser);
  }
}
