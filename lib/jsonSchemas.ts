import * as apigw from "aws-cdk-lib/aws-apigateway";

export const productModelJsonSchema = {
  title: "Product",
  type: apigw.JsonSchemaType.OBJECT,
  properties: {
    id: {
      type: apigw.JsonSchemaType.STRING,
      description: "The unique identifier of the product",
    },
    title: {
      type: apigw.JsonSchemaType.STRING,
      description: "The title of the product",
    },
    description: {
      type: apigw.JsonSchemaType.STRING,
      description: "A detailed description of the product",
    },
    price: {
      type: apigw.JsonSchemaType.NUMBER,
      description: "The price of the product",
    },
  },
  required: ["id", "title", "description", "price"],
};
