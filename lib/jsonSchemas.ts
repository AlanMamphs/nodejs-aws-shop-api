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
    count: {
      type: apigw.JsonSchemaType.NUMBER,
      description: "Stock Count",
    },
  },
  required: ["id", "title", "description", "price"],
};

export const createProductModelSchema = {
  title: "CreateProduct",
  type: apigw.JsonSchemaType.OBJECT,
  properties: {
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
    count: {
      type: apigw.JsonSchemaType.NUMBER,
      description: "Stock Count",
    },
  },
  required: ["title", "description", "price", "count"],
};
