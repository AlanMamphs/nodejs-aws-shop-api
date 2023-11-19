import * as cdk from "aws-cdk-lib";
import {
  IResource,
  LambdaIntegration,
  MockIntegration,
  PassthroughBehavior,
  RestApi,
  Cors
} from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { SwaggerUi } from "@pepperize/cdk-apigateway-swagger-ui";
import { Construct } from "constructs";
import { join } from "path";

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
    const getProductsListIntegration = new LambdaIntegration(getProductsList);
    const getProductsByIdIntegration = new LambdaIntegration(getProductsById);

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


    const products = api.root.addResource("products");
    products.addMethod("GET", getProductsListIntegration);

    const singleProduct = products.addResource("{id}");
    singleProduct.addMethod("GET", getProductsByIdIntegration);

    new SwaggerUi(this, "SwaggerUI", { resource: api.root });
  }
}
