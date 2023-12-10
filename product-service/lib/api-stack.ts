import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import {
  SqsEventSource,
  SnsEventSource,
} from "aws-cdk-lib/aws-lambda-event-sources";

import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { SwaggerUi } from "@pepperize/cdk-apigateway-swagger-ui";
import { Construct } from "constructs";
import { join } from "path";

import {
  productModelJsonSchema,
  createProductModelSchema,
} from "./jsonSchemas";
import {
  PRODUCT_PRIMARY_KEY,
  PRODUCT_TABLE_NAME,
  STOCK_PRIMARY_KEY,
  STOCK_TABLE_NAME,
} from "../lambdas/constants";
import { SqsDestination } from "aws-cdk-lib/aws-lambda-destinations";

export class ApiLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const ProductsTable = new dynamo.TableV2(this, "Products", {
      partitionKey: {
        name: PRODUCT_PRIMARY_KEY,
        type: dynamo.AttributeType.STRING,
      },
      tableName: PRODUCT_TABLE_NAME,

      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      billing: dynamo.Billing.onDemand(),
    });

    const StockTable = new dynamo.TableV2(this, "Stock", {
      partitionKey: {
        name: STOCK_PRIMARY_KEY,
        type: dynamo.AttributeType.STRING,
      },
      tableName: STOCK_TABLE_NAME,

      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      billing: dynamo.Billing.onDemand(),
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["@aws-sdk/client-dynamodb", "@aws-sdk/lib-dynamodb"],
      },
      environment: {
        PRODUCT_TABLE_NAME,
        PRODUCT_PRIMARY_KEY,
        STOCK_TABLE_NAME,
        STOCK_PRIMARY_KEY,
      },
      depsLockFilePath: join(__dirname, "..", "lambdas", "package-lock.json"),
      runtime: Runtime.NODEJS_18_X,
    };

    const getProductsList = new NodejsFunction(this, "getProductsList", {
      entry: join(__dirname, "..", "lambdas", "getProductsList.ts"),
      ...nodeJsFunctionProps,
    });
    const getProductsById = new NodejsFunction(this, "getProductsById", {
      entry: join(__dirname, "..", "lambdas", "getProductsById.ts"),
      ...nodeJsFunctionProps,
    });
    const createProduct = new NodejsFunction(this, "createProduct", {
      entry: join(__dirname, "..", "lambdas", "createProduct.ts"),
      ...nodeJsFunctionProps,
    });

    // Grant the Lambda function read access to the DynamoDB table
    ProductsTable.grantReadData(getProductsList);
    StockTable.grantReadData(getProductsList);

    ProductsTable.grantReadData(getProductsById);
    StockTable.grantReadData(getProductsById);

    ProductsTable.grantReadWriteData(createProduct);
    StockTable.grantReadWriteData(createProduct);

    // Integrate the Lambda functions with the API Gateway resource
    const getProductsListIntegration = new apigw.LambdaIntegration(
      getProductsList
    );
    const getProductsByIdIntegration = new apigw.LambdaIntegration(
      getProductsById
    );
    const createProductIntegration = new apigw.LambdaIntegration(createProduct);
    // Create an API Gateway resource for each of the CRUD operations
    const api = new apigw.RestApi(this, "productsAPI", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
      deployOptions: {
        stageName: "dev",
      },
      // In case you want to manage binary types, uncomment the following
      // binaryMediaTypes: ["*/*"],
    });

    const productModel = new apigw.Model(this, "ProductModel", {
      restApi: api,
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        ...productModelJsonSchema,
      },
      contentType: "application/json",
    });

    const productListModel = new apigw.Model(this, "ProductListModel", {
      restApi: api,
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        title: "ProductList",
        type: apigw.JsonSchemaType.ARRAY,
        items: {
          ...productModelJsonSchema,
        },
      },
      contentType: "application/json",
    });

    const createProductRequest = new apigw.Model(this, "createProductRequest", {
      restApi: api,
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        ...createProductModelSchema,
      },
      contentType: "application/json",
    });

    const products = api.root.addResource("products");
    products.addMethod("GET", getProductsListIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseModels: { "application/json": productListModel },
        },
        {
          statusCode: "500",
          responseModels: { "application/json": apigw.Model.ERROR_MODEL },
        },
      ],
    });

    products.addMethod("POST", createProductIntegration, {
      requestModels: { "application/json": createProductRequest },
      requestValidatorOptions: {
        validateRequestBody: true,
      },
      methodResponses: [
        {
          statusCode: "201",
          responseModels: { "application/json": apigw.Model.EMPTY_MODEL },
        },
        {
          statusCode: "400",
          responseModels: { "application/json": apigw.Model.ERROR_MODEL },
        },
        {
          statusCode: "500",
          responseModels: { "application/json": apigw.Model.ERROR_MODEL },
        },
      ],
    });

    const singleProduct = products.addResource("{id}");
    singleProduct.addMethod("GET", getProductsByIdIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseModels: { "application/json": productModel },
        },
        {
          statusCode: "404",
          responseModels: { "application/json": apigw.Model.ERROR_MODEL },
        },
        {
          statusCode: "400",
          responseModels: { "application/json": apigw.Model.ERROR_MODEL },
        },
      ],
    });

    new SwaggerUi(this, "SwaggerUI", { resource: api.root });

    // CATALOG BATCH PROCESS. SQS + Lambda + SNS
    // A dead-letter queue is optional but it helps capture any failed messages.
    const deadLetterQueue = new sqs.Queue(this, "catalogItemsDeadLetterQueue", {
      queueName: "catalogItemsDeadLetterQueue",
      retentionPeriod: cdk.Duration.days(7),
    });
    const catalogItemsQueue = new sqs.Queue(this, "catalogItemsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: deadLetterQueue,
      },
    });

    // Create an SNS topic
    const productTopic = new sns.Topic(this, "createProductTopic", {
      displayName: "Create Product topic",
    });

    const email1Subscription = new subscriptions.EmailSubscription(
      "mamunovalisher@gmail.com",
      {
        filterPolicy: {
          totalCount: sns.SubscriptionFilter.numericFilter({ greaterThan: 20 }),
        },
        json: true,
      }
    );
    const email2Subscription = new subscriptions.EmailSubscription(
      "alisher.mamunov@icloud.com",
      {
        filterPolicy: {
          totalCount: sns.SubscriptionFilter.numericFilter({
            lessThanOrEqualTo: 20,
          }),
        },
        json: true,
      }
    );
    productTopic.addSubscription(email1Subscription);
    productTopic.addSubscription(email2Subscription);

    const catalogBatchProcess = new NodejsFunction(
      this,
      "catalogBatchProcess",
      {
        entry: join(__dirname, "..", "lambdas", "catalogBatchProcess.ts"),
        ...nodeJsFunctionProps,
        // sqs queue for unsuccessful invocations
        onFailure: new SqsDestination(deadLetterQueue),
        environment: {
          ...nodeJsFunctionProps.environment,
          EMAIL_TOPIC_ARN: productTopic.topicArn,
        },
      }
    );

    catalogBatchProcess.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );
    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);
    deadLetterQueue.grantSendMessages(catalogBatchProcess);

    ProductsTable.grantReadWriteData(catalogBatchProcess);
    StockTable.grantReadWriteData(catalogBatchProcess);

    // Grant the Lambda function permission to publish to the SNS topic
    productTopic.grantPublish(catalogBatchProcess);

    catalogBatchProcess.addEventSource(new SnsEventSource(productTopic));
  }
}
