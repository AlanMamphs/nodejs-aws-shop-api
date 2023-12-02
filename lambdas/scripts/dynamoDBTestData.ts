import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import * as uuid from "uuid";
import {
  PRODUCT_TABLE_NAME,
  STOCK_TABLE_NAME,
} from "../constants";

const dynamoDB = DynamoDBDocument.from(new DynamoDB());

// Define dummy data
const productsData = [
  {
    id: uuid.v4(),
    title: "Product 1",
    description: "Description 1",
    price: 10,
  },
  {
    id: uuid.v4(),
    title: "Product 2",
    description: "Description 2",
    price: 20,
  },
  {
    id: uuid.v4(),
    title: "Product 3",
    description: "Description 3",
    price: 30,
  },
];

const stocksData = [
  { product_id: productsData[0].id, count: 100 },
  { product_id: productsData[1].id, count: 50 },
  { product_id: productsData[2].id, count: 75 },
];

// Function to fill dummy data
const fillDummyData = async () => {
  for (const product of productsData) {
    await dynamoDB
      .put({
        TableName: PRODUCT_TABLE_NAME,
        Item: product,
      });
  }

  for (const stock of stocksData) {
    await dynamoDB
      .put({
        TableName: STOCK_TABLE_NAME,
        Item: stock,
      });
  }

  console.log("Dummy data filled successfully.");
};

// Execute the script
fillDummyData();
