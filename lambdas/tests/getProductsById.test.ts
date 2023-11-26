import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { handler } from "../getProductsById";
import { products } from "./mockData";
import { ddb } from "../dynamoDBClient";
import {
  PRODUCT_PRIMARY_KEY,
  PRODUCT_TABLE_NAME,
  STOCK_PRIMARY_KEY,
  STOCK_TABLE_NAME,
} from "../constants";
// create unit-tests for aws lambda hander that accepts product id
// and returns product object

describe("getProductsById", () => {
  beforeAll(async () => {
    await ddb
      .put({
        TableName: PRODUCT_TABLE_NAME,
        Item: products[0],
      })
      .promise();
    await ddb
      .put({
        TableName: STOCK_TABLE_NAME,
        Item: {
          product_id: products[0].id,
          count: products[0].count,
        },
      })
      .promise();
  });
  afterAll(async () => {
    await ddb
      .delete({
        TableName: PRODUCT_TABLE_NAME,
        Key: {
          [PRODUCT_PRIMARY_KEY]: products[0].id,
        },
      })
      .promise();
    await ddb
      .delete({
        TableName: STOCK_TABLE_NAME,
        Key: {
          [STOCK_PRIMARY_KEY]: products[0].id,
        },
      })
      .promise();
  });
  test("should return product object", async () => {
    const event = {
      pathParameters: {
        id: products[0].id,
      },
    };
    // @ts-expect-error Event is mocked
    const result = await handler(event, {}, () => {});
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(products[0]);
  });

  test("should return 404 ", async () => {
    const event = {
      pathParameters: {
        id: "unknownId",
      },
    };
    // @ts-expect-error Event is mocked
    const result = await handler(event, {}, () => {});
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      message: "Product is not found",
    });
  });
});
