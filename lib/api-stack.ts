import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { SwaggerUi } from "@pepperize/cdk-apigateway-swagger-ui";
import { Construct } from "constructs";
import { join } from "path";

import { productModelJsonSchema } from "./jsonSchemas";

export class ApiLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          "aws-sdk", // Use the 'aws-sdk' available in the Lambda runtime
        ],
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

    // Integrate the Lambda functions with the API Gateway resource
    const getProductsListIntegration = new apigw.LambdaIntegration(
      getProductsList
    );
    const getProductsByIdIntegration = new apigw.LambdaIntegration(
      getProductsById
    );

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

    const products = api.root.addResource("products");
    products.addMethod("GET", getProductsListIntegration, {
      methodResponses: [
        {
          statusCode: "200",
          responseModels: { "application/json": productListModel },
        },
        {
          statusCode: "404",
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
      ],
    });

    new SwaggerUi(this, "SwaggerUI", { resource: api.root });
  }
}
